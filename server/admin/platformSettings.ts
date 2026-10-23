import { eq } from "drizzle-orm";
import { platformSettings } from "../../drizzle/schema";
import { EMPTY_COMPANY, companyInfoSchema, type CompanyInfo } from "../../shared/platformCompany";
import { getDb } from "../db";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Veritabanına ulaşılamadı.");
  return db;
}

/** Kayıtlı şirket bilgileri; hiç girilmemişse ya da kayıt bozuksa boş alanlar döner. */
export async function getCompanyInfo(): Promise<CompanyInfo> {
  const db = await requireDb();
  const [row] = await db.select({ valueJson: platformSettings.valueJson }).from(platformSettings).where(eq(platformSettings.key, "company")).limit(1);
  if (!row) return EMPTY_COMPANY;
  try { return companyInfoSchema.parse(JSON.parse(row.valueJson)); } catch { return EMPTY_COMPANY; }
}

export async function saveCompanyInfo(info: CompanyInfo, updatedByUserId: number): Promise<void> {
  const db = await requireDb();
  const values = { valueJson: JSON.stringify(info), updatedByUserId };
  await db.insert(platformSettings).values({ key: "company", ...values }).onConflictDoUpdate({ target: platformSettings.key, set: values });
}
