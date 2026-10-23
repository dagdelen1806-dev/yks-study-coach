/**
 * Kurum Paneli'ni yerelde denemek için örnek kurum: 1 yönetici, 2 öğretmen, 6 öğrenci,
 * 2 sınıf, öğretmen atamaları ve birkaç görüşme notu; ayrıca kurumsuz bir LGS öğrencisi ve
 * (veli paneli için) bir veli hesabı. Öğrencilerin çalışma verisi
 * seed-test-student.ts ile yazılır; biri "takip gerekiyor" görünsün diye son haftası boşaltılır.
 * Yalnızca @test.local hesapları kullanır; aynı kısa adlı kurumu silip baştan kurar.
 * Tüm hesapların şifresi: test1234
 *
 * Kullanım (repo kökünden): npx tsx --env-file=.env scripts/seed-test-org.ts
 */
import { execFileSync } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../server/db";
import { parseIdentifier } from "../server/_core/loginIdentifier";
import { academicCases, caseActions, caseEvaluations, caseEvidence, classStudents, classTimetableSlots, counselingNotes, featureUsageLogs, organizationCreditUsage, organizationAuditLogs, organizationClasses, organizationInvitations, organizationMembers, organizations, parentLinks, payments, studentExamTracks, studentProfiles, subscriptions, teacherAssignments, topicStudyLogs, userMockExams, users } from "../drizzle/schema";

const SLUG = "test-dershanesi";
// Tanıtım (canlı veritabanı) için: SEED_PASSWORD güçlü bir şifre, SEED_ORG_NAME kurum adı, SEED_NO_EMAIL=1
// bu hesaplara hiçbir özet e-postası gitmesin (adresler @test.local, var olmayan alan adı).
const PASSWORD = process.env.SEED_PASSWORD || "test1234";
const ORG_NAME = process.env.SEED_ORG_NAME || "Test Dershanesi";
if (/supabase\.(co|com)/.test(process.env.DATABASE_URL ?? "") && PASSWORD.length < 12) throw new Error("Canlı veritabanında en az 12 karakterlik SEED_PASSWORD gerekli (test1234 kullanılamaz).");
const staff = [
  { email: "kurum.admin@test.local", name: "Selin Yönetici", role: "admin" as const, subject: null },
  { email: "ogretmen1@test.local", name: "Murat Hoca", role: "teacher" as const, subject: "Matematik" },
  { email: "ogretmen2@test.local", name: "Ayşe Hoca", role: "teacher" as const, subject: "Türkçe" },
  // Hiç öğrenci atanmamış; 12-A'nın sorumlu öğretmeni olduğu için o sınıfı görür.
  { email: "ogretmen3@test.local", name: "Kenan Hoca", role: "teacher" as const, subject: "Fizik" },
];
const students = [
  { email: "ogrenci1@test.local", name: "Ece", avatar: "girl" },
  { email: "ogrenci2@test.local", name: "Kerem", avatar: "boy" },
  { email: "ogrenci3@test.local", name: "Zeynep", avatar: "girl" },
  { email: "ogrenci4@test.local", name: "Arda", avatar: "boy" },
  { email: "ogrenci5@test.local", name: "Defne", avatar: "girl" },
  { email: "ogrenci6@test.local", name: "Emir", avatar: "boy" },
];

const LGS_STUDENT = { email: "lgs1@test.local", name: "Mert" };
const PARENT = { email: "veli1@test.local", name: "Ayten Veli" };
const KPSS_CANDIDATE = { email: "kpss1@test.local", name: "Burak Aday" };
const AGS_CANDIDATE = { email: "ags1@test.local", name: "Elif Öğretmen Adayı" };

// localAuth.ts ile aynı scrypt biçimi (tuz:anahtar).
const hashPassword = (password: string) => { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`; };

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB yok");

  const ensureUser = async (email: string, name: string) => {
    const identifier = parseIdentifier(email);
    if (identifier?.kind !== "email" || !email.endsWith("@test.local")) throw new Error(`Yalnızca @test.local: ${email}`);
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.openId, identifier.openId)).limit(1);
    if (existing) {
      await db.update(users).set({ name, approvalStatus: "approved", emailVerifiedAt: new Date(), passwordHash: hashPassword(PASSWORD) }).where(eq(users.id, existing.id));
      return existing.id;
    }
    const result = await db.insert(users).values({ openId: identifier.openId, name, email, loginMethod: "dev_email", passwordHash: hashPassword(PASSWORD), approvalStatus: "approved", approvedAt: new Date(), emailVerifiedAt: new Date(), lastSignedIn: new Date() }).returning({ id: users.id });
    return Number(result[0].id);
  };

  // Eski test kurumunu tümüyle sil.
  const [old] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, SLUG)).limit(1);
  if (old) {
    const classIds = (await db.select({ id: organizationClasses.id }).from(organizationClasses).where(eq(organizationClasses.orgId, old.id))).map((row) => row.id);
    if (classIds.length) await db.delete(classStudents).where(inArray(classStudents.classId, classIds));
    for (const table of [caseEvidence, caseActions, caseEvaluations, academicCases, classTimetableSlots, organizationClasses, teacherAssignments, counselingNotes, organizationInvitations, organizationAuditLogs, organizationMembers, organizationCreditUsage]) await db.delete(table).where(eq(table.orgId, old.id));
    await db.delete(organizations).where(eq(organizations.id, old.id));
  }

  const orgResult = await db.insert(organizations).values({ name: ORG_NAME, slug: SLUG, plan: "standard", membershipStartsAt: new Date(), membershipEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), aiCreditsMonthly: 5000, academicCasesEnabled: 1, city: "Ankara", district: "Çankaya", contactEmail: "kvkk@test.local" }).returning({ id: organizations.id });
  const orgId = Number(orgResult[0].id);

  const staffIds: Record<string, number> = {};
  for (const person of staff) {
    const userId = await ensureUser(person.email, person.name);
    staffIds[person.email] = userId;
    await db.insert(organizationMembers).values({ orgId, userId, role: person.role, status: "active", subject: person.subject });
  }

  const studentIds: number[] = [];
  for (const student of students) {
    const userId = await ensureUser(student.email, `${student.name} Test`);
    studentIds.push(userId);
    console.log(`Öğrenci verisi: ${student.email}`);
    execFileSync("npx", ["tsx", "--env-file=.env", "scripts/seed-test-student.ts", student.email, student.name, student.avatar], { stdio: "inherit", shell: true });
    await db.insert(organizationMembers).values({ orgId, userId, role: "student", status: "active", consentAt: new Date(), kvkkVersion: 1, invitedBy: staffIds["kurum.admin@test.local"] });
  }
  // Emir: son haftada hiç çalışmamış → "7 gündür etkinlik yok" riski.
  const riskId = studentIds[5];
  await db.delete(topicStudyLogs).where(eq(topicStudyLogs.userId, riskId));
  await db.update(users).set({ lastSignedIn: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }).where(eq(users.id, riskId));
  const existingProfile = await db.select({ userId: studentProfiles.userId }).from(studentProfiles).where(eq(studentProfiles.userId, riskId)).limit(1);
  if (!existingProfile.length) throw new Error("Öğrenci profili yazılmadı");

  const sayClass = (await db.insert(organizationClasses).values({ orgId, name: "12-A Sayısal", gradeLevel: "12" }).returning({ id: organizationClasses.id }))[0].id;
  const eaClass = (await db.insert(organizationClasses).values({ orgId, name: "12-B Eşit Ağırlık", gradeLevel: "12" }).returning({ id: organizationClasses.id }))[0].id;
  await db.insert(classStudents).values([...studentIds.slice(0, 3).map((id) => ({ classId: sayClass, studentUserId: id })), ...studentIds.slice(3).map((id) => ({ classId: eaClass, studentUserId: id }))]);

  // Akademik takip örneği (Novara Rehber): Zeynep (12-A, sorumlusu Kenan Hoca) son üç TYT'de 82 → 76 → 69.
  const zeynep = studentIds[2];
  await db.delete(userMockExams).where(and(eq(userMockExams.userId, zeynep), eq(userMockExams.exam, "TYT")));
  const tytDay = (daysAgo: number) => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  await db.insert(userMockExams).values([[35, 82], [21, 76], [7, 69]].map(([daysAgo, net], index) => ({
    userId: zeynep, title: `TYT Genel Deneme ${index + 4}`, exam: "TYT" as const, examDate: tytDay(daysAgo), net: net.toFixed(2), delta: index ? (net - [82, 76][index - 1]).toFixed(2) : "0",
    subjectsJson: JSON.stringify({ Türkçe: [31, 30, 29][index], Matematik: [28, 25, 21][index], Fen: [11, 10, 9][index], Sosyal: [12, 11, 10][index] }), timeSpentJson: "{}", topicNetsJson: "{}", topicDetailsJson: "[]",
  })));

  const murat = staffIds["ogretmen1@test.local"];
  const ayse = staffIds["ogretmen2@test.local"];
  const kenan = staffIds["ogretmen3@test.local"];
  await db.update(organizationClasses).set({ advisorUserId: kenan }).where(eq(organizationClasses.id, sayClass));
  await db.update(organizationClasses).set({ advisorUserId: ayse }).where(eq(organizationClasses.id, eaClass));
  // Ders programı: hafta içi akşam ve cumartesi; öğretmen iki sınıfa aynı saatte girmez.
  const lesson = (classId: number, dayOfWeek: number, startTime: string, endTime: string, subject: string, teacherUserId: number, room: string) => ({ orgId, classId, dayOfWeek, startTime, endTime, subject, teacherUserId, room });
  await db.insert(classTimetableSlots).values([
    lesson(sayClass, 2, "16:30", "17:10", "Matematik", murat, "A-101"), lesson(sayClass, 2, "17:20", "18:00", "Fizik", kenan, "A-101"),
    lesson(sayClass, 4, "16:30", "17:10", "Fizik", kenan, "A-101"), lesson(sayClass, 4, "17:20", "18:00", "Türkçe", ayse, "A-101"),
    lesson(sayClass, 6, "09:00", "09:40", "Matematik", murat, "A-101"), lesson(sayClass, 6, "09:50", "10:30", "Geometri", murat, "A-101"),
    lesson(eaClass, 2, "16:30", "17:10", "Türkçe", ayse, "B-203"), lesson(eaClass, 2, "17:20", "18:00", "Matematik", murat, "B-203"),
    lesson(eaClass, 4, "16:30", "17:10", "Matematik", murat, "B-203"), lesson(eaClass, 6, "09:00", "09:40", "Türkçe", ayse, "B-203"),
  ]);
  await db.insert(teacherAssignments).values([...studentIds.slice(0, 3).map((id) => ({ orgId, teacherUserId: murat, studentUserId: id, active: 1 })), ...studentIds.slice(3).map((id) => ({ orgId, teacherUserId: ayse, studentUserId: id, active: 1 }))]);

  await db.insert(counselingNotes).values([
    { orgId, studentUserId: studentIds[0], authorUserId: murat, body: "Problemlerde yanlış sayısı yüksek; bu hafta günde 20 problem sorusu çözmesini konuştuk.", visibility: "staff" },
    { orgId, studentUserId: studentIds[0], authorUserId: murat, body: "Paragraf netlerin çok iyi gidiyor, aynen devam! Bu hafta problemlere biraz daha ağırlık verelim.", visibility: "student" },
    { orgId, studentUserId: riskId, authorUserId: ayse, body: "Bir haftadır uygulamaya giriş yok; veliyle görüşülecek.", visibility: "staff" },
  ]);

  // Bu ay kurum kredisinden yapılmış örnek AI işlemleri (Ayarlar → Üyelik ve krediler).
  const usage = [[0, "NOTE_AI", 2, 14], [0, "NOTE_VOICE", 1, 9], [1, "AI_STUDY_PLAN", 5, 3], [2, "OCR_BOOK_IMPORT", 3, 4], [3, "NOTE_AI", 2, 6]] as const;
  await db.insert(organizationCreditUsage).values(usage.flatMap(([index, featureKey, credits, times]) => Array.from({ length: times }, () => ({ orgId, userId: studentIds[index], featureKey, credits }))));

  // LGS öğrencisi (anketi bitmiş, 8. sınıf, verisi yok) ve henüz bağlanmamış bir veli hesabı.
  const lgsId = await ensureUser(LGS_STUDENT.email, `${LGS_STUDENT.name} Test`);
  const parentId = await ensureUser(PARENT.email, PARENT.name);
  await db.delete(parentLinks).where(inArray(parentLinks.studentUserId, [lgsId, ...studentIds]));
  await db.delete(parentLinks).where(eq(parentLinks.parentUserId, parentId));
  // KPSS adayı: anketi hiç doldurmamış (e2e anketi baştan yürütür).
  const kpssId = await ensureUser(KPSS_CANDIDATE.email, KPSS_CANDIDATE.name);
  await db.delete(studentProfiles).where(inArray(studentProfiles.userId, [lgsId, parentId, kpssId]));
  await db.delete(userMockExams).where(eq(userMockExams.userId, lgsId));
  await db.insert(studentProfiles).values({ userId: lgsId, onboardingCompleted: 1, onboardingStep: 4, preferredName: LGS_STUDENT.name, avatarStyle: "boy", examTrack: "LGS", gradeLevel: "8", examYear: new Date().getFullYear() + 1, targetGoal: "Fen Lisesi", targetScore: "450", dailyStudyDuration: 90, preferredStudyStartTime: "16:00" });

  // Öğretmen adayı: KPSS ve MEB-AGS'ye hazırlanıyor, hiç aboneliği yok (sınav başına abonelik ve paket indirimi).
  const agsId = await ensureUser(AGS_CANDIDATE.email, AGS_CANDIDATE.name);
  for (const table of [featureUsageLogs, payments, subscriptions, studentExamTracks, studentProfiles]) await db.delete(table).where(eq(table.userId, agsId));
  const agsYear = new Date().getFullYear() + 1;
  await db.insert(studentProfiles).values({ userId: agsId, onboardingCompleted: 1, onboardingStep: 4, preferredName: AGS_CANDIDATE.name, examTrack: "KPSS", gradeLevel: "lisans_mezun", examYear: agsYear + (agsYear % 2), dailyStudyDuration: 120, preferredStudyStartTime: "19:00" });
  await db.insert(studentExamTracks).values([
    { userId: agsId, track: "KPSS", gradeLevel: "lisans_mezun", examYear: agsYear + (agsYear % 2) },
    { userId: agsId, track: "MEB_AGS", gradeLevel: "lisans_mezun", examYear: agsYear },
  ]);

  if (process.env.SEED_NO_EMAIL === "1") {
    // Deneme hesapları @test.local: hiçbir haftalık özet e-postası denenmesin (geri dönen mail gönderici itibarını bozar).
    const seededIds = [...Object.values(staffIds), ...studentIds, lgsId, parentId, kpssId, agsId];
    await db.update(organizationMembers).set({ weeklyDigestOptOut: 1 }).where(eq(organizationMembers.orgId, orgId));
    await db.update(studentProfiles).set({ weeklyDigestOptOut: 1 }).where(inArray(studentProfiles.userId, seededIds));
    await db.update(parentLinks).set({ weeklyDigestOptOut: 1 }).where(inArray(parentLinks.parentUserId, seededIds));
    console.log("E-posta: bu hesapların tüm haftalık özetleri kapatıldı.");
  }
  console.log(`\nKurum hazır (id ${orgId}). Şifre: ${process.env.SEED_PASSWORD ? "(SEED_PASSWORD)" : PASSWORD}`);
  console.log(`  LGS öğrencisi: ${LGS_STUDENT.email} · Veli: ${PARENT.email} · KPSS + MEB-AGS adayı: ${AGS_CANDIDATE.email}`);
  console.log(`  Yönetici: ${staff[0].email}\n  Öğretmenler: ${staff[1].email} (Matematik), ${staff[2].email} (Türkçe, 12-B sorumlusu), ${staff[3].email} (Fizik, 12-A sorumlusu)\n  Öğrenciler: ${students.map((student) => student.email).join(", ")}`);
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
