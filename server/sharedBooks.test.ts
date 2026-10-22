import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { bookInventory, sharedBooks, userBookContents, userResourceBooks, users, yksTopics } from "../drizzle/schema";
import { scoreSharedBook } from "./bookContent/sharedBooks";
import { getDb } from "./db";

describe("ortak kitap eşleştirmesi", () => {
  it("OCR yazım farklarını aynı kitap sayar, farklı kitabı ve farklı yayınevini ayırır", () => {
    const book = { title: "Paragraf Soru Bankası", publisher: "3D Yayınları", isbn: null };
    expect(scoreSharedBook({ title: "PARAGRAF SORU BANKASI", publisher: "3D YAYINLARI" }, book)).toBeGreaterThanOrEqual(0.9);
    expect(scoreSharedBook({ title: "Paragraf Soru Bankasi", publisher: "" }, book)).toBeGreaterThanOrEqual(0.9);
    expect(scoreSharedBook({ title: "Paragraf Konu Anlatımı", publisher: "3D Yayınları" }, book)).toBeLessThan(0.6);
    expect(scoreSharedBook({ title: "Paragraf Soru Bankası", publisher: "Limit Yayınları" }, book)).toBeLessThan(0.9);
    // ISBN ikisinde de geçerliyse yalnız ona bakılır.
    expect(scoreSharedBook({ title: "Başka ad", publisher: "", isbn: "9786053551676" }, { ...book, isbn: "9786053551676" })).toBe(1);
  });
});

const hasDb = Boolean(process.env.DATABASE_URL);
describe.skipIf(!hasDb)("ortak kitap kaydı (veritabanı)", () => {
  const stamp = Date.now() % 1_000_000;
  const ids = { first: 0, second: 0 };
  const title = `Problemler Soru Bankası ${stamp}`;
  let topicIds: number[] = [];

  beforeAll(async () => {
    const db = (await getDb())!;
    for (const key of Object.keys(ids) as Array<keyof typeof ids>) {
      const [row] = await db.insert(users).values({ openId: `shared-book-${key}-${stamp}`, name: `Kitap ${key}`, loginMethod: "dev_email" }).returning({ id: users.id });
      ids[key] = row.id;
    }
    topicIds = (await db.select({ id: yksTopics.id }).from(yksTopics).where(eq(yksTopics.subject, "Matematik")).limit(2)).map((row) => row.id);
  });
  afterAll(async () => {
    const db = (await getDb())!;
    const userIds = Object.values(ids);
    await db.delete(userBookContents).where(inArray(userBookContents.userId, userIds));
    await db.delete(bookInventory).where(inArray(bookInventory.userId, userIds));
    await db.delete(userResourceBooks).where(inArray(userResourceBooks.userId, userIds));
    await db.delete(sharedBooks).where(eq(sharedBooks.title, title));
    await db.delete(users).where(inArray(users.id, userIds));
  });

  it("ilk öğrencinin onayladığı içindekiler, kitabı seçen ikinci öğrenciye OCR'sız kopyalanır", async () => {
    const { addBookToLibrary, findSharedBookMatches, searchSharedBooks, shareBookContents } = await import("./bookContent/sharedBooks");
    const { getBookContents, replaceBookContents } = await import("./bookContent/bookContentDb");
    const draft = { title, publisher: "Karekök Yayınları", subject: "Matematik", exam: "TYT" as const, level: "Orta" as const };

    const first = await addBookToLibrary(ids.first, { sharedBookId: null, draft, useSharedContents: false });
    expect(first.contentsCopied).toBe(0);
    const items = [1, 2, 3].map((test) => ({ unitNumber: 1, unitTitle: "Sayı Problemleri", contentType: "topic_test" as const, label: `Test ${test}`, testNumber: test, title: "Sayı Problemleri", pageStart: test * 10, pageEnd: test * 10 + 9, topicId: topicIds[test % 2] ?? null, mappingMethod: "manual" as const, mappingConfidence: 1 }));
    await replaceBookContents(ids.first, first.book.id, "Matematik", items, "ocr");
    expect(await shareBookContents(ids.first, first.book.id, "Matematik", items, "ocr")).toBe(true);

    // İkinci öğrencinin kapağı biraz farklı okunur; yine aynı kitap önerilir, içindekiler hazır görünür.
    const [match] = await findSharedBookMatches({ title: title.toUpperCase().replace("ı", "i"), publisher: "KAREKÖK", isbn: "" });
    expect(match).toMatchObject({ id: first.book.sharedBookId, ownerCount: 1, contentsItemCount: 3, contentsTopicCount: new Set(items.map((item) => item.topicId)).size });
    expect((await searchSharedBooks(`problemler ${stamp}`)).map((item) => item.id)).toContain(match.id);

    const second = await addBookToLibrary(ids.second, { sharedBookId: match.id, draft: { ...draft, title: "OCR'dan gelen hatalı ad" }, useSharedContents: true });
    expect(second.book.title).toBe(title); // kimlik ortak kayıttan
    expect(second.contentsCopied).toBe(3);
    const copied = await getBookContents(ids.second, second.book.id);
    expect(copied.map((row) => [row.label, row.topicId, row.pageStart])).toEqual(items.map((item) => [item.label, item.topicId, item.pageStart]));

    // Aynı kitabı ikinci kez eklemek yeni kayıt açmaz; sonraki düzeltme ortak içeriği ezmez.
    expect((await addBookToLibrary(ids.second, { sharedBookId: match.id, draft, useSharedContents: true })).alreadyOwned).toBe(true);
    expect(await shareBookContents(ids.second, second.book.id, "Matematik", items.slice(0, 3).map((item) => ({ ...item, label: "Değişti" })), "manual")).toBe(false);
    const db = (await getDb())!;
    const [row] = await db.select().from(sharedBooks).where(eq(sharedBooks.id, match.id));
    expect(row.ownerCount).toBe(2);
    expect(row.contentsReuseCount).toBe(1);
    expect(row.contentsJson).not.toContain("Değişti");
  });
});
