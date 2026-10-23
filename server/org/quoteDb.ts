import { desc, eq } from "drizzle-orm";
import { orgQuotes, organizations, users } from "../../drizzle/schema";
import { computeQuoteTotals, quoteLineSchema, type QuoteLine, type QuoteStatus } from "../../shared/orgQuote";
import type { OrgPlan } from "../../shared/org";
import { getDb } from "../db";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Veritabanına ulaşılamadı.");
  return db;
}

export type QuoteInput = {
  orgId: number | null; customerName: string; contactName: string | null; contactEmail: string | null; plan: OrgPlan;
  months: number; studentCount: number | null; lines: QuoteLine[]; discountPercent: number; vatRate: number; validUntil: Date | null; note: string | null;
};

const parseLines = (json: string): QuoteLine[] => {
  try { return quoteLineSchema.array().parse(JSON.parse(json)); } catch { return []; }
};

const toRow = (input: QuoteInput) => {
  const totals = computeQuoteTotals(input.lines, input.discountPercent, input.vatRate);
  const { lines, ...rest } = input;
  return { ...rest, linesJson: JSON.stringify(lines), subtotalTry: totals.subtotal, totalTry: totals.total };
};

export async function listQuotes() {
  const db = await requireDb();
  return db.select({ id: orgQuotes.id, orgId: orgQuotes.orgId, orgName: organizations.name, customerName: orgQuotes.customerName, plan: orgQuotes.plan, months: orgQuotes.months, totalTry: orgQuotes.totalTry, status: orgQuotes.status, validUntil: orgQuotes.validUntil, appliedAt: orgQuotes.appliedAt, createdAt: orgQuotes.createdAt, updatedAt: orgQuotes.updatedAt })
    .from(orgQuotes).leftJoin(organizations, eq(organizations.id, orgQuotes.orgId)).orderBy(desc(orgQuotes.createdAt));
}

export async function getQuote(id: number) {
  const db = await requireDb();
  const [row] = await db.select({ quote: orgQuotes, orgName: organizations.name, createdByName: users.name, createdByEmail: users.email })
    .from(orgQuotes).leftJoin(organizations, eq(organizations.id, orgQuotes.orgId)).leftJoin(users, eq(users.id, orgQuotes.createdByUserId))
    .where(eq(orgQuotes.id, id)).limit(1);
  if (!row) return null;
  const { linesJson, ...quote } = row.quote;
  const lines = parseLines(linesJson);
  return { ...quote, lines, totals: computeQuoteTotals(lines, quote.discountPercent, quote.vatRate), orgName: row.orgName, createdByName: row.createdByName, createdByEmail: row.createdByEmail };
}

export async function createQuote(input: QuoteInput, createdByUserId: number): Promise<number> {
  const db = await requireDb();
  const [row] = await db.insert(orgQuotes).values({ ...toRow(input), createdByUserId }).returning({ id: orgQuotes.id });
  return row.id;
}

export async function updateQuote(id: number, input: QuoteInput): Promise<void> {
  const db = await requireDb();
  await db.update(orgQuotes).set(toRow(input)).where(eq(orgQuotes.id, id));
}

export async function setQuoteStatus(id: number, status: QuoteStatus): Promise<void> {
  const db = await requireDb();
  await db.update(orgQuotes).set({ status }).where(eq(orgQuotes.id, id));
}

export async function markQuoteApplied(id: number): Promise<void> {
  const db = await requireDb();
  await db.update(orgQuotes).set({ appliedAt: new Date() }).where(eq(orgQuotes.id, id));
}

export async function deleteQuote(id: number): Promise<void> {
  const db = await requireDb();
  await db.delete(orgQuotes).where(eq(orgQuotes.id, id));
}
