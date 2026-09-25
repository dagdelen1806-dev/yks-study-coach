import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CURRICULUM } from "../shared/curriculum";
import { buildBookRecommendations, computeBookCompletion, minutesForWeakness, pickStudyDay, weaknessFromAccuracy, type ContentRow } from "./bookContent/bookStudyAllocation";
import { matchTopic, type MatchableTopic } from "./bookContent/curriculumMatcher";
import { parseTableOfContents, type TocRawPage } from "./bookContent/tocParser";

// Gerçek kitap fikstürü: Bilgi Sarmal — Paragraf Soru Bankası (TYT-AYT).
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/books/paragraf-soru-bankasi/toc-raw.json"), "utf8")) as { pages: TocRawPage[] };

// Müfredata test için sıralı sahte ID'ler (gerçekte yks_topics.id).
const topics: MatchableTopic[] = CURRICULUM.map((def, index) => ({ id: index + 1, ...def }));
const idOf = (topic: string) => topics.find((item) => item.topic === topic)!.id;

describe("curriculum data", () => {
  it("has unique, stable slugs that fit yks_topics.slug", () => {
    const slugs = CURRICULUM.map((def) => def.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((slug) => slug.length > 0 && slug.length <= 120)).toBe(true);
  });

  it("reuses the existing equivalent seed topics instead of duplicating them", () => {
    expect(CURRICULUM.find((def) => def.topic === "Paragrafta Anlam ve Yorum")?.slug).toBe("tyt-tr-paragraf");
    expect(CURRICULUM.find((def) => def.topic === "İntegral")?.slug).toBe("ayt-mat-integral");
  });
});

describe("parseTableOfContents — Paragraf Soru Bankası", () => {
  const { entries, warnings } = parseTableOfContents(fixture.pages);
  const unit = (n: number) => entries.filter((entry) => entry.unitNumber === n);

  it("detects 5 units with the right number of topic tests and no warnings", () => {
    expect(warnings).toEqual([]);
    expect([1, 2, 3, 4, 5].map((n) => unit(n).filter((entry) => entry.contentType === "topic_test").length)).toEqual([5, 6, 7, 8, 9]);
    expect(unit(1)[0].unitTitle).toBe("PARAGRAFTA ANLATIM");
    expect(unit(5)[0].unitTitle).toBe("KİŞİ ÖZELLİKLERİ VE PARAGRAFI PARÇALARA BÖLEREK ANLAMA YENİ NESİL ANLAM TESTLERİ");
  });

  it("derives page ranges from the next entry's start page", () => {
    const test1 = unit(2).find((entry) => entry.testNumber === 1)!;
    expect(test1).toMatchObject({ title: "Paragrafta Konu ve Ana Düşünce", pageStart: 27, pageEnd: 29 });
    const lastOfUnit4 = unit(4).at(-1)!;
    expect(lastOfUnit4).toMatchObject({ testNumber: 8, pageStart: 104, pageEnd: 108 });
  });

  it("classifies ÖSYM-type, spiral review and simulation entries", () => {
    expect(unit(3).map((entry) => entry.contentType).slice(-2)).toEqual(["osym_type", "review"]);
    const trainingTests = unit(5).filter((entry) => entry.label.includes("Eğitim Kontrol"));
    expect(trainingTests.map((entry) => [entry.contentType, entry.testNumber])).toEqual([1, 2, 3, 4, 5, 6].map((n) => ["osym_type", n]));
    const simulations = entries.filter((entry) => entry.contentType === "simulation");
    expect(simulations).toHaveLength(20);
    expect(simulations[0]).toMatchObject({ unitNumber: null, unitTitle: "SİMÜLASYON PARAGRAF DENEMELERİ", testNumber: 1, pageStart: 170, pageEnd: 174, matchText: null });
    expect(simulations[19]).toMatchObject({ testNumber: 20, pageStart: 279, pageEnd: null });
  });

  it("flags a missing page number and an out-of-order page for review", () => {
    const broken: TocRawPage[] = [{ items: [
      { type: "unit", unitNumber: 1, title: "PARAGRAFTA ANLATIM", label: null, page: null },
      { type: "entry", unitNumber: 1, title: "Paragrafta Anlatım", label: "Test 1", page: 12 },
      { type: "entry", unitNumber: 1, title: "Paragrafta Anlatım", label: "Test 2", page: 9 },
      { type: "entry", unitNumber: 1, title: "Paragrafta Anlatım", label: "Test 3", page: null },
    ] }];
    const result = parseTableOfContents(broken);
    expect(result.warnings.some((warning) => warning.includes("Sayfa sırası tutarsız"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("okunamadı"))).toBe(true);
  });
});

describe("matchTopic — curriculum mapping of the fixture book", () => {
  const cases: [string, string][] = [
    ["Paragrafta Anlatım", "Paragrafta Anlatım Biçimleri ve Düşünceyi Geliştirme Yolları"],
    ["Paragrafta Konu ve Ana Düşünce", "Paragrafta Konu ve Ana Düşünce"],
    ["Paragrafta Yardımcı Düşünce", "Paragrafta Yardımcı Düşünce"],
    ["Paragrafın Yapısı", "Paragrafın Yapısı"],
    ["Kişi Özellikleri", "Paragrafta Anlam ve Yorum"],
    ["Paragrafı Parçalara Bölerek Anlama", "Paragrafta Anlam ve Yorum"],
  ];

  it.each(cases)("maps %s → %s with high confidence", (title, expected) => {
    const result = matchTopic(title, topics, { subject: "Türkçe" });
    expect(result.best?.topicId).toBe(idOf(expected));
    expect(result.tier).toBe("auto");
  });

  it("is robust to OCR casing and missing Turkish characters", () => {
    for (const variant of ["PARAGRAFTA KONU VE ANA DÜŞÜNCE", "Paragrafta Konu ve Ana Dusunce", "paragrafta konu ve ana düşünce "]) {
      expect(matchTopic(variant, topics, { subject: "Türkçe" }).best?.topicId).toBe(idOf("Paragrafta Konu ve Ana Düşünce"));
    }
  });

  it("maps every topic test of the fixture book, and each unit to exactly one topic", () => {
    const { entries } = parseTableOfContents(fixture.pages);
    const mapped = entries.filter((entry) => entry.matchText).map((entry) => ({ entry, result: matchTopic(entry.matchText!, topics, { subject: "Türkçe" }) }));
    expect(mapped.every(({ result }) => result.best !== null && result.tier !== "manual")).toBe(true);
    const topicsPerUnit = [1, 2, 3, 4].map((n) => new Set(mapped.filter(({ entry }) => entry.unitNumber === n).map(({ result }) => result.best!.topicId)).size);
    expect(topicsPerUnit).toEqual([1, 1, 1, 1]);
  });

  it("never invents a topic: an unrelated heading falls to manual mapping", () => {
    const result = matchTopic("Fotosentez ve Kemosentez Karşılaştırması", topics, { subject: "Türkçe" });
    expect(result.tier).toBe("manual");
    expect(topics.some((topic) => topic.id === result.best?.topicId) || result.best === null).toBe(true);
  });

  it("restricts candidates to the book's subject", () => {
    const result = matchTopic("Olasılık", topics, { subject: "Türkçe" });
    expect(result.best).toBeNull();
    expect(matchTopic("Olasılık", topics, { subject: "Matematik", exam: "TYT" }).best?.topicId).toBe(idOf("Olasılık"));
  });
});

describe("book study allocation — weak topic → book task", () => {
  const { entries } = parseTableOfContents(fixture.pages);
  // Fikstür kitabı kaydedilmiş gibi: her satır eşlenmiş konusuyla.
  const contents: ContentRow[] = entries.map((entry, index) => {
    const match = entry.matchText ? matchTopic(entry.matchText, topics, { subject: "Türkçe" }).best : null;
    return { id: index + 1, bookId: "photo-book-1", sortOrder: entry.order, unitNumber: entry.unitNumber, unitTitle: entry.unitTitle, contentType: entry.contentType, label: entry.label, testNumber: entry.testNumber, pageStart: entry.pageStart, pageEnd: entry.pageEnd, topicId: match?.topicId ?? null, mappingConfidence: match?.confidence ?? 0 };
  });
  const mainIdea = idOf("Paragrafta Konu ve Ana Düşünce");
  const weak = { topicId: mainIdea, topic: "Paragrafta Konu ve Ana Düşünce", subject: "Türkçe", exam: "TYT" as const, accuracy: 18 };

  it("turns accuracy into weakness and weakness into config-driven minutes", () => {
    expect(weaknessFromAccuracy(18)).toBe(0.82);
    expect([0.2, 0.35, 0.6, 0.82, 0.9].map((w) => minutesForWeakness(w))).toEqual([null, 20, 30, 45, 60]);
  });

  it("recommends the first open tests of unit 2 for the weak main-idea topic", () => {
    const [rec] = buildBookRecommendations({ weakTopics: [weak], contents, donePages: {}, scheduledPages: {} });
    expect(rec).toMatchObject({ bookId: "photo-book-1", unitNumber: 2, minutes: 45, testRange: "1-3", pageStart: 27, pageEnd: 35, match: "HIGH", remainingTests: 6 });
  });

  it("skips tests already solved (book log pages) or already scheduled", () => {
    const [rec] = buildBookRecommendations({ weakTopics: [weak], contents, donePages: { "photo-book-1": [{ pageStart: 27, pageEnd: 32 }] }, scheduledPages: { "photo-book-1": [{ pageStart: 33, pageEnd: 35 }] } });
    expect(rec).toMatchObject({ testRange: "4-6", pageStart: 36, pageEnd: 48 });
  });

  it("gives nothing once every test of the topic is done, and ignores low-priority topics", () => {
    expect(buildBookRecommendations({ weakTopics: [weak], contents, donePages: { "photo-book-1": [{ pageStart: 27, pageEnd: 48 }] }, scheduledPages: {} })).toEqual([]);
    expect(buildBookRecommendations({ weakTopics: [{ ...weak, accuracy: 80 }], contents, donePages: {}, scheduledPages: {} })).toEqual([]);
  });

  it("orders recommendations by weakness", () => {
    const structure = { topicId: idOf("Paragrafın Yapısı"), topic: "Paragrafın Yapısı", subject: "Türkçe", exam: "TYT" as const, accuracy: 10 };
    const recs = buildBookRecommendations({ weakTopics: [weak, structure], contents, donePages: {}, scheduledPages: {} });
    expect(recs.map((rec) => rec.topic)).toEqual(["Paragrafın Yapısı", "Paragrafta Konu ve Ana Düşünce"]);
    expect(recs[0]).toMatchObject({ unitNumber: 4, minutes: 60, testRange: "1-4" });
  });

  it("picks the first day with room, never overloading the plan", () => {
    const load = [{ date: "2026-09-25", minutes: 100, isBook: false }, { date: "2026-09-26", minutes: 60, isBook: true }, { date: "2026-09-26", minutes: 10, isBook: false }];
    expect(pickStudyDay({ today: "2026-09-25", minutes: 45, load, dailyCapacity: 120 })).toBe("2026-09-27");
    expect(pickStudyDay({ today: "2026-09-25", minutes: 30, load, dailyCapacity: 120 })).toBe("2026-09-26");
    expect(pickStudyDay({ today: "2026-09-25", minutes: 200, load: [], dailyCapacity: 120 })).toBeNull();
  });
});

describe("book completion score", () => {
  const { entries } = parseTableOfContents(fixture.pages);
  const contents = entries.map((entry) => ({ unitNumber: entry.unitNumber, unitTitle: entry.unitTitle, pageStart: entry.pageStart }));

  it("is 0% for a freshly scanned book and counts content rows as the total", () => {
    const result = computeBookCompletion({ contents, logs: [] });
    expect(result).toMatchObject({ percent: 0, basis: "contents", done: 0, total: 65, accuracy: null });
    expect(result.units.map((unit) => unit.total)).toEqual([5, 6, 9, 8, 17, 20]);
  });

  it("marks tests whose start page falls inside a solved page range, per unit", () => {
    const logs = [{ pageStart: 9, pageEnd: 26, questions: 60, correct: 45 }, { pageStart: 27, pageEnd: 32, questions: 24, correct: 12 }];
    const result = computeBookCompletion({ contents, logs });
    expect(result.units[0]).toMatchObject({ done: 5, total: 5 });
    expect(result.units[1]).toMatchObject({ done: 2, total: 6 });
    expect(result).toMatchObject({ done: 7, total: 65, percent: 11, accuracy: 68, questions: 84 });
  });

  it("falls back to solved pages over page count when the book has no scanned contents", () => {
    expect(computeBookCompletion({ contents: [], logs: [{ pageStart: 1, pageEnd: 50, questions: 0, correct: 0 }, { pageStart: 40, pageEnd: 60, questions: 0, correct: 0 }], pageCount: 240 }))
      .toMatchObject({ basis: "pages", done: 60, total: 240, percent: 25 });
    expect(computeBookCompletion({ contents: [], logs: [] })).toMatchObject({ percent: null, basis: "none" });
  });
});

describe("review recommendations for medium topics", () => {
  const { entries } = parseTableOfContents(fixture.pages);
  const contents: ContentRow[] = entries.map((entry, index) => {
    const match = entry.matchText ? matchTopic(entry.matchText, topics, { subject: "Türkçe" }).best : null;
    return { id: index + 1, bookId: "b1", sortOrder: entry.order, unitNumber: entry.unitNumber, unitTitle: entry.unitTitle, contentType: entry.contentType, label: entry.label, testNumber: entry.testNumber, pageStart: entry.pageStart, pageEnd: entry.pageEnd, topicId: match?.topicId ?? null, mappingConfidence: match?.confidence ?? 0 };
  });

  it("a medium (60%) topic gets a 20-minute review starting with the ÖSYM-type test", () => {
    const helper = { topicId: idOf("Paragrafta Yardımcı Düşünce"), topic: "Paragrafta Yardımcı Düşünce", subject: "Türkçe", exam: "TYT" as const, accuracy: 60 };
    const [rec] = buildBookRecommendations({ weakTopics: [helper], contents, donePages: {}, scheduledPages: {} });
    expect(rec).toMatchObject({ purpose: "review", minutes: 20, labels: ["ÖSYM Tipi"], testRange: null, pageStart: 73 });
  });

  it("a weak topic is practice with plain topic tests", () => {
    const helper = { topicId: idOf("Paragrafta Yardımcı Düşünce"), topic: "Paragrafta Yardımcı Düşünce", subject: "Türkçe", exam: "TYT" as const, accuracy: 40 };
    const [rec] = buildBookRecommendations({ weakTopics: [helper], contents, donePages: {}, scheduledPages: {} });
    expect(rec).toMatchObject({ purpose: "practice", minutes: 30, testRange: "1-2", pageStart: 49 });
  });
});
