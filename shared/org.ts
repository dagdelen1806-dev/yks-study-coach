import { calculatePlanAdherence, type AdherenceSession } from "./planAdherence";

// Kurum Paneli: roller, davet kodu ve öğrenci özeti kuralları. Saf fonksiyonlar (sunucu ve test).

export const ORG_ROLES = ["owner", "admin", "coordinator", "teacher", "student"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];
export const STAFF_ROLES = ["owner", "admin", "coordinator", "teacher"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export const INVITABLE_ROLES = ["admin", "coordinator", "teacher", "student"] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const ROLE_RANK: Record<OrgRole, number> = { student: 0, teacher: 1, coordinator: 2, admin: 3, owner: 4 };
export const ROLE_LABELS: Record<OrgRole, string> = { owner: "Kurum sahibi", admin: "Kurum yöneticisi", coordinator: "Akademik koordinatör", teacher: "Öğretmen / koç", student: "Öğrenci" };

/** Kurum Ayarları: kurum türü, sınıf seviyesi/alanı ve öğretmen branşı seçenekleri. */
export const ORG_KINDS = ["dershane", "okul", "etut", "kocluk", "diger"] as const;
export type OrgKind = (typeof ORG_KINDS)[number];
export const ORG_KIND_LABELS: Record<OrgKind, string> = { dershane: "Dershane / kurs merkezi", okul: "Okul", etut: "Etüt merkezi", kocluk: "Koçluk merkezi", diger: "Diğer" };
export const CLASS_GRADES = ["9", "10", "11", "12", "Mezun"] as const;
export const CLASS_TRACKS = ["SAY", "EA", "SÖZ", "DİL", "TYT"] as const;
export const CLASS_TRACK_LABELS: Record<(typeof CLASS_TRACKS)[number], string> = { SAY: "Sayısal", EA: "Eşit Ağırlık", "SÖZ": "Sözel", "DİL": "Dil", TYT: "TYT (ortak)" };
export const TEACHER_SUBJECTS = ["Türkçe", "Edebiyat", "Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "Felsefe", "Din Kültürü", "İngilizce", "Rehberlik"] as const;
/** Ayarlar → Roller: her rolün panelde neyi görüp yapabildiği (bilgilendirme; yetki kararı sunucuda). */
export const ROLE_PERMISSIONS: Array<{ role: Exclude<OrgRole, "student">; can: string[] }> = [
  { role: "owner", can: ["Kurum yöneticisinin her şeyi", "Kurumdan çıkarılamaz"] },
  { role: "admin", can: ["Kurum bilgilerini düzenler", "Öğretmen ve koordinatör tanımlar, rol değiştirir, çıkarır", "Tüm öğrencileri ve işlem kayıtlarını görür"] },
  { role: "coordinator", can: ["Tüm öğrencileri görür", "Sınıf tanımlar, öğretmen branşlarını düzenler", "Öğretmenlere öğrenci atar, öğrenci daveti oluşturur"] },
  { role: "teacher", can: ["Yalnızca kendisine atanan öğrencileri görür", "Görev atar, görüşme notu yazar", "Öğrenci daveti oluşturur"] },
];

export const isStaffRole = (role: OrgRole): role is StaffRole => role !== "student";
export const hasRole = (role: OrgRole, minimum: OrgRole) => ROLE_RANK[role] >= ROLE_RANK[minimum];

/** Tüm kurum öğrencilerini (atama gerekmeden) görebilen roller. Öğretmen yalnızca kendisine atananları görür. */
export const seesAllStudents = (role: OrgRole) => hasRole(role, "coordinator");

/**
 * Rol yönetimi: yönetici ve üstü, yalnızca KENDİ rütbesinden düşük bir üyeye,
 * yine kendi rütbesinden düşük bir rol verebilir. Sahiplik devri bu kuralla yapılamaz.
 */
export function canAssignRole(actor: OrgRole, targetCurrent: OrgRole, targetNext: OrgRole): boolean {
  if (!hasRole(actor, "admin")) return false;
  if (targetNext === "owner") return false;
  return ROLE_RANK[targetCurrent] < ROLE_RANK[actor] && ROLE_RANK[targetNext] < ROLE_RANK[actor];
}

/** Davet edebileceği roller: kendinden düşük olanlar; öğretmen ve koordinatör yalnızca öğrenci davet eder. */
export function canInviteRole(actor: OrgRole, role: InvitableRole): boolean {
  if (role === "student") return hasRole(actor, "teacher");
  return hasRole(actor, "admin") && ROLE_RANK[role] < ROLE_RANK[actor];
}

// Karışan karakterler (0/O, 1/I/L) yok; "ABCD-EFGH" biçiminde gösterilir.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function generateInviteCode(random: (max: number) => number): string {
  let code = "";
  for (let index = 0; index < 8; index++) code += CODE_ALPHABET[random(CODE_ALPHABET.length)];
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
/** Kullanıcının yazdığı kodu karşılaştırma biçimine getirir (boşluk/tire yok, büyük harf). */
export const normalizeInviteCode = (code: string) => code.toLocaleUpperCase("en-US").replace(/[^A-Z0-9]/g, "");

export type InvitationState = { revokedAt: Date | null; expiresAt: Date; usedCount: number; maxUses: number };
export function invitationProblem(invitation: InvitationState, now = new Date()): string | null {
  if (invitation.revokedAt) return "Bu davet kodu iptal edilmiş.";
  if (invitation.expiresAt.getTime() <= now.getTime()) return "Bu davet kodunun süresi dolmuş.";
  if (invitation.usedCount >= invitation.maxUses) return "Bu davet kodu kullanım sınırına ulaşmış.";
  return null;
}

// ---------------------------------------------------------------------------
// Öğrenci özeti (liste ve panel): yalnızca okunan veriden hesaplanır.
// ---------------------------------------------------------------------------

export type StudentSignals = {
  exams: Array<{ exam: "TYT" | "AYT"; examDate: Date; net: number }>;
  logs: Array<{ studyDate: Date; minutes: number }>;
  weekSessions: AdherenceSession[];
  weakTopicCount: number;
  lastSignedIn: Date | null;
};

export const RISK_RULES = { inactiveDays: 7, lowAdherence: 40, netDrop: 5 } as const;
export type RiskKey = "inactive" | "low_adherence" | "net_drop";
export const RISK_LABELS: Record<RiskKey, string> = { inactive: "7 gündür etkinlik yok", low_adherence: "Plan uyumu düşük", net_drop: "Net düşüşü" };

export type StudentSummary = {
  lastTyt: { net: number; delta: number | null; date: Date } | null;
  lastAyt: { net: number; delta: number | null; date: Date } | null;
  weekMinutes: number;
  adherence: number | null;
  plannedThisWeek: number;
  weakTopicCount: number;
  lastActivityAt: Date | null;
  risks: RiskKey[];
};

const DAY = 24 * 60 * 60 * 1000;

function latestOf(exams: StudentSignals["exams"], kind: "TYT" | "AYT") {
  const sorted = exams.filter((exam) => exam.exam === kind).sort((a, b) => b.examDate.getTime() - a.examDate.getTime());
  if (!sorted[0]) return null;
  return { net: sorted[0].net, delta: sorted[1] ? Number((sorted[0].net - sorted[1].net).toFixed(2)) : null, date: sorted[0].examDate };
}

export function summarizeStudent(signals: StudentSignals, now = new Date()): StudentSummary {
  const lastTyt = latestOf(signals.exams, "TYT");
  const lastAyt = latestOf(signals.exams, "AYT");
  const weekMinutes = signals.logs.filter((log) => now.getTime() - log.studyDate.getTime() <= 7 * DAY).reduce((sum, log) => sum + log.minutes, 0);
  // Uyum yalnızca bugüne kadar planlanmış oturumlarla hesaplanır (gelecek günler henüz yapılamaz).
  const due = signals.weekSessions.filter((session) => new Date(session.sessionDate).getTime() <= now.getTime());
  const adherence = due.length ? calculatePlanAdherence(due).overallScore : null;
  const lastLog = signals.logs.reduce<Date | null>((latest, log) => (!latest || log.studyDate > latest ? log.studyDate : latest), null);
  const candidates = [lastLog, signals.lastSignedIn].filter((value): value is Date => Boolean(value));
  const lastActivityAt = candidates.length ? new Date(Math.max(...candidates.map((value) => value.getTime()))) : null;

  const risks: RiskKey[] = [];
  if (!lastActivityAt || now.getTime() - lastActivityAt.getTime() > RISK_RULES.inactiveDays * DAY) risks.push("inactive");
  if (adherence !== null && adherence < RISK_RULES.lowAdherence) risks.push("low_adherence");
  if ([lastTyt, lastAyt].some((exam) => exam?.delta !== null && exam?.delta !== undefined && exam.delta <= -RISK_RULES.netDrop)) risks.push("net_drop");
  return { lastTyt, lastAyt, weekMinutes, adherence, plannedThisWeek: due.length, weakTopicCount: signals.weakTopicCount, lastActivityAt, risks };
}
