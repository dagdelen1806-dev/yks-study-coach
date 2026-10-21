import type { FeatureKey } from "./entitlements";
import { calculatePlanAdherence, type AdherenceSession } from "./planAdherence";
import { EXAM_KINDS, EXAM_TRACK_LABELS, EXAM_TRACKS, type ExamKind } from "./exams";

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
export const CLASS_GRADES = ["7", "8", "9", "10", "11", "12", "Mezun"] as const;
// Sınıf alanı: YKS'nin puan türleri + diğer her sınavın adı (yeni sınav kendiliğinden eklenir).
const YKS_CLASS_TRACKS = ["SAY", "EA", "SÖZ", "DİL", "TYT"] as const;
export const CLASS_TRACKS = [...YKS_CLASS_TRACKS, ...EXAM_TRACKS.filter((track) => track !== "YKS")] as const;
export const CLASS_TRACK_LABELS: Record<string, string> = { SAY: "Sayısal", EA: "Eşit Ağırlık", "SÖZ": "Sözel", "DİL": "Dil", TYT: "TYT (ortak)", ...EXAM_TRACK_LABELS };
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
  exams: Array<{ exam: ExamKind; examDate: Date; net: number }>;
  logs: Array<{ studyDate: Date; minutes: number }>;
  weekSessions: AdherenceSession[];
  weakTopicCount: number;
  lastSignedIn: Date | null;
};

// --- Kurum üyeliği (paket + süre) ve AI kredi havuzu --------------------------

export const ORG_PLANS = ["trial", "standard", "pro"] as const;
export type OrgPlan = (typeof ORG_PLANS)[number];
export const ORG_PLAN_LABELS: Record<OrgPlan, string> = { trial: "Deneme", standard: "Standart", pro: "Pro" };
/** Platform yöneticisinin kurum oluştururken / paketi değiştirirken önerilen aylık AI kredisi (elle değiştirilebilir). */
export const ORG_PLAN_DEFAULT_CREDITS: Record<OrgPlan, number> = { trial: 500, standard: 5000, pro: 20000 };

export const ORG_PLAN_RANK: Record<OrgPlan, number> = { trial: 0, standard: 1, pro: 2 };
export const ORG_PLAN_DESCRIPTIONS: Record<OrgPlan, string[]> = {
  trial: ["30 gün", "Kurum paneli ve tüm yönetim araçları", "Küçük bir AI kredi havuzu ile deneme"],
  standard: ["1 yıl", "Kurum paneli ve tüm yönetim araçları", "Orta ölçekli kurum için aylık AI kredisi"],
  pro: ["1 yıl", "Kurum paneli ve tüm yönetim araçları", "Yoğun AI kullanımı için en geniş kredi havuzu"],
};
/** Talep edilebilir paket: daha üst paket ya da (deneme dışında) aynı paketin süre uzatması. Düşürme yok. */
export function canRequestPlan(current: OrgPlan, requested: OrgPlan): boolean {
  if (requested === "trial") return false;
  return ORG_PLAN_RANK[requested] >= ORG_PLAN_RANK[current];
}
/** Onaylanan talepte yeni bitiş: mevcut süre bitmediyse onun üstüne, bittiyse bugünden itibaren 1 yıl. */
export function renewedMembershipEnd(currentEnd: Date | null, now = new Date()): Date {
  const base = currentEnd && currentEnd.getTime() > now.getTime() ? new Date(currentEnd) : new Date(now);
  base.setFullYear(base.getFullYear() + 1);
  return base;
}

/** Bir AI işleminin kurum havuzundan düşürdüğü kredi (maliyeti yüksek işlem = daha çok kredi). */
export const ORG_CREDIT_COSTS: Partial<Record<FeatureKey, number>> = {
  NOTE_VOICE: 1,
  NOTE_OCR: 2,
  NOTE_AI: 2,
  OCR_EXAM_IMPORT: 3,
  OCR_BOOK_IMPORT: 3,
  AI_STUDY_PLAN: 5,
};
export const ORG_CREDIT_FEATURE_LABELS: Partial<Record<FeatureKey, string>> = {
  NOTE_VOICE: "Sesli not",
  NOTE_OCR: "Fotoğraftan metin",
  NOTE_AI: "Soru çözümü ve AI araçları",
  OCR_EXAM_IMPORT: "Belgeden deneme aktarımı",
  OCR_BOOK_IMPORT: "Kitap/kaynak okuma",
  AI_STUDY_PLAN: "AI çalışma planı",
};

export type MembershipState = "active" | "not_started" | "expired";
/** Kurum üyeliğinin bugünkü durumu; tarih girilmemişse süresiz sayılır. Bitiş günü dahil (gün sonuna kadar). */
export function membershipState(org: { membershipStartsAt: Date | string | null; membershipEndsAt: Date | string | null }, now = new Date()): MembershipState {
  if (org.membershipStartsAt && new Date(org.membershipStartsAt).getTime() > now.getTime()) return "not_started";
  if (org.membershipEndsAt) {
    const end = new Date(org.membershipEndsAt); end.setHours(23, 59, 59, 999);
    if (end.getTime() < now.getTime()) return "expired";
  }
  return "active";
}

/** Kredi dönemi: içinde bulunulan takvim ayı (her ayın ilk günü yenilenir). */
export function creditPeriodStart(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export type CreditDecision = { ok: true } | { ok: false; reason: "no_pool" | "pool_empty" | "student_cap" };
/** İşlem kurum havuzundan karşılanabilir mi? Karşılanamazsa öğrencinin kendi kotası devreye girer. */
export function creditDecision(input: { monthly: number; usedByOrg: number; cap: number | null; usedByStudent: number; cost: number }): CreditDecision {
  if (input.monthly <= 0) return { ok: false, reason: "no_pool" };
  if (input.usedByOrg + input.cost > input.monthly) return { ok: false, reason: "pool_empty" };
  if (input.cap !== null && input.usedByStudent + input.cost > input.cap) return { ok: false, reason: "student_cap" };
  return { ok: true };
}

export const RISK_RULES = { inactiveDays: 7, lowAdherence: 40, netDrop: 5 } as const;
export type RiskKey = "inactive" | "low_adherence" | "net_drop";
export const RISK_LABELS: Record<RiskKey, string> = { inactive: "7 gündür etkinlik yok", low_adherence: "Plan uyumu düşük", net_drop: "Net düşüşü" };

export type LastExam = { net: number; delta: number | null; date: Date };
export type StudentSummary = {
  lastTyt: LastExam | null;
  lastAyt: LastExam | null;
  /** Her sınav türünün (TYT, AYT, LGS, ileride KPSS…) son denemesi; denemesi olmayan tür yok. */
  lastByKind: Partial<Record<ExamKind, LastExam>>;
  weekMinutes: number;
  adherence: number | null;
  plannedThisWeek: number;
  weakTopicCount: number;
  lastActivityAt: Date | null;
  risks: RiskKey[];
};

const DAY = 24 * 60 * 60 * 1000;

function latestOf(exams: StudentSignals["exams"], kind: ExamKind) {
  const sorted = exams.filter((exam) => exam.exam === kind).sort((a, b) => b.examDate.getTime() - a.examDate.getTime());
  if (!sorted[0]) return null;
  return { net: sorted[0].net, delta: sorted[1] ? Number((sorted[0].net - sorted[1].net).toFixed(2)) : null, date: sorted[0].examDate };
}

export function summarizeStudent(signals: StudentSignals, now = new Date()): StudentSummary {
  const lastByKind: Partial<Record<ExamKind, LastExam>> = {};
  for (const kind of EXAM_KINDS) { const last = latestOf(signals.exams, kind); if (last) lastByKind[kind] = last; }
  const lastTyt = lastByKind.TYT ?? null;
  const lastAyt = lastByKind.AYT ?? null;
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
  if (Object.values(lastByKind).some((exam) => exam.delta !== null && exam.delta <= -RISK_RULES.netDrop)) risks.push("net_drop");
  return { lastTyt, lastAyt, lastByKind, weekMinutes, adherence, plannedThisWeek: due.length, weakTopicCount: signals.weakTopicCount, lastActivityAt, risks };
}
