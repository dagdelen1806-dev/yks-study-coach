import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import type { User } from "../drizzle/schema";
import { canAssignRole, canInviteRole, creditDecision, creditPeriodStart, generateInviteCode, invitationProblem, membershipState, normalizeInviteCode, summarizeStudent } from "../shared/org";
import { DEFAULT_KVKK_NOTICE, renderKvkk } from "../shared/kvkk";

// --- Bellek içi kurum veri katmanı (gerçek yetki katmanı ve router bunun üstünde çalışır) ---
type Member = { orgId: number; userId: number; role: "owner" | "admin" | "coordinator" | "teacher" | "student"; status: "active" | "left" | "removed" };
const store = {
  orgs: [] as Array<{ id: number; name: string; status: "active" | "suspended"; kvkkVersion?: number; membershipStartsAt?: Date | null; membershipEndsAt?: Date | null; address?: string | null; contactEmail?: string | null; phone?: string | null; kvkkNotice?: string | null; kvkkConsent?: string | null; plan?: "trial" | "standard" | "pro"; aiCreditsMonthly?: number }>,
  members: [] as Member[],
  assignments: [] as Array<{ orgId: number; teacherUserId: number; studentUserId: number; active: number }>,
  invitations: [] as Array<{ id: number; orgId: number; orgName: string; orgStatus: "active" | "suspended"; role: "admin" | "coordinator" | "teacher" | "student"; codeHash: string; expiresAt: Date; maxUses: number; usedCount: number; revokedAt: Date | null; createdBy: number; note: string | null; createdAt: Date }>,
  notes: [] as Array<{ id: number; orgId: number; studentUserId: number; authorUserId: number; body: string; visibility: "staff" | "student" }>,
  audit: [] as Array<{ orgId: number; actorUserId: number; action: string }>,
  tasks: [] as Array<{ orgId: number; studentUserId: number; teacherUserId: number }>,
  upgrades: [] as Array<{ id: number; orgId: number; requestedBy: number; currentPlan: "trial" | "standard" | "pro"; requestedPlan: "trial" | "standard" | "pro"; note: string | null; status: "pending" | "approved" | "rejected" | "canceled" }>,
};
const reads: string[] = [];
// Görev çakışması: öğrencinin kurum ders programı ve o günkü planlı oturumları (test başına ayarlanır).
let courseBlocks: Array<{ source: "course"; dayOfWeek: number; startTime: string; endTime: string; subject: string | null; label: string; orgName: string; teacherName: string | null; room: string | null }> = [];
let plannedSessions: Array<{ sessionDate: Date; plannedMinutes: number; status: "planned"; title: string }> = [];
const active = (orgId: number, userId: number) => store.members.find((m) => m.orgId === orgId && m.userId === userId && m.status === "active" && store.orgs.find((o) => o.id === orgId)?.status === "active");

vi.mock("./org/orgDb", async (importOriginal) => {
  const original = await importOriginal<typeof import("./org/orgDb")>();
  return {
    ...original,
    getActiveMembership: vi.fn(async (userId: number, orgId: number) => { const m = active(orgId, userId); const org = store.orgs.find((o) => o.id === orgId)!; return m ? { orgId, orgName: org.name, role: m.role, state: membershipState({ membershipStartsAt: org.membershipStartsAt ?? null, membershipEndsAt: org.membershipEndsAt ?? null }) } : null; }),
    listMyMemberships: vi.fn(async (userId: number) => store.members.filter((m) => m.userId === userId && active(m.orgId, userId)).map((m) => ({ orgId: m.orgId, orgName: store.orgs.find((o) => o.id === m.orgId)!.name, role: m.role }))),
    hasActiveAssignment: vi.fn(async (orgId: number, teacherUserId: number, studentUserId: number) => store.assignments.some((a) => a.orgId === orgId && a.teacherUserId === teacherUserId && a.studentUserId === studentUserId && a.active === 1)),
    isActiveStudent: vi.fn(async (orgId: number, userId: number) => active(orgId, userId)?.role === "student"),
    listMembers: vi.fn(async (orgId: number, options: { role?: string; teacherUserId?: number } = {}) => store.members
      .filter((m) => m.orgId === orgId && m.status === "active" && (!options.role || m.role === options.role) && (!options.teacherUserId || store.assignments.some((a) => a.orgId === orgId && a.teacherUserId === options.teacherUserId && a.studentUserId === m.userId && a.active === 1)))
      .map((m) => ({ userId: m.userId, name: `U${m.userId}`, email: null, role: m.role, joinedAt: new Date(), consentAt: m.role === "student" ? new Date() : null, lastSignedIn: new Date() }))),
    getMemberRole: vi.fn(async (orgId: number, userId: number) => active(orgId, userId)?.role ?? null),
    setMemberRole: vi.fn(async (orgId: number, userId: number, role: Member["role"]) => { active(orgId, userId)!.role = role; }),
    endMembership: vi.fn(async (orgId: number, userId: number, status: "left" | "removed") => { const m = active(orgId, userId); if (m) m.status = status; store.assignments.filter((a) => a.orgId === orgId && (a.studentUserId === userId || a.teacherUserId === userId)).forEach((a) => (a.active = 0)); }),
    createInvitation: vi.fn(async (input: { orgId: number; role: "student"; codeHash: string; note: string | null; expiresAt: Date; maxUses: number; createdBy: number }) => { const id = store.invitations.length + 1; store.invitations.push({ id, ...input, orgName: store.orgs.find((o) => o.id === input.orgId)!.name, orgStatus: "active", usedCount: 0, revokedAt: null, createdAt: new Date() }); return id; }),
    listInvitations: vi.fn(async (orgId: number) => store.invitations.filter((i) => i.orgId === orgId)),
    revokeInvitation: vi.fn(async (orgId: number, id: number) => { const i = store.invitations.find((x) => x.orgId === orgId && x.id === id); if (i) i.revokedAt = new Date(); return Boolean(i); }),
    findInvitationByHash: vi.fn(async (hash: string) => { const i = store.invitations.find((x) => x.codeHash === hash); const org = i && store.orgs.find((o) => o.id === i.orgId); return i ? { ...i, membershipStartsAt: org?.membershipStartsAt ?? null, membershipEndsAt: org?.membershipEndsAt ?? null } : null; }),
    acceptInvitation: vi.fn(async (input: { invitationId: number; orgId: number; userId: number; role: Member["role"] }) => { const existing = store.members.find((m) => m.orgId === input.orgId && m.userId === input.userId); if (existing) { existing.status = "active"; existing.role = input.role; } else store.members.push({ orgId: input.orgId, userId: input.userId, role: input.role, status: "active" }); store.invitations.find((i) => i.id === input.invitationId)!.usedCount++; }),
    listClasses: vi.fn(async () => []),
    createClass: vi.fn(async () => 1),
    updateClass: vi.fn(async () => true),
    getOrganization: vi.fn(async (orgId: number) => { const org = store.orgs.find((o) => o.id === orgId); return org ? { address: null, contactEmail: null, phone: null, kvkkNotice: null, kvkkConsent: null, kvkkVersion: 1, plan: "trial" as const, aiCreditsMonthly: 500, membershipStartsAt: null, membershipEndsAt: null, ...org } : null; }),
    updateOrganization: vi.fn(async () => undefined),
    setMemberSubject: vi.fn(async () => true),
    updateOrgMembership: vi.fn(async () => undefined),
    createUpgradeRequest: vi.fn(async (input: { orgId: number; requestedBy: number; currentPlan: "trial"; requestedPlan: "trial"; note: string | null }) => { const id = store.upgrades.length + 1; store.upgrades.push({ id, ...input, status: "pending" }); return id; }),
    listOrgUpgradeRequests: vi.fn(async (orgId: number) => store.upgrades.filter((u) => u.orgId === orgId)),
    cancelUpgradeRequest: vi.fn(async (orgId: number, id: number) => { const u = store.upgrades.find((x) => x.orgId === orgId && x.id === id && x.status === "pending"); if (u) u.status = "canceled"; return Boolean(u); }),
    getUpgradeRequest: vi.fn(async (id: number) => store.upgrades.find((u) => u.id === id) ?? null),
    resolveUpgradeRequest: vi.fn(async (id: number, status: "approved" | "rejected") => { const u = store.upgrades.find((x) => x.id === id && x.status === "pending"); if (u) u.status = status; return Boolean(u); }),
    listAssignments: vi.fn(async (orgId: number) => store.assignments.filter((a) => a.orgId === orgId && a.active === 1)),
    loadStudentSignals: vi.fn(async (ids: number[]) => { reads.push("signals"); return new Map(ids.map((userId) => [userId, { exams: [], logs: [], weekSessions: [], weakTopicCount: 0, lastSignedIn: new Date() }])); }),
    getStudentCalendarReadOnly: vi.fn(async () => { reads.push("calendar-readonly"); return { sessions: [], logs: [] }; }),
    listNotes: vi.fn(async (orgId: number, studentUserId: number) => store.notes.filter((n) => n.orgId === orgId && n.studentUserId === studentUserId)),
    createNote: vi.fn(async (input: { orgId: number; studentUserId: number; authorUserId: number; body: string; visibility: "staff" | "student" }) => { const id = store.notes.length + 1; store.notes.push({ id, ...input }); return id; }),
    getNote: vi.fn(async (orgId: number, id: number) => store.notes.find((n) => n.orgId === orgId && n.id === id) ?? null),
    deleteNote: vi.fn(async () => undefined),
    listStudentFeedback: vi.fn(async (studentUserId: number) => store.notes.filter((n) => n.studentUserId === studentUserId && n.visibility === "student" && active(n.orgId, studentUserId)).map((n) => ({ id: n.id, body: n.body, orgName: "", authorName: "", createdAt: new Date() }))),
    insertAssignedTask: vi.fn(async (input: { orgId: number; studentUserId: number; teacherUserId: number }) => { store.tasks.push(input); return store.tasks.length; }),
    listPlannedSessionsOn: vi.fn(async () => plannedSessions),
    writeAudit: vi.fn(async (input: { orgId: number; actorUserId: number; action: string }) => { store.audit.push(input); }),
    listAudit: vi.fn(async (orgId: number) => store.audit.filter((a) => a.orgId === orgId)),
  };
});
const getStudyCalendar = vi.fn();
vi.mock("./db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./db")>()),
  getStudyCalendar: (...args: unknown[]) => getStudyCalendar(...args),
  getStudentProfile: vi.fn(async () => ({ gradeLevel: "12", examYear: 2027, targetScoreType: "SAY", targetUniversity: null, targetDepartment: null, dailyStudyDuration: 120, avatarStyle: null })),
  getUserMockExams: vi.fn(async () => []),
  getUserTopicProgress: vi.fn(async () => []),
}));
vi.mock("./schedule/classScheduleDb", async (importOriginal) => ({ ...(await importOriginal<typeof import("./schedule/classScheduleDb")>()), getClassSchedule: vi.fn(async () => ({ periods: [], blocks: [] })), getCourseBlocks: vi.fn(async () => courseBlocks) }));

const { appRouter } = await import("./routers");
const { acceptInvitation, createInvitation, updateOrganization, updateOrgMembership } = await import("./org/orgDb");
import type { TrpcContext } from "./_core/context";

const makeUser = (id: number): User => ({ id, openId: `u-${id}`, email: null, name: null, loginMethod: "dev_email", passwordHash: null, emailVerifiedAt: new Date(), emailVerificationSentAt: null, role: "user", approvalStatus: "approved", approvedAt: null, approvedBy: null, rejectedAt: null, rejectionReason: null, accountStatus: "active", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }) as User;
const asPlatformAdmin = () => appRouter.createCaller({ user: { ...makeUser(1), role: "admin" } as User, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext);
const as = (id: number) => appRouter.createCaller({ user: makeUser(id), req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext);
const hash = (code: string) => createHash("sha256").update(normalizeInviteCode(code)).digest("hex");

// Kurum A (1): yönetici 10, öğretmen 11 (öğrenci 20'ye atanmış), öğretmen 12 (atamasız), öğrenciler 20, 21.
// Kurum B (2): yönetici 30, öğrenci 40.
beforeEach(() => {
  courseBlocks = [];
  plannedSessions = [];
  store.orgs = [{ id: 1, name: "A Dershanesi", status: "active" }, { id: 2, name: "B Dershanesi", status: "active" }];
  store.members = [
    { orgId: 1, userId: 10, role: "admin", status: "active" }, { orgId: 1, userId: 11, role: "teacher", status: "active" }, { orgId: 1, userId: 12, role: "teacher", status: "active" },
    { orgId: 1, userId: 20, role: "student", status: "active" }, { orgId: 1, userId: 21, role: "student", status: "active" },
    { orgId: 2, userId: 30, role: "admin", status: "active" }, { orgId: 2, userId: 40, role: "student", status: "active" },
  ];
  store.assignments = [{ orgId: 1, teacherUserId: 11, studentUserId: 20, active: 1 }];
  store.invitations = []; store.notes = []; store.audit = []; store.tasks = []; store.upgrades = []; reads.length = 0;
  getStudyCalendar.mockReset();
});

describe("kurum izolasyonu (docs/kurumsal.md §5)", () => {
  it("1) başka kurumun öğrencisi ID ile okunamaz ve değiştirilemez", async () => {
    await expect(as(10).org.student({ orgId: 1, studentUserId: 40 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(as(10).org.tasks.assign({ orgId: 1, studentUserId: 40, date: "2026-10-20", time: "17:00", subject: "Matematik", topic: "Problemler", kind: "Soru çözümü", minutes: 40 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(as(10).org.student({ orgId: 2, studentUserId: 40 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(store.tasks).toEqual([]);
  });

  it("2) öğretmen yalnızca kendisine atanmış öğrenciyi görür", async () => {
    await expect(as(11).org.student({ orgId: 1, studentUserId: 20 })).resolves.toBeTruthy();
    await expect(as(11).org.student({ orgId: 1, studentUserId: 21 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await as(11).org.students({ orgId: 1 })).map((s) => s.userId)).toEqual([20]);
    expect(await as(12).org.students({ orgId: 1 })).toEqual([]);
  });

  it("3) kurumdan ayrılan öğrenci anında görünmez olur", async () => {
    await as(20).org.leave({ orgId: 1 });
    await expect(as(10).org.student({ orgId: 1, studentUserId: 20 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await as(10).org.students({ orgId: 1 })).map((s) => s.userId)).toEqual([21]);
    await expect(as(11).org.student({ orgId: 1, studentUserId: 20 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("4) iptal edilmiş, süresi geçmiş ya da tükenmiş davet kabul edilmez; kullanılmış kod tekrar işlemez", async () => {
    const { code } = await as(10).org.invitations.create({ orgId: 1, role: "student", maxUses: 1 });
    await as(50).org.join({ code, consent: true, kvkkVersion: 1 });
    await expect(as(51).org.join({ code, consent: true, kvkkVersion: 1 })).rejects.toThrow(/kullanım sınırına/);
    const second = await as(10).org.invitations.create({ orgId: 1, role: "student" });
    await as(10).org.invitations.revoke({ orgId: 1, invitationId: second.id });
    await expect(as(52).org.join({ code: second.code, consent: true, kvkkVersion: 1 })).rejects.toThrow(/iptal/);
    const third = await as(10).org.invitations.create({ orgId: 1, role: "student" });
    store.invitations.find((i) => i.id === third.id)!.expiresAt = new Date(Date.now() - 1000);
    await expect(as(53).org.join({ code: third.code, consent: true, kvkkVersion: 1 })).rejects.toThrow(/süresi/);
    await expect(as(54).org.join({ code: "ABCD-EFGH", consent: true, kvkkVersion: 1 })).rejects.toThrow(/bulunamadı/);
    expect(store.invitations.every((i) => i.codeHash.length === 64 && !i.codeHash.includes("-"))).toBe(true);
  });

  it("5) öğrenci kurum uçlarını çağıramaz", async () => {
    await expect(as(20).org.overview({ orgId: 1 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(as(20).org.students({ orgId: 1 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(as(20).org.student({ orgId: 1, studentUserId: 21 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(as(20).org.invitations.create({ orgId: 1, role: "student" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("6) rol yükseltme ve başka kurumun üyeliğine dokunma engellenir", async () => {
    await expect(as(11).org.members.setRole({ orgId: 1, userId: 12, role: "admin" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(as(10).org.members.setRole({ orgId: 1, userId: 11, role: "admin" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(as(10).org.members.setRole({ orgId: 1, userId: 10, role: "owner" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(as(10).org.members.remove({ orgId: 1, userId: 40 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(as(10).org.members.remove({ orgId: 2, userId: 40 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(as(11).org.invitations.create({ orgId: 1, role: "teacher" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(as(10).org.members.setRole({ orgId: 1, userId: 20, role: "teacher" })).rejects.toThrow(/çevrilemez/);
  });

  it("7) kurum toplamları yalnızca aktif öğrencileri sayar", async () => {
    store.members.find((m) => m.userId === 21)!.status = "left";
    expect((await as(10).org.overview({ orgId: 1 })).totals.students).toBe(1);
  });

  it("8) personel notları öğrenciye ve atanmamış öğretmene kapalı; öğrenciye açık not yalnızca öğrencide", async () => {
    await as(11).org.notes.create({ orgId: 1, studentUserId: 20, body: "Gizli personel notu", visibility: "staff" });
    await as(11).org.notes.create({ orgId: 1, studentUserId: 20, body: "Aferin, devam!", visibility: "student" });
    expect((await as(20).org.myFeedback()).map((n) => n.body)).toEqual(["Aferin, devam!"]);
    await expect(as(12).org.student({ orgId: 1, studentUserId: 20 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(as(12).org.notes.create({ orgId: 1, studentUserId: 20, body: "x", visibility: "staff" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await as(10).org.student({ orgId: 1, studentUserId: 20 })).notes).toHaveLength(2);
  });

  it("9) kritik işlemler denetim kaydı üretir", async () => {
    const { code } = await as(10).org.invitations.create({ orgId: 1, role: "student" });
    await as(60).org.join({ code, consent: true, kvkkVersion: 1 });
    await as(11).org.tasks.assign({ orgId: 1, studentUserId: 20, date: "2026-10-20", time: "17:00", subject: "Matematik", topic: "Problemler", kind: "Soru çözümü", minutes: 40 });
    await as(11).org.notes.create({ orgId: 1, studentUserId: 20, body: "not", visibility: "staff" });
    await as(60).org.leave({ orgId: 1 });
    expect(store.audit.map((a) => a.action)).toEqual(["invitation.create", "member.join", "task.assign", "note.create", "member.leave"]);
    expect(store.tasks).toEqual([expect.objectContaining({ orgId: 1, studentUserId: 20, teacherUserId: 11 })]);
  });

  it("10) görev kurum ders programına ya da öğrencinin planlı çalışmasına yazılmaz; uygun ilk saat önerilir", async () => {
    // 20 Ekim 2026 Salı: dershanede 16:30–18:00 Matematik, takvimde 19:00 Paragraf (40 dk).
    courseBlocks = [{ source: "course", dayOfWeek: 2, startTime: "16:30", endTime: "18:00", subject: "Matematik", label: "12-A · Matematik", orgName: "A Dershanesi", teacherName: null, room: null }];
    plannedSessions = [{ sessionDate: new Date("2026-10-20T19:00:00"), plannedMinutes: 40, status: "planned", title: "Paragraf" }];
    const task = (time: string) => as(11).org.tasks.assign({ orgId: 1, studentUserId: 20, date: "2026-10-20", time, subject: "Matematik", topic: "Problemler", kind: "Soru çözümü", minutes: 40 });
    await expect(task("17:00")).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringMatching(/12-A · Matematik \(16:30–18:00\) dersiyle çakışıyor\. Aynı gün uygun ilk saat: 18:10\./) });
    await expect(task("18:40")).rejects.toMatchObject({ message: expect.stringMatching(/planlı çalışmasıyla: Paragraf \(19:00–19:40\) çakışıyor\. Aynı gün uygun ilk saat: 19:50\./) });
    expect(store.tasks).toEqual([]);
    await expect(task("18:10")).resolves.toMatchObject({ sessionId: 1 });
    plannedSessions = [{ sessionDate: new Date("2026-10-20T18:10:00"), plannedMinutes: 320, status: "planned", title: "Kamp" }];
    await expect(task("18:20")).rejects.toMatchObject({ message: expect.stringMatching(/Bu gün uygun saat yok/) });
  });
});

describe("kurum kuralları", () => {
  it("personel ekranı öğrencinin takvimini değiştiren fonksiyonu hiç çağırmaz", async () => {
    await as(10).org.overview({ orgId: 1 });
    await as(10).org.students({ orgId: 1 });
    await as(10).org.student({ orgId: 1, studentUserId: 20 });
    expect(getStudyCalendar).not.toHaveBeenCalled();
    expect(reads).toContain("calendar-readonly");
  });

  it("öğrenci açık onay olmadan katılamaz ve aynı anda tek kuruma bağlı olur", async () => {
    const { code } = await as(30).org.invitations.create({ orgId: 2, role: "student", maxUses: 5 });
    await expect(as(20).org.join({ code, consent: false as never })).rejects.toThrow();
    await expect(as(20).org.join({ code, consent: true, kvkkVersion: 1 })).rejects.toThrow(/şu anki kurumundan ayrıl/);
    await as(20).org.leave({ orgId: 1 });
    await expect(as(20).org.join({ code, consent: true, kvkkVersion: 1 })).resolves.toMatchObject({ orgId: 2, role: "student" });
  });

  it("rol ve davet yetki tabloları", () => {
    expect(canAssignRole("admin", "teacher", "coordinator")).toBe(true);
    expect(canAssignRole("admin", "teacher", "admin")).toBe(false);
    expect(canAssignRole("coordinator", "teacher", "student")).toBe(false);
    expect(canAssignRole("owner", "admin", "owner")).toBe(false);
    expect(canInviteRole("teacher", "student")).toBe(true);
    expect(canInviteRole("teacher", "teacher")).toBe(false);
    expect(canInviteRole("admin", "coordinator")).toBe(true);
    expect(canInviteRole("admin", "admin")).toBe(false);
  });

  it("ayarlar: kurum bilgisini yalnızca yönetici, sınıfı koordinatör+ tanımlar; sorumlu öğretmen aynı kurumun personeli olmalı", async () => {
    vi.clearAllMocks();
    await expect(as(11).org.settings.update({ orgId: 1, name: "Değişti", kind: "okul" })).rejects.toThrow();
    await expect(as(30).org.settings.update({ orgId: 1, name: "Değişti", kind: "okul" })).rejects.toThrow();
    await expect(as(10).org.settings.update({ orgId: 1, name: "A Kurs Merkezi", kind: "dershane", contactEmail: "" })).resolves.toEqual({ ok: true });
    expect(updateOrganization).toHaveBeenCalledWith(1, expect.objectContaining({ name: "A Kurs Merkezi", contactEmail: null, city: null }));
    await expect(as(11).org.classes.create({ orgId: 1, name: "12-A" })).rejects.toThrow();
    await expect(as(10).org.classes.create({ orgId: 1, name: "12-A", advisorUserId: 30 })).rejects.toThrow(/Sorumlu öğretmen/);
    await expect(as(10).org.classes.create({ orgId: 1, name: "12-A", advisorUserId: 20 })).rejects.toThrow(/Sorumlu öğretmen/);
    await expect(as(10).org.classes.create({ orgId: 1, name: "12-A", gradeLevel: "12", track: "SAY", advisorUserId: 11 })).resolves.toEqual({ id: 1 });
    await expect(as(11).org.members.setSubject({ orgId: 1, userId: 11, subject: "Fizik" })).rejects.toThrow();
    expect(store.audit.map((row) => row.action)).toEqual(expect.arrayContaining(["org.update", "class.create"]));
  });

  it("öğretmen tanımlama: branş davetle gelir, öğrenci davetinde branş tutulmaz", async () => {
    vi.clearAllMocks();
    const teacher = await as(10).org.invitations.create({ orgId: 1, role: "teacher", note: "Ayşe", subject: "Kimya" });
    const student = await as(10).org.invitations.create({ orgId: 1, role: "student", subject: "Kimya" });
    expect(createInvitation).toHaveBeenNthCalledWith(1, expect.objectContaining({ role: "teacher", subject: "Kimya" }));
    expect(createInvitation).toHaveBeenNthCalledWith(2, expect.objectContaining({ role: "student", subject: null }));
    await as(50).org.join({ code: teacher.code, consent: true, kvkkVersion: 1 });
    expect(acceptInvitation).toHaveBeenLastCalledWith(expect.objectContaining({ userId: 50, role: "teacher", subject: "Kimya" }));
    expect(student.code).toMatch(/-/);
  });

  it("KVKK: öğrenci kurumun güncel metin sürümünü onaylamadan katılamaz; önizleme metni kurum adıyla döner", async () => {
    store.orgs[1].kvkkVersion = 3;
    const { code } = await as(30).org.invitations.create({ orgId: 2, role: "student", maxUses: 5 });
    const preview = await as(60).org.previewInvitation({ code });
    expect(preview.kvkk).toMatchObject({ version: 3, isCustom: false });
    expect(preview.kvkk!.notice).toContain("B Dershanesi");
    await expect(as(60).org.join({ code, consent: true })).rejects.toThrow(/KVKK/);
    await expect(as(60).org.join({ code, consent: true, kvkkVersion: 2 })).rejects.toThrow(/KVKK/);
    await expect(as(60).org.join({ code, consent: true, kvkkVersion: 3 })).resolves.toMatchObject({ orgId: 2 });
    expect(acceptInvitation).toHaveBeenLastCalledWith(expect.objectContaining({ userId: 60, kvkkVersion: 3 }));
  });

  it("üyelik süresi dolan kurum: panel okunur ama değişiklik yapılamaz, yeni katılım alınmaz", async () => {
    const { code } = await as(10).org.invitations.create({ orgId: 1, role: "student", maxUses: 5 });
    store.orgs[0].membershipEndsAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await expect(as(10).org.overview({ orgId: 1 })).resolves.toBeTruthy();
    await expect(as(10).org.classes.create({ orgId: 1, name: "12-C" })).rejects.toThrow(/süresi doldu/);
    await expect(as(11).org.notes.create({ orgId: 1, studentUserId: 20, body: "Not", visibility: "staff" })).rejects.toThrow(/süresi doldu/);
    await expect(as(61).org.previewInvitation({ code })).rejects.toThrow(/süresi dolmuş/);
    await expect(as(61).org.join({ code, consent: true, kvkkVersion: 1 })).rejects.toThrow(/süresi dolmuş/);
  });

  it("paket yükseltme: yalnızca kurum yöneticisi, tek bekleyen talep, düşürme yok; süresi dolsa da talep edilir", async () => {
    await expect(as(11).org.settings.requestUpgrade({ orgId: 1, plan: "pro" })).rejects.toThrow();
    await expect(as(30).org.settings.requestUpgrade({ orgId: 1, plan: "pro" })).rejects.toThrow();
    await expect(as(10).org.settings.requestUpgrade({ orgId: 1, plan: "trial" })).rejects.toThrow(/talep edilemez/);
    store.orgs[0].membershipEndsAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    await expect(as(10).org.settings.requestUpgrade({ orgId: 1, plan: "standard", note: "50 öğrenci" })).resolves.toEqual({ id: 1 });
    await expect(as(10).org.settings.requestUpgrade({ orgId: 1, plan: "pro" })).rejects.toThrow(/bekleyen/);
    await expect(as(10).org.settings.cancelUpgrade({ orgId: 1, requestId: 1 })).resolves.toEqual({ ok: true });
    store.orgs[0].plan = "pro";
    await expect(as(10).org.settings.requestUpgrade({ orgId: 1, plan: "standard" })).rejects.toThrow(/talep edilemez/);
    await expect(as(10).org.settings.requestUpgrade({ orgId: 1, plan: "pro" })).resolves.toEqual({ id: 2 });
  });

  it("paket talebini yalnızca platform yöneticisi onaylar; onay paketi, krediyi ve süreyi günceller, ikinci kez onaylanmaz", async () => {
    vi.clearAllMocks();
    store.orgs[0].membershipEndsAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    await as(10).org.settings.requestUpgrade({ orgId: 1, plan: "pro" });
    await expect(as(10).admin.orgs.resolveUpgrade({ requestId: 1, approve: true })).rejects.toThrow();
    await expect(asPlatformAdmin().admin.orgs.resolveUpgrade({ requestId: 1, approve: true })).resolves.toEqual({ ok: true });
    const [orgId, applied] = vi.mocked(updateOrgMembership).mock.calls[0];
    expect(orgId).toBe(1);
    expect(applied).toMatchObject({ plan: "pro", aiCreditsMonthly: 20000 });
    expect(applied.membershipEndsAt!.getTime()).toBeGreaterThan(Date.now() + 360 * 24 * 60 * 60 * 1000);
    expect(store.upgrades[0].status).toBe("approved");
    await expect(asPlatformAdmin().admin.orgs.resolveUpgrade({ requestId: 1, approve: true })).rejects.toThrow(/Bekleyen talep/);
    expect(store.audit.map((row) => row.action)).toEqual(expect.arrayContaining(["org.upgrade_request", "org.upgrade_approved"]));
  });

  it("kredi havuzu kararı, üyelik durumu ve KVKK şablonu", () => {
    expect(creditDecision({ monthly: 0, usedByOrg: 0, cap: null, usedByStudent: 0, cost: 2 })).toEqual({ ok: false, reason: "no_pool" });
    expect(creditDecision({ monthly: 100, usedByOrg: 99, cap: null, usedByStudent: 0, cost: 2 })).toEqual({ ok: false, reason: "pool_empty" });
    expect(creditDecision({ monthly: 100, usedByOrg: 98, cap: null, usedByStudent: 50, cost: 2 })).toEqual({ ok: true });
    expect(creditDecision({ monthly: 100, usedByOrg: 10, cap: 10, usedByStudent: 9, cost: 2 })).toEqual({ ok: false, reason: "student_cap" });
    const now = new Date("2026-10-18T12:00:00");
    expect(membershipState({ membershipStartsAt: null, membershipEndsAt: null }, now)).toBe("active");
    expect(membershipState({ membershipStartsAt: null, membershipEndsAt: new Date("2026-10-18T00:00:00") }, now)).toBe("active");
    expect(membershipState({ membershipStartsAt: null, membershipEndsAt: new Date("2026-10-17T00:00:00") }, now)).toBe("expired");
    expect(membershipState({ membershipStartsAt: new Date("2026-10-20"), membershipEndsAt: null }, now)).toBe("not_started");
    expect(creditPeriodStart(now)).toEqual(new Date(2026, 9, 1));
    const text = renderKvkk(DEFAULT_KVKK_NOTICE, { name: "Örnek Kurs", address: "Atatürk Cd. 1", district: "Çankaya", city: "Ankara", contactEmail: "kvkk@ornek.com", phone: null });
    expect(text).toContain("Örnek Kurs");
    expect(text).toContain("Atatürk Cd. 1, Çankaya, Ankara");
    expect(text).toContain("kvkk@ornek.com");
    expect(text).not.toMatch(/\{\{/);
  });

  it("davet kodu biçimi ve normalizasyonu", () => {
    let seed = 0;
    const code = generateInviteCode((max) => (seed++ * 7) % max);
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(code).not.toMatch(/[01OIL]/);
    expect(normalizeInviteCode(" abcd - efgh ")).toBe("ABCDEFGH");
    expect(hash("abcd-efgh")).toBe(hash("ABCDEFGH"));
    expect(invitationProblem({ revokedAt: null, expiresAt: new Date(Date.now() + 1000), usedCount: 0, maxUses: 1 })).toBeNull();
  });

  it("risk kuralları: etkinlik yok, düşük uyum, net düşüşü", () => {
    const now = new Date("2026-10-18T12:00:00");
    const base = { exams: [], logs: [], weekSessions: [], weakTopicCount: 0, lastSignedIn: new Date("2026-10-17T10:00:00") };
    expect(summarizeStudent(base, now).risks).toEqual([]);
    expect(summarizeStudent({ ...base, lastSignedIn: new Date("2026-10-01") }, now).risks).toContain("inactive");
    const missed = Array.from({ length: 4 }, (_, i) => ({ status: "planned" as const, plannedMinutes: 40, sessionDate: new Date(`2026-10-1${3 + i}T17:00:00`) }));
    expect(summarizeStudent({ ...base, weekSessions: missed }, now).risks).toContain("low_adherence");
    const exams = [{ exam: "TYT" as const, examDate: new Date("2026-10-01"), net: 70 }, { exam: "TYT" as const, examDate: new Date("2026-10-15"), net: 62 }, { exam: "AYT" as const, examDate: new Date("2026-10-16"), net: 30 }];
    const summary = summarizeStudent({ ...base, exams }, now);
    expect(summary.risks).toContain("net_drop");
    expect(summary.lastTyt).toMatchObject({ net: 62, delta: -8 });
    expect(summary.lastAyt).toMatchObject({ net: 30, delta: null });
  });
});
