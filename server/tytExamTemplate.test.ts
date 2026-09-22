import { describe, expect, it } from "vitest";
import { buildTytTemplateTopicDetails, groupTopicDetailsBySubject } from "../shared/tytExamTemplate";

describe("buildTytTemplateTopicDetails", () => {
  const rows = buildTytTemplateTopicDetails();

  it("her satırda D/Y/Boş sıfırdan başlar, S kaynaktan gelir", () => {
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.correct).toBe(0);
      expect(row.wrong).toBe(0);
      expect(row.blank).toBe(0);
      expect(row.questionCount).toBeGreaterThan(0);
    }
  });

  it("Türkçe toplam soru sayısı kaynak görselle birebir eşleşir: 40", () => {
    const total = rows.filter((row) => row.subject === "Türkçe").reduce((sum, row) => sum + row.questionCount, 0);
    expect(total).toBe(40);
  });

  it("Matematik-1 toplam soru sayısı kaynak görselle birebir eşleşir: 40", () => {
    const total = rows.filter((row) => row.subject === "Matematik").reduce((sum, row) => sum + row.questionCount, 0);
    expect(total).toBe(40);
  });

  it("Sosyal toplam soru sayısı kaynak görselle birebir eşleşir: 25 (5 kategori x 5)", () => {
    const total = rows.filter((row) => row.subject === "Sosyal").reduce((sum, row) => sum + row.questionCount, 0);
    expect(total).toBe(25);
  });

  it("Fen'de yalnızca Fizik ve Kimya var (Biyoloji kaynak görselde yoktu, uydurulmadı): 14", () => {
    const fenRows = rows.filter((row) => row.subject === "Fen");
    const categories = new Set(fenRows.map((row) => row.category));
    expect(categories).toEqual(new Set(["Fizik", "Kimya"]));
    expect(fenRows.reduce((sum, row) => sum + row.questionCount, 0)).toBe(14);
  });
});

describe("groupTopicDetailsBySubject", () => {
  it("ders > kategori hiyerarşisini kurar ve her seviyede S/D/Y/Boş toplarını doğru hesaplar", () => {
    const grouped = groupTopicDetailsBySubject(buildTytTemplateTopicDetails());
    const turkce = grouped.find((item) => item.subject === "Türkçe")!;
    expect(turkce.totals.questionCount).toBe(40);
    expect(turkce.categories).toHaveLength(1);
    expect(turkce.categories[0].category).toBe("Türkçe");

    const fen = grouped.find((item) => item.subject === "Fen")!;
    expect(fen.categories.map((item) => item.category)).toEqual(["Fizik", "Kimya"]);
    expect(fen.categories.find((item) => item.category === "Fizik")!.totals.questionCount).toBe(7);
    expect(fen.categories.find((item) => item.category === "Kimya")!.totals.questionCount).toBe(7);
  });

  it("doğru/yanlış girildiğinde kategori ve ders toplamlarına yansır", () => {
    const rows = buildTytTemplateTopicDetails().map((row, index) => (index === 0 ? { ...row, correct: 3, wrong: 1 } : row));
    const grouped = groupTopicDetailsBySubject(rows);
    const turkce = grouped.find((item) => item.subject === "Türkçe")!;
    expect(turkce.totals.correct).toBe(3);
    expect(turkce.totals.wrong).toBe(1);
    expect(turkce.totals.net).toBe(2.75);
    expect(turkce.categories[0].totals.correct).toBe(3);
  });

  it("orijinal dizideki index'leri korur", () => {
    const rows = buildTytTemplateTopicDetails();
    const grouped = groupTopicDetailsBySubject(rows);
    const allIndexes = grouped.flatMap((subject) => subject.categories.flatMap((category) => category.rows.map((entry) => entry.index)));
    expect(new Set(allIndexes).size).toBe(rows.length);
    expect(Math.max(...allIndexes)).toBe(rows.length - 1);
  });
});
