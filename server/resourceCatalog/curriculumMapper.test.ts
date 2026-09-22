import { describe, expect, it } from "vitest";
import { mapBookToCurriculumTopics, type CurriculumTopicCandidate } from "./curriculumMapper";

const topics: CurriculumTopicCandidate[] = [
  { id: 1, exam: "TYT", subject: "Matematik", topic: "Problemler", unit: "Temel matematik" },
  { id: 2, exam: "TYT", subject: "Matematik", topic: "Sayılar ve bölünebilme", unit: "Temel matematik" },
  { id: 3, exam: "AYT", subject: "Matematik", topic: "Fonksiyonlar", unit: "Cebir" },
  { id: 4, exam: "TYT", subject: "Türkçe", topic: "Paragrafta anlam", unit: "Anlam bilgisi" },
];

describe("CurriculumMapper", () => {
  it("ders ve sınav kapsamı uyuşmayan konuları hiç aday olarak görmez", () => {
    const mappings = mapBookToCurriculumTopics({ name: "TYT Matematik Problemler Soru Bankası", subject: "Türkçe", examScope: "TYT" }, topics);
    expect(mappings.every((m) => [4].includes(m.topicId))).toBe(true);
  });

  it("ortak kelime bulunan konuları güven skoruyla eşler, kesin doğrulama yapmaz", () => {
    const mappings = mapBookToCurriculumTopics({ name: "TYT Matematik Problemler Soru Bankası", subject: "Matematik", examScope: "TYT" }, topics);
    expect(mappings[0].topicId).toBe(1);
    expect(mappings[0].confidence).toBeGreaterThan(0);
    expect(mappings[0].confidence).toBeLessThan(1);
  });

  it("TYT_AYT/YKS/GENEL kapsamı hem TYT hem AYT konularını adaylığa alır", () => {
    const mappings = mapBookToCurriculumTopics({ name: "Matematik Fonksiyonlar ve Problemler", subject: "Matematik", examScope: "TYT_AYT" }, topics);
    const ids = mappings.map((m) => m.topicId);
    expect(ids).toContain(1);
    expect(ids).toContain(3);
  });

  it("konu ortak kelimesi olmayan kitaplar için hiç aday üretmez (düşük güvenle kesin eşleştirme yapmaz)", () => {
    const mappings = mapBookToCurriculumTopics({ name: "TYT Deneme Sınavı 5", subject: "Matematik", examScope: "TYT" }, topics);
    expect(mappings).toEqual([]);
  });

  it("ders bilgisi yoksa boş dizi döner", () => {
    const mappings = mapBookToCurriculumTopics({ name: "Herhangi bir kitap", subject: null, examScope: "GENEL" }, topics);
    expect(mappings).toEqual([]);
  });
});
