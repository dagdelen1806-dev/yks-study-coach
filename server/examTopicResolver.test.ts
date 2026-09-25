import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CURRICULUM } from "../shared/curriculum";
import { EXAM_TOPICS_WITHOUT_LINK, curriculumSubjectsFor } from "../shared/examTopicLinks";
import { buildTytTemplateTopicDetails } from "../shared/tytExamTemplate";
import { buildBookRecommendations, type ContentRow } from "./bookContent/bookStudyAllocation";
import { matchTopic } from "./bookContent/curriculumMatcher";
import { deriveCurriculumWeakTopics, resolveToCurriculumTopicIds, type ProgressSignal, type ResolvableTopic } from "./bookContent/examTopicResolver";
import { parseTableOfContents, type TocRawPage } from "./bookContent/tocParser";

// yks_topics'in canlıdaki hali gibi: müfredat + deneme girişinden doğmuş ham konu satırları (slug "TYT-turkce-...").
const curriculumTopics: ResolvableTopic[] = CURRICULUM.map((def, index) => ({ id: index + 1, ...def }));
const idOf = (topic: string, subject?: string) => curriculumTopics.find((item) => item.topic === topic && (!subject || item.subject === subject))!.id;
const rawSlug = (exam: string, subject: string, topic: string) => `${exam}-${subject}-${topic}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");

describe("exam topic → curriculum bridge", () => {
  it("maps the grouped exam subjects to curriculum subjects", () => {
    expect(curriculumSubjectsFor("Fen", "Fizik")).toEqual(["Fizik"]);
    expect(curriculumSubjectsFor("Sosyal", "Coğrafya-1")).toEqual(["Coğrafya"]);
    expect(curriculumSubjectsFor("Sosyal", "Din Kül. ve Ahl. Bil.")).toEqual(["Din Kültürü"]);
    expect(curriculumSubjectsFor("Fen")).toEqual(["Fizik", "Kimya", "Biyoloji"]);
    expect(curriculumSubjectsFor("Matematik", "Matematik-1")).toEqual(["Matematik", "Geometri"]);
  });

  it("links every row of the real TYT exam template except the deliberately unlinked ones", () => {
    const unresolved = buildTytTemplateTopicDetails()
      .filter((row) => resolveToCurriculumTopicIds({ slug: rawSlug("TYT", row.subject, row.topic), exam: "TYT", subject: row.subject, topic: row.topic, category: row.category }, curriculumTopics).length === 0)
      .map((row) => row.topic);
    expect(unresolved.sort()).toEqual([...EXAM_TOPICS_WITHOUT_LINK].sort());
  });

  it("splits the compound paragraph row into both curriculum topics", () => {
    const ids = resolveToCurriculumTopicIds({ slug: "x", exam: "TYT", subject: "Türkçe", topic: "Parçada Anlam (Ana Düşünce-Yardımcı Düşünce)" }, curriculumTopics);
    expect(ids.sort()).toEqual([idOf("Paragrafta Konu ve Ana Düşünce"), idOf("Paragrafta Yardımcı Düşünce")].sort());
  });

  it("falls back to confident matcher hits for unknown exam topic names, and ignores vague ones", () => {
    expect(resolveToCurriculumTopicIds({ slug: "x", exam: "TYT", subject: "Türkçe", topic: "Paragrafın Yapısı, Anlatım Bozuklukları" }, curriculumTopics).sort())
      .toEqual([idOf("Paragrafın Yapısı"), idOf("Anlatım Bozuklukları")].sort());
    expect(resolveToCurriculumTopicIds({ slug: "x", exam: "TYT", subject: "Türkçe", topic: "Karışık Sorular" }, curriculumTopics)).toEqual([]);
  });

  it("returns a curriculum topic itself when the progress row already is one", () => {
    const def = CURRICULUM.find((item) => item.topic === "Paragrafın Yapısı")!;
    expect(resolveToCurriculumTopicIds({ slug: def.slug, exam: "TYT", subject: "Türkçe", topic: def.topic }, curriculumTopics)).toEqual([idOf("Paragrafın Yapısı")]);
  });
});

describe("weak exam result → book recommendation, with feedback", () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/books/paragraf-soru-bankasi/toc-raw.json"), "utf8")) as { pages: TocRawPage[] };
  const contents: ContentRow[] = parseTableOfContents(fixture.pages).entries.map((entry, index) => {
    const match = entry.matchText ? matchTopic(entry.matchText, curriculumTopics, { subject: "Türkçe" }).best : null;
    return { id: index + 1, bookId: "b1", sortOrder: entry.order, unitNumber: entry.unitNumber, unitTitle: entry.unitTitle, contentType: entry.contentType, label: entry.label, testNumber: entry.testNumber, pageStart: entry.pageStart, pageEnd: entry.pageEnd, topicId: match?.topicId ?? null, mappingConfidence: match?.confidence ?? 0 };
  });
  const examRow: ProgressSignal = { slug: rawSlug("TYT", "Türkçe", "parcada anlam"), exam: "TYT", subject: "Türkçe", topic: "Parçada Anlam (Ana Düşünce-Yardımcı Düşünce)", progress: 30, insufficientData: false, lastReviewedAt: "2026-09-20T10:00:00Z" };

  it("a weak paragraph result in a mock exam recommends units 2 and 3 of the book", () => {
    const weak = deriveCurriculumWeakTopics([examRow], curriculumTopics);
    expect(weak.map((item) => [item.topic, item.accuracy])).toEqual([["Paragrafta Konu ve Ana Düşünce", 30], ["Paragrafta Yardımcı Düşünce", 30]]);
    const recs = buildBookRecommendations({ weakTopics: weak, contents, donePages: {}, scheduledPages: {} });
    expect(recs.map((rec) => [rec.unitNumber, rec.testRange, rec.minutes])).toEqual([[2, "1-3", 45], [3, "1-3", 45]]);
  });

  it("stops recommending once newer book practice on the topic is good (latest result wins)", () => {
    const def = CURRICULUM.find((item) => item.topic === "Paragrafta Konu ve Ana Düşünce")!;
    const practice: ProgressSignal = { slug: def.slug, exam: "TYT", subject: "Türkçe", topic: def.topic, progress: 75, insufficientData: false, lastReviewedAt: "2026-09-24T18:00:00Z" };
    const weak = deriveCurriculumWeakTopics([examRow, practice], curriculumTopics);
    expect(weak.map((item) => item.topic)).toEqual(["Paragrafta Yardımcı Düşünce"]);
  });

  it("ignores rows without enough data and topics that are not weak", () => {
    expect(deriveCurriculumWeakTopics([{ ...examRow, insufficientData: true }], curriculumTopics)).toEqual([]);
    expect(deriveCurriculumWeakTopics([{ ...examRow, progress: 70 }], curriculumTopics)).toEqual([]);
  });

  it("averages several exam rows that point to the same topic on the same day", () => {
    const other: ProgressSignal = { ...examRow, slug: "x2", topic: "Parçada Konu-Başlık-Soru", progress: 50 };
    const weak = deriveCurriculumWeakTopics([examRow, other], curriculumTopics);
    expect(weak.find((item) => item.topic === "Paragrafta Konu ve Ana Düşünce")?.accuracy).toBe(40);
  });
});
