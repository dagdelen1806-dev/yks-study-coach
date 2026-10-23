import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import type { User } from "../drizzle/schema";
import { academicCases, bookInventory, coachAlerts, caseActions, caseEvaluations, caseEvidence, classStudents, classTimetableSlots, counselingNotes, organizationAuditLogs, organizationClasses, organizationMembers, organizations, studyPlanSessions, studyPlans, userBookContents, userMockExams, userResourceBooks, users, yksTopics } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { getDb } from "./db";

// G1: Novara Rehber takip dosyası — router + gerçek veritabanı (yetki, tekrar, plan, mahrem not, değerlendirme).
const hasDb = Boolean(process.env.DATABASE_URL);
describe.skipIf(!hasDb)("akademik takip dosyası (router + veritabanı)", () => {
  const stamp = Date.now() % 1_000_000;
  const ids = { admin: 0, advisor: 0, otherTeacher: 0, student: 0, outsider: 0 };
  let orgId = 0, otherOrgId = 0, classId = 0, caseId = 0;
  let topicOwned = 0, topicMissing = 0;
  const caller = (id: number) => appRouter.createCaller({ user: { id, role: "user", approvalStatus: "approved", accountStatus: "active", emailVerifiedAt: new Date(), loginMethod: "dev_email" } as unknown as User, req: { protocol: "https", headers: { host: "localhost" } } as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext);
  const exam = (date: string, net: number) => ({ userId: ids.student, title: `TYT ${date}`, exam: "TYT" as const, examDate: new Date(`${date}T10:00:00`), net: net.toFixed(2), subjectsJson: JSON.stringify({ Matematik: net / 3 }), timeSpentJson: "{}", topicNetsJson: "{}", topicDetailsJson: "[]" });

  beforeAll(async () => {
    const db = (await getDb())!;
    for (const key of Object.keys(ids) as Array<keyof typeof ids>) {
      const [row] = await db.insert(users).values({ openId: `case-${key}-${stamp}`, name: `Dosya ${key}`, loginMethod: "dev_email" }).returning({ id: users.id });
      ids[key] = row.id;
    }
    [{ id: orgId }] = await db.insert(organizations).values({ name: "Dosya Testi", slug: `dosya-${stamp}`, membershipStartsAt: new Date("2026-01-01"), membershipEndsAt: new Date("2030-01-01") }).returning({ id: organizations.id });
    [{ id: otherOrgId }] = await db.insert(organizations).values({ name: "Başka Kurum", slug: `dosya-b-${stamp}`, academicCasesEnabled: 1, membershipStartsAt: new Date("2026-01-01"), membershipEndsAt: new Date("2030-01-01") }).returning({ id: organizations.id });
    await db.insert(organizationMembers).values([
      { orgId, userId: ids.admin, role: "admin" },
      { orgId, userId: ids.advisor, role: "teacher", subject: "Matematik" },
      { orgId, userId: ids.otherTeacher, role: "teacher", subject: "Türkçe" },
      { orgId, userId: ids.student, role: "student", consentAt: new Date() },
      { orgId: otherOrgId, userId: ids.outsider, role: "admin" },
    ]);
    [{ id: classId }] = await db.insert(organizationClasses).values({ orgId, name: "12-A Sayısal", advisorUserId: ids.advisor }).returning({ id: organizationClasses.id });
    await db.insert(classStudents).values({ classId, studentUserId: ids.student });
    // Salı 16:30–18:00 dershanede Matematik: plan bu saate görev yazmamalı.
    await db.insert(classTimetableSlots).values({ orgId, classId, dayOfWeek: 2, startTime: "16:30", endTime: "18:00", subject: "Matematik", teacherUserId: ids.advisor, room: "A-101" });
    await db.insert(userMockExams).values([exam("2026-09-10", 82), exam("2026-09-24", 76), exam("2026-10-08", 69)]);
    const topics = await db.select({ id: yksTopics.id }).from(yksTopics).where(eq(yksTopics.subject, "Matematik")).limit(2);
    [topicOwned, topicMissing] = topics.map((topic) => topic.id);
    await db.insert(userResourceBooks).values({ userId: ids.student, bookId: `case-book-${stamp}`, title: "Problemler Soru Bankası", publisher: "Karekök", subject: "Matematik", exam: "TYT", level: "Orta", format: "Kaynak", reason: "test" });
    await db.insert(bookInventory).values({ userId: ids.student, bookId: `case-book-${stamp}` });
    await db.insert(userBookContents).values({ userId: ids.student, bookId: `case-book-${stamp}`, sortOrder: 1, unitNumber: 1, unitTitle: "Problemler", contentType: "topic_test", label: "Test 4", testNumber: 4, title: "Sayı Problemleri", pageStart: 41, pageEnd: 48, topicId: topicOwned, mappingStatus: "confirmed", mappingMethod: "manual", mappingConfidence: "1.000", source: "manual" });
  });

  afterAll(async () => {
    const db = (await getDb())!;
    const caseIds = (await db.select({ id: academicCases.id }).from(academicCases).where(eq(academicCases.orgId, orgId))).map((row) => row.id);
    if (caseIds.length) {
      await db.delete(caseEvidence).where(inArray(caseEvidence.caseId, caseIds));
      await db.delete(caseActions).where(inArray(caseActions.caseId, caseIds));
      await db.delete(caseEvaluations).where(inArray(caseEvaluations.caseId, caseIds));
      await db.delete(academicCases).where(inArray(academicCases.id, caseIds));
    }
    await db.delete(counselingNotes).where(eq(counselingNotes.orgId, orgId));
    await db.delete(coachAlerts).where(eq(coachAlerts.userId, ids.student));
    await db.delete(studyPlanSessions).where(eq(studyPlanSessions.userId, ids.student));
    await db.delete(studyPlans).where(eq(studyPlans.userId, ids.student));
    await db.delete(userBookContents).where(eq(userBookContents.userId, ids.student));
    await db.delete(bookInventory).where(eq(bookInventory.userId, ids.student));
    await db.delete(userResourceBooks).where(eq(userResourceBooks.userId, ids.student));
    await db.delete(userMockExams).where(eq(userMockExams.userId, ids.student));
    await db.delete(classTimetableSlots).where(eq(classTimetableSlots.orgId, orgId));
    await db.delete(classStudents).where(eq(classStudents.classId, classId));
    await db.delete(organizationClasses).where(eq(organizationClasses.orgId, orgId));
    await db.delete(organizationAuditLogs).where(inArray(organizationAuditLogs.orgId, [orgId, otherOrgId]));
    await db.delete(organizationMembers).where(inArray(organizationMembers.orgId, [orgId, otherOrgId]));
    await db.delete(organizations).where(inArray(organizations.id, [orgId, otherOrgId]));
    await db.delete(users).where(inArray(users.id, Object.values(ids)));
  });

  it("kurumda kapalıyken kullanılamaz; yalnızca kurum yöneticisi açar", async () => {
    await expect(caller(ids.advisor).org.cases.signals({ orgId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller(ids.advisor).org.cases.setEnabled({ orgId, enabled: true })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await caller(ids.admin).org.cases.setEnabled({ orgId, enabled: true });
    const signals = await caller(ids.advisor).org.cases.signals({ orgId });
    expect(signals).toEqual([expect.objectContaining({ studentUserId: ids.student, examKind: "TYT", status: "signal", confidence: "medium", description: "TYT: 82 → 76 → 69 (−13 net)", openCaseId: null })]);
  });

  it("yanlış rol ve başka kurum dosya açamaz; aynı risk ikinci dosya açmaz; kanıt anlık görüntüsü yazılır", async () => {
    await expect(caller(ids.otherTeacher).org.cases.open({ orgId, studentUserId: ids.student, ruleKey: "trend_decline", examKind: "TYT" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller(ids.outsider).org.cases.open({ orgId, studentUserId: ids.student, ruleKey: "trend_decline", examKind: "TYT" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller(ids.outsider).org.cases.open({ orgId: otherOrgId, studentUserId: ids.student, ruleKey: "trend_decline", examKind: "TYT" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller(ids.student).org.cases.queue({ orgId })).rejects.toMatchObject({ code: "NOT_FOUND" });
    // LGS'de veri yok: yetersiz, dosya açılmaz.
    await expect(caller(ids.advisor).org.cases.open({ orgId, studentUserId: ids.student, ruleKey: "trend_decline", examKind: "LGS" })).rejects.toThrow(/yetersiz veri/);

    const first = await caller(ids.advisor).org.cases.open({ orgId, studentUserId: ids.student, ruleKey: "trend_decline", examKind: "TYT" });
    const second = await caller(ids.admin).org.cases.open({ orgId, studentUserId: ids.student, ruleKey: "trend_decline", examKind: "TYT" });
    expect(first.created).toBe(true);
    expect(second).toEqual({ caseId: first.caseId, created: false });
    caseId = first.caseId;
    const detail = await caller(ids.advisor).org.cases.get({ orgId, caseId });
    expect(detail.case).toMatchObject({ ownerUserId: ids.advisor, status: "open", confidence: "medium" });
    expect(detail.evidence.map((item) => item.kind)).toEqual(["exam", "exam", "exam", "exam", "study", "topic"]);
    expect(detail.evidence.filter((item) => item.refId !== null).map((item) => (item.snapshot as { net: number }).net)).toEqual([82, 76, 69]);
    await expect(caller(ids.otherTeacher).org.cases.get({ orgId, caseId })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("eldeki kitaptan öneri; rafta olmayan konu ayrı listelenir", async () => {
    const result = await caller(ids.advisor).org.cases.suggestResources({ orgId, caseId, topicIds: [topicOwned, topicMissing] });
    expect(result.owned).toEqual([expect.objectContaining({ title: "Problemler Soru Bankası", items: [expect.objectContaining({ label: "Test 4", pageStart: 41, pageEnd: 48 })] })]);
    expect(result.missingTopicIds).toEqual([topicMissing]);
    expect(result.catalog.length).toBeLessThanOrEqual(3);
  });

  it("plan dershane saatine yazılmaz; aynı plan iki kez gönderilse de tek görev seti oluşur", async () => {
    const items = [{ subject: "Matematik", topicId: topicOwned, topic: "Sayı Problemleri", minutes: 40, bookId: `case-book-${stamp}`, pages: "41–48" }, { subject: "Matematik", topicId: topicOwned, topic: "Sayı Problemleri", minutes: 40 }];
    const preview = await caller(ids.advisor).org.cases.previewPlan({ orgId, caseId, items, from: "2026-10-27", days: 2 });
    // Salı: 16:30–18:00 dershane → ilk uygun 18:10 (1090 dk); Çarşamba boş → 16:00 (960 dk).
    expect(preview.map((item) => ("start" in item ? item.start : null))).toEqual([1090, 960]);
    const key = `plan-${stamp}`;
    const assigned = await caller(ids.advisor).org.cases.assignPlan({ orgId, caseId, items, from: "2026-10-27", days: 2, idempotencyKey: key });
    const again = await caller(ids.advisor).org.cases.assignPlan({ orgId, caseId, items, from: "2026-10-27", days: 2, idempotencyKey: key });
    expect(assigned.sessionIds).toHaveLength(2);
    expect(again).toMatchObject({ duplicate: true, sessionIds: assigned.sessionIds });
    const db = (await getDb())!;
    const sessions = await db.select().from(studyPlanSessions).where(inArray(studyPlanSessions.id, assigned.sessionIds));
    expect(sessions.every((session) => session.caseActionId === assigned.actionId && session.assignedByUserId === ids.advisor)).toBe(true);
    expect(sessions.map((session) => `${session.sessionDate.getHours()}:${session.sessionDate.getMinutes()}`).sort()).toEqual(["16:0", "18:10"]);
    // Öğrenciye tek bildirim: görev sayısı ve öğretmenin adı; dosya ya da risk dili yok. Tekrar gönderim yeni bildirim üretmez.
    const alerts = await db.select().from(coachAlerts).where(and(eq(coachAlerts.userId, ids.student), eq(coachAlerts.ruleKey, "teacher_tasks")));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].title).toBe("Dosya advisor 2 çalışma önerdi");
    expect(alerts[0].message).not.toMatch(/dosya|düşüş|risk/i);
    expect((await caller(ids.advisor).org.cases.get({ orgId, caseId })).case.status).toBe("in_progress");
  });

  it("dosya notu mahrem: yazan ve sorumlu öğretmen görür, kurum yöneticisi görmez", async () => {
    await caller(ids.advisor).org.cases.addNote({ orgId, caseId, body: "Görüşmede sınav kaygısından söz etti.", visibility: "staff" });
    expect((await caller(ids.advisor).org.cases.get({ orgId, caseId })).notes.map((note) => note.body)).toEqual(["Görüşmede sınav kaygısından söz etti."]);
    const asAdmin = await caller(ids.admin).org.cases.get({ orgId, caseId });
    expect(asAdmin.notes).toEqual([]);
    expect(asAdmin.canReadNotes).toBe(false);
    // Öğrenci detayındaki notlar da aynı kuralla.
    expect((await caller(ids.admin).org.student({ orgId, studentUserId: ids.student })).notes).toEqual([]);
  });

  it("öğrenci yalnızca kendi görevine geri bildirim verir", async () => {
    const db = (await getDb())!;
    const [task] = await db.select({ id: studyPlanSessions.id }).from(studyPlanSessions).where(eq(studyPlanSessions.userId, ids.student)).orderBy(studyPlanSessions.sessionDate).limit(1);
    await expect(caller(ids.otherTeacher).studyTasks.feedback({ sessionId: task.id, feedback: "done" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await caller(ids.student).studyTasks.feedback({ sessionId: task.id, feedback: "done" });
    const [row] = await db.select().from(studyPlanSessions).where(eq(studyPlanSessions.id, task.id));
    expect(row).toMatchObject({ studentFeedback: "done", status: "completed" });
  });

  it("değerlendirme: yeni deneme yoksa sınırlı kanıt; varsa net farkı, sonuç öğretmenden; kapanır ve yeniden açılır", async () => {
    const limited = await caller(ids.advisor).org.cases.evaluate({ orgId, caseId, outcome: "ongoing" });
    expect(limited).toMatchObject({ limitedEvidence: true, netChange: null, tasksDone: 1, tasksTotal: 2 });
    const db = (await getDb())!;
    await db.insert(userMockExams).values(exam("2026-11-05", 74));
    const closed = await caller(ids.advisor).org.cases.evaluate({ orgId, caseId, outcome: "completed", note: "Problemlerde ilerleme var." });
    expect(closed).toMatchObject({ limitedEvidence: false, netChange: 5 });
    const detail = await caller(ids.advisor).org.cases.get({ orgId, caseId });
    expect(detail.case).toMatchObject({ status: "closed", outcome: "completed" });
    expect(detail.evaluations.map((item) => item.teacherOutcome)).toEqual(["ongoing", "completed"]);
    await expect(caller(ids.advisor).org.cases.addNote({ orgId, caseId, body: "x", visibility: "staff" })).resolves.toBeTruthy();
    await expect(caller(ids.advisor).org.cases.assignPlan({ orgId, caseId, items: [{ subject: "Matematik", topicId: null, topic: "x", minutes: 40 }], from: "2026-11-10", days: 1, idempotencyKey: `closed-${stamp}` })).rejects.toThrow(/kapalı/);
    await caller(ids.advisor).org.cases.reopen({ orgId, caseId, reason: "Yeni denemede tekrar düştü" });
    expect((await caller(ids.advisor).org.cases.get({ orgId, caseId })).case.status).toBe("in_progress");
  });

  it("yönetici özeti yalnızca sayılar; öğretmen özet ucunu çağıramaz; işlemler denetim kaydında", async () => {
    expect(await caller(ids.admin).org.cases.summary({ orgId })).toMatchObject({ inProgress: 1, open: 0 });
    await expect(caller(ids.advisor).org.cases.summary({ orgId })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const db = (await getDb())!;
    const actions = (await db.select({ action: organizationAuditLogs.action }).from(organizationAuditLogs).where(eq(organizationAuditLogs.orgId, orgId))).map((row) => row.action);
    expect(actions).toEqual(expect.arrayContaining(["cases.enable", "case.open", "case.plan", "case.note", "case.evaluate", "case.close", "case.reopen"]));
    expect(actions.filter((action) => action === "case.open")).toHaveLength(1);
    expect(actions.filter((action) => action === "case.plan")).toHaveLength(1);
  });

  it("öğretmen haftalık özeti: açık dosya sayısı; kapalı kurumda bölüm yok", async () => {
    const { academicDigestFor } = await import("./org/caseDb");
    const students = [{ userId: ids.student, name: "Dosya student" }];
    expect(await academicDigestFor(orgId, students)).toMatchObject({ openCases: 1, suggestions: [] });
    expect(await academicDigestFor(otherOrgId, [])).toBeNull();
    const db = (await getDb())!;
    await db.update(organizations).set({ academicCasesEnabled: 0 }).where(eq(organizations.id, orgId));
    expect(await academicDigestFor(orgId, students)).toBeNull();
    await db.update(organizations).set({ academicCasesEnabled: 1 }).where(eq(organizations.id, orgId));
  });
});
