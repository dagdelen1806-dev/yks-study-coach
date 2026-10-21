import { desc, eq } from "drizzle-orm";
import { testimonials, users } from "../../drizzle/schema";
import type { PublicTestimonial, TestimonialStatus } from "../../shared/testimonials";
import { getDb } from "../db";

/** Tanıtım sayfası: yalnızca onaylanmış yorumlar, en yeniler önce; kişisel bilgi döndürmez. */
export async function listPublishedTestimonials(limit = 9): Promise<PublicTestimonial[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: testimonials.id, displayName: testimonials.displayName, detail: testimonials.detail, rating: testimonials.rating, body: testimonials.body })
    .from(testimonials)
    .where(eq(testimonials.status, "approved"))
    .orderBy(desc(testimonials.reviewedAt))
    .limit(limit);
}

export async function getMyTestimonial(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(testimonials).where(eq(testimonials.userId, userId)).limit(1);
  return row ?? null;
}

/** Kişi başı tek yorum: yeniden gönderince içerik güncellenir ve yeniden onaya düşer. */
export async function saveMyTestimonial(userId: number, input: { displayName: string; detail: string | null; rating: number; body: string }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı kullanılamıyor.");
  const now = new Date();
  await db
    .insert(testimonials)
    .values({ userId, ...input, status: "pending", updatedAt: now })
    .onConflictDoUpdate({ target: testimonials.userId, set: { ...input, status: "pending", updatedAt: now, reviewedAt: null, reviewedBy: null } });
  return getMyTestimonial(userId);
}

export async function deleteMyTestimonial(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(testimonials).where(eq(testimonials.userId, userId));
}

export async function listTestimonialsForAdmin(status: TestimonialStatus) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: testimonials.id, displayName: testimonials.displayName, detail: testimonials.detail, rating: testimonials.rating, body: testimonials.body, status: testimonials.status, updatedAt: testimonials.updatedAt, userId: testimonials.userId, userName: users.name, userEmail: users.email })
    .from(testimonials)
    .leftJoin(users, eq(users.id, testimonials.userId))
    .where(eq(testimonials.status, status))
    .orderBy(desc(testimonials.updatedAt))
    .limit(200);
}

export async function reviewTestimonial(id: number, status: "approved" | "rejected", reviewerId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(testimonials).set({ status, reviewedAt: new Date(), reviewedBy: reviewerId }).where(eq(testimonials.id, id));
}
