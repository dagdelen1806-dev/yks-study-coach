import { and, desc, eq, gte, inArray, ne } from "drizzle-orm";
import { parentLinks, studentProfiles, users } from "../../drizzle/schema";
import { MAX_PARENTS_PER_STUDENT, PARENT_CONSENT_VERSION, PARENT_INVITE_DAYS, parentInviteProblem } from "../../shared/parent";
import { getDb } from "../db";

// Veli bağlantıları (bkz. shared/parent.ts). Her fonksiyon kimin adına çalıştığını açıkça alır;
// öğrenci yalnızca kendi bağlantılarını, veli yalnızca kendisine ait bağlantıları değiştirebilir.

export class ParentLinkError extends Error {}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_INVITES_PER_DAY = 5;

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı yok.");
  return db;
}

const displayNameOf = (row: { preferredName: string | null; name: string | null }) => row.preferredName || row.name?.split(" ")[0] || "Öğrenci";

/** Öğrenci yeni bir veli kodu üretir. Kullanılmamış eski kod iptal edilir (aynı anda tek açık kod). */
export async function createParentInvite(studentUserId: number, codeHash: string, now = new Date()) {
  const db = await requireDb();
  const open = await db.select({ id: parentLinks.id, status: parentLinks.status }).from(parentLinks)
    .where(and(eq(parentLinks.studentUserId, studentUserId), inArray(parentLinks.status, ["pending", "active"])));
  if (open.length >= MAX_PARENTS_PER_STUDENT) throw new ParentLinkError(`En fazla ${MAX_PARENTS_PER_STUDENT} veli bağlanabilir. Yeni kod için önce bir veli erişimini kaldır.`);
  // Kod (ve isteğe bağlı davet e-postası) üretimi sınırlı: başkasının adresine e-posta yağdırılamasın.
  const recent = await db.select({ id: parentLinks.id }).from(parentLinks)
    .where(and(eq(parentLinks.studentUserId, studentUserId), gte(parentLinks.createdAt, new Date(now.getTime() - DAY_MS))));
  if (recent.length >= MAX_INVITES_PER_DAY) throw new ParentLinkError("Bugün yeterince kod ürettin; yarın yeniden deneyebilirsin.");
  await db.update(parentLinks).set({ status: "revoked", revokedAt: now })
    .where(and(eq(parentLinks.studentUserId, studentUserId), eq(parentLinks.status, "invited")));
  const expiresAt = new Date(now.getTime() + PARENT_INVITE_DAYS * DAY_MS);
  const [row] = await db.insert(parentLinks).values({ studentUserId, codeHash, status: "invited", expiresAt }).returning({ id: parentLinks.id });
  return { id: row.id, expiresAt };
}

/** Veli kodu girer: bağlantı öğrencinin onayını bekler (pending). Rıza metni onayı zorunludur. */
export async function redeemParentInvite(parentUserId: number, codeHash: string, now = new Date()) {
  const db = await requireDb();
  const [link] = await db.select().from(parentLinks).where(eq(parentLinks.codeHash, codeHash)).limit(1);
  const problem = parentInviteProblem(link, now);
  if (problem) throw new ParentLinkError(problem);
  if (link.studentUserId === parentUserId) throw new ParentLinkError("Kendi kodunu veli olarak kullanamazsın; kodu velinle paylaş.");
  const [existing] = await db.select({ id: parentLinks.id }).from(parentLinks)
    .where(and(eq(parentLinks.studentUserId, link.studentUserId), eq(parentLinks.parentUserId, parentUserId), inArray(parentLinks.status, ["pending", "active"]))).limit(1);
  if (existing) throw new ParentLinkError("Bu öğrenciye zaten bağlısın ya da isteğin onay bekliyor.");
  // Yarışta iki kişi aynı kodu girerse yalnızca ilki kazanır (status hâlâ invited olmalı).
  const updated = await db.update(parentLinks)
    .set({ parentUserId, status: "pending", parentConsentAt: now, parentConsentVersion: PARENT_CONSENT_VERSION })
    .where(and(eq(parentLinks.id, link.id), eq(parentLinks.status, "invited")))
    .returning({ id: parentLinks.id });
  if (!updated.length) throw new ParentLinkError("Bu kod daha önce kullanılmış. Öğrenciden yeni bir kod isteyebilirsin.");
  return { linkId: link.id, studentUserId: link.studentUserId };
}

/** Öğrenci bekleyen bir veli isteğini onaylar ya da reddeder. */
export async function decideParentRequest(studentUserId: number, linkId: number, approve: boolean, now = new Date()) {
  const db = await requireDb();
  const updated = await db.update(parentLinks)
    .set(approve ? { status: "active", studentApprovedAt: now } : { status: "revoked", revokedAt: now })
    .where(and(eq(parentLinks.id, linkId), eq(parentLinks.studentUserId, studentUserId), eq(parentLinks.status, "pending")))
    .returning({ id: parentLinks.id });
  if (!updated.length) throw new ParentLinkError("Bu istek bulunamadı ya da zaten yanıtlandı.");
}

/** Öğrenci ya da veli bağlantıyı kapatır (yalnızca kendi tarafındaki bağlantıyı). */
export async function revokeParentLink(actor: { userId: number; side: "student" | "parent" }, linkId: number, now = new Date()) {
  const db = await requireDb();
  const owner = actor.side === "student" ? eq(parentLinks.studentUserId, actor.userId) : eq(parentLinks.parentUserId, actor.userId);
  const updated = await db.update(parentLinks).set({ status: "revoked", revokedAt: now })
    .where(and(eq(parentLinks.id, linkId), owner, ne(parentLinks.status, "revoked")))
    .returning({ id: parentLinks.id });
  if (!updated.length) throw new ParentLinkError("Bu bağlantı bulunamadı.");
}

/** Öğrencinin gördüğü liste: açık kod, bekleyen istekler ve bağlı veliler (veli adı + e-postası). */
export async function listLinksForStudent(studentUserId: number, now = new Date()) {
  const db = await requireDb();
  const rows = await db.select({ id: parentLinks.id, status: parentLinks.status, expiresAt: parentLinks.expiresAt, createdAt: parentLinks.createdAt, parentConsentAt: parentLinks.parentConsentAt, studentApprovedAt: parentLinks.studentApprovedAt, parentName: users.name, parentEmail: users.email })
    .from(parentLinks).leftJoin(users, eq(users.id, parentLinks.parentUserId))
    .where(and(eq(parentLinks.studentUserId, studentUserId), ne(parentLinks.status, "revoked")))
    .orderBy(desc(parentLinks.createdAt));
  return rows
    .filter((row) => row.status !== "invited" || row.expiresAt.getTime() > now.getTime())
    .map((row) => ({ ...row, parentName: row.parentName ?? null, parentEmail: row.parentEmail ?? null }));
}

/** Velinin gördüğü liste: bağlı (ve onay bekleyen) öğrenciler. */
export async function listLinksForParent(parentUserId: number) {
  const db = await requireDb();
  const rows = await db.select({ id: parentLinks.id, studentUserId: parentLinks.studentUserId, status: parentLinks.status, weeklyDigestOptOut: parentLinks.weeklyDigestOptOut, name: users.name, preferredName: studentProfiles.preferredName })
    .from(parentLinks)
    .innerJoin(users, eq(users.id, parentLinks.studentUserId))
    .leftJoin(studentProfiles, eq(studentProfiles.userId, parentLinks.studentUserId))
    .where(and(eq(parentLinks.parentUserId, parentUserId), inArray(parentLinks.status, ["pending", "active"])))
    .orderBy(desc(parentLinks.createdAt));
  return rows.map((row) => ({ id: row.id, studentUserId: row.studentUserId, status: row.status, weeklyDigest: row.weeklyDigestOptOut === 0, studentName: displayNameOf({ preferredName: row.preferredName ?? null, name: row.name }) }));
}

/** Velinin bu öğrenciyle AKTİF (öğrencinin onayladığı) bağlantısı; yoksa null. */
export async function findActiveLink(parentUserId: number, studentUserId: number) {
  const db = await requireDb();
  const [row] = await db.select({ id: parentLinks.id, status: parentLinks.status }).from(parentLinks)
    .where(and(eq(parentLinks.parentUserId, parentUserId), eq(parentLinks.studentUserId, studentUserId), eq(parentLinks.status, "active"))).limit(1);
  return row ?? null;
}

export async function studentDisplayName(studentUserId: number) {
  const db = await requireDb();
  const [row] = await db.select({ name: users.name, preferredName: studentProfiles.preferredName }).from(users)
    .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id)).where(eq(users.id, studentUserId)).limit(1);
  return row ? displayNameOf({ preferredName: row.preferredName ?? null, name: row.name }) : "Öğrenci";
}

export async function setParentDigestEnabled(parentUserId: number, linkId: number, enabled: boolean) {
  const db = await requireDb();
  const updated = await db.update(parentLinks).set({ weeklyDigestOptOut: enabled ? 0 : 1 })
    .where(and(eq(parentLinks.id, linkId), eq(parentLinks.parentUserId, parentUserId))).returning({ id: parentLinks.id });
  if (!updated.length) throw new ParentLinkError("Bu bağlantı bulunamadı.");
  return enabled;
}

/** Abonelikten çıkma bağlantısı (oturumsuz): jetondaki bağlantı id'si. */
export async function disableParentDigestByLinkId(linkId: number) {
  const db = await requireDb();
  await db.update(parentLinks).set({ weeklyDigestOptOut: 1 }).where(eq(parentLinks.id, linkId));
}
