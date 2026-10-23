import { z } from "zod";

/** Platformu işleten şirketin bilgileri (Yönetim Paneli → Ayarlar); teklif belgesinin başlığına ve altına yazılır. */
const text = (max: number) => z.string().trim().max(max).default("");
export const companyInfoSchema = z.object({
  brandName: text(80),
  legalName: text(200),
  taxOffice: text(80),
  taxNumber: z.string().trim().regex(/^(\d{10,11})?$/, "Vergi / TC kimlik numarası 10 ya da 11 haneli olmalı.").default(""),
  mersisNo: z.string().trim().regex(/^(\d{16})?$/, "MERSİS numarası 16 haneli olmalı.").default(""),
  address: text(300),
  phone: text(40),
  email: z.union([z.literal(""), z.string().trim().email("Geçerli bir e-posta yaz.").max(160)]).default(""),
  website: text(160),
  bankName: text(80),
  iban: z.string().trim().transform((value) => value.replace(/\s+/g, "").toUpperCase()).pipe(z.string().regex(/^(TR\d{24})?$/, "IBAN TR ile başlayan 26 karakter olmalı.")).default(""),
  quoteTerms: text(2000),
});
export type CompanyInfo = z.infer<typeof companyInfoSchema>;
export const EMPTY_COMPANY: CompanyInfo = companyInfoSchema.parse({});

/** IBAN'ı dörtlü gruplar halinde yazar: TR12 0006 … */
export const formatIban = (iban: string) => iban.replace(/(.{4})/g, "$1 ").trim();
