/**
 * Kurum Paneli'ni yerelde denemek için örnek kurum: 1 yönetici, 2 öğretmen, 6 öğrenci,
 * 2 sınıf, öğretmen atamaları ve birkaç görüşme notu. Öğrencilerin çalışma verisi
 * seed-test-student.ts ile yazılır; biri "takip gerekiyor" görünsün diye son haftası boşaltılır.
 * Yalnızca @test.local hesapları kullanır; aynı kısa adlı kurumu silip baştan kurar.
 * Tüm hesapların şifresi: test1234
 *
 * Kullanım (repo kökünden): npx tsx --env-file=.env scripts/seed-test-org.ts
 */
import { execFileSync } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "../server/db";
import { parseIdentifier } from "../server/_core/loginIdentifier";
import { classStudents, counselingNotes, organizationCreditUsage, organizationAuditLogs, organizationClasses, organizationInvitations, organizationMembers, organizations, studentProfiles, teacherAssignments, topicStudyLogs, users } from "../drizzle/schema";

const SLUG = "test-dershanesi";
const PASSWORD = "test1234";
const staff = [
  { email: "kurum.admin@test.local", name: "Selin Yönetici", role: "admin" as const },
  { email: "ogretmen1@test.local", name: "Murat Hoca", role: "teacher" as const },
  { email: "ogretmen2@test.local", name: "Ayşe Hoca", role: "teacher" as const },
];
const students = [
  { email: "ogrenci1@test.local", name: "Ece", avatar: "girl" },
  { email: "ogrenci2@test.local", name: "Kerem", avatar: "boy" },
  { email: "ogrenci3@test.local", name: "Zeynep", avatar: "girl" },
  { email: "ogrenci4@test.local", name: "Arda", avatar: "boy" },
  { email: "ogrenci5@test.local", name: "Defne", avatar: "girl" },
  { email: "ogrenci6@test.local", name: "Emir", avatar: "boy" },
];

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
    const result = await db.insert(users).values({ openId: identifier.openId, name, email, loginMethod: "dev_email", passwordHash: hashPassword(PASSWORD), approvalStatus: "approved", approvedAt: new Date(), emailVerifiedAt: new Date(), lastSignedIn: new Date() });
    return Number(result[0].insertId);
  };

  // Eski test kurumunu tümüyle sil.
  const [old] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, SLUG)).limit(1);
  if (old) {
    const classIds = (await db.select({ id: organizationClasses.id }).from(organizationClasses).where(eq(organizationClasses.orgId, old.id))).map((row) => row.id);
    if (classIds.length) await db.delete(classStudents).where(inArray(classStudents.classId, classIds));
    for (const table of [organizationClasses, teacherAssignments, counselingNotes, organizationInvitations, organizationAuditLogs, organizationMembers, organizationCreditUsage]) await db.delete(table).where(eq(table.orgId, old.id));
    await db.delete(organizations).where(eq(organizations.id, old.id));
  }

  const orgResult = await db.insert(organizations).values({ name: "Test Dershanesi", slug: SLUG, plan: "standard", membershipStartsAt: new Date(), membershipEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), aiCreditsMonthly: 5000, city: "Ankara", district: "Çankaya", contactEmail: "kvkk@test.local" });
  const orgId = Number(orgResult[0].insertId);

  const staffIds: Record<string, number> = {};
  for (const person of staff) {
    const userId = await ensureUser(person.email, person.name);
    staffIds[person.email] = userId;
    await db.insert(organizationMembers).values({ orgId, userId, role: person.role, status: "active" });
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

  const sayClass = Number((await db.insert(organizationClasses).values({ orgId, name: "12-A Sayısal", gradeLevel: "12" }))[0].insertId);
  const eaClass = Number((await db.insert(organizationClasses).values({ orgId, name: "12-B Eşit Ağırlık", gradeLevel: "12" }))[0].insertId);
  await db.insert(classStudents).values([...studentIds.slice(0, 3).map((id) => ({ classId: sayClass, studentUserId: id })), ...studentIds.slice(3).map((id) => ({ classId: eaClass, studentUserId: id }))]);

  const murat = staffIds["ogretmen1@test.local"];
  const ayse = staffIds["ogretmen2@test.local"];
  await db.insert(teacherAssignments).values([...studentIds.slice(0, 3).map((id) => ({ orgId, teacherUserId: murat, studentUserId: id, active: 1 })), ...studentIds.slice(3).map((id) => ({ orgId, teacherUserId: ayse, studentUserId: id, active: 1 }))]);

  await db.insert(counselingNotes).values([
    { orgId, studentUserId: studentIds[0], authorUserId: murat, body: "Problemlerde yanlış sayısı yüksek; bu hafta günde 20 problem sorusu çözmesini konuştuk.", visibility: "staff" },
    { orgId, studentUserId: studentIds[0], authorUserId: murat, body: "Paragraf netlerin çok iyi gidiyor, aynen devam! Bu hafta problemlere biraz daha ağırlık verelim.", visibility: "student" },
    { orgId, studentUserId: riskId, authorUserId: ayse, body: "Bir haftadır uygulamaya giriş yok; veliyle görüşülecek.", visibility: "staff" },
  ]);

  // Bu ay kurum kredisinden yapılmış örnek AI işlemleri (Ayarlar → Üyelik ve krediler).
  const usage = [[0, "NOTE_AI", 2, 14], [0, "NOTE_VOICE", 1, 9], [1, "AI_STUDY_PLAN", 5, 3], [2, "OCR_BOOK_IMPORT", 3, 4], [3, "NOTE_AI", 2, 6]] as const;
  await db.insert(organizationCreditUsage).values(usage.flatMap(([index, featureKey, credits, times]) => Array.from({ length: times }, () => ({ orgId, userId: studentIds[index], featureKey, credits }))));

  console.log(`\nKurum hazır (id ${orgId}). Şifre: ${PASSWORD}`);
  console.log(`  Yönetici: ${staff[0].email}\n  Öğretmenler: ${staff[1].email} (12-A), ${staff[2].email} (12-B)\n  Öğrenciler: ${students.map((student) => student.email).join(", ")}`);
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
