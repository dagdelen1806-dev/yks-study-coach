import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { CURRICULUM } from "../shared/curriculum";
import { detectDocument, estimateSkew, warpPerspective, type Quad } from "../shared/imaging/geometry";
import { createGray, limitSize, resizeGray, rotateQuarter, rotateSmall, type GrayImage } from "../shared/imaging/image";
import { planPreprocessing, renderVariant } from "../shared/imaging/pipeline";
import { analyzeImageQuality, type ImageQualityReport } from "../shared/imaging/quality";
import { boxBlur3 } from "../shared/imaging/enhance";
import { LlmUnavailableError } from "./_core/llm";
import { matchTopic, type MatchableTopic } from "./bookContent/curriculumMatcher";
import { decodeJpegToGray } from "./bookContent/imageCodec";
import { buildConsensus, scorePasses, type OcrPass } from "./bookContent/ocrConsensus";
import { readTocImage } from "./bookContent/ocrOrchestrator";
import type { OcrProvider } from "./bookContent/ocrProvider";
import { characterErrorRate, parsePageNumber, splitTrailingPage, textSimilarity, turkishPlausibility, wordErrorRate } from "./bookContent/ocrText";
import { parseTableOfContents, type TocRawItem, type TocRawPage } from "./bookContent/tocParser";
import { filterTocNoise, repairPageNumbers } from "./bookContent/tocPostprocess";

const fixtureDir = path.join(__dirname, "fixtures/books");
const loadGray = (relative: string) => limitSize(decodeJpegToGray(fs.readFileSync(path.join(fixtureDir, relative))), 2400);
const planPage = loadGray("start-matematik/kitap-bitirme-plani.jpg");
const paragrafPage = loadGray("paragraf-soru-bankasi/icindekiler-2.jpeg");
const jpegDataUrl = (relative: string) => `data:image/jpeg;base64,${fs.readFileSync(path.join(fixtureDir, relative)).toString("base64")}`;

/** Sentetik sayfa: koyu zemin üzerinde beyaz kâğıt, üzerinde yatay "yazı" satırları. */
function syntheticPage(options: { width?: number; height?: number; background?: number; paper?: number; lines?: number; ink?: number } = {}): GrayImage {
  const width = options.width ?? 800, height = options.height ?? 1100;
  const image = createGray(width, height, options.background ?? 60);
  const left = Math.round(width * 0.15), right = Math.round(width * 0.85), top = Math.round(height * 0.1), bottom = Math.round(height * 0.9);
  for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) image.data[y * width + x] = options.paper ?? 235;
  const lines = options.lines ?? 22;
  for (let line = 0; line < lines; line++) {
    const y0 = top + 40 + line * Math.floor((bottom - top - 80) / lines);
    for (let y = y0; y < y0 + 7; y++) for (let x = left + 40; x < right - 40; x++) if ((x >> 3) % 3 !== 0) image.data[y * width + x] = options.ink ?? 30;
  }
  return image;
}
const reportOf = (overrides: Partial<ImageQualityReport>): ImageQualityReport => ({
  width: 1000, height: 1400, megapixels: 1.4, resolution: "good", brightness: 0.8, contrast: 0.8, blur: 0.05, noise: 0.05, shadow: 0.05, glare: 0, skew: 0, skewConfidence: 0,
  perspective: 0, documentCoverage: 1, documentConfidence: 0, documentQuad: null, orientation: "upright", orientationConfidence: 0.8, estimatedTextHeight: 30, level: "GOOD", score: 0.95, issues: [], ...overrides,
});

describe("ImageQualityAnalyzer", () => {
  it("rates a clear real contents photo as readable and upright", () => {
    const report = analyzeImageQuality(planPage);
    expect(report.level).not.toBe("POOR");
    expect(report.orientation).toBe("upright");
    expect(report.blur).toBeLessThan(0.3);
    for (const key of ["brightness", "contrast", "blur", "noise", "shadow", "glare", "documentCoverage"] as const) {
      expect(report[key]).toBeGreaterThanOrEqual(0);
      expect(report[key]).toBeLessThanOrEqual(1);
    }
  });

  it("detects a sideways (90°) photo of a real contents page", () => {
    const report = analyzeImageQuality(rotateQuarter(paragrafPage, 90));
    expect(report.orientation).toBe("sideways");
    expect(report.issues.map((issue) => issue.code)).toContain("sideways");
  });

  it("flags a blurry photo and recommends a retake", () => {
    let blurred = resizeGray(resizeGray(limitSize(planPage, 1000), 250, 555), 1000, 2222);
    blurred = boxBlur3(boxBlur3(blurred));
    const report = analyzeImageQuality(blurred);
    expect(report.issues.find((issue) => issue.code === "blurry")).toBeTruthy();
    expect(report.issues.find((issue) => issue.code === "blurry")!.message).toMatch(/bulanık/);
  });

  it("flags a dark photo as POOR", () => {
    const dark = syntheticPage({ background: 10, paper: 38, ink: 5 });
    const report = analyzeImageQuality(dark);
    expect(report.level).toBe("POOR");
    expect(report.issues.map((issue) => issue.code)).toContain("dark");
  });

  it("detects a glare hotspot", () => {
    const page = syntheticPage({ paper: 200 });
    for (let y = 300; y < 650; y++) for (let x = 250; x < 560; x++) page.data[y * page.width + x] = 255;
    expect(analyzeImageQuality(page).glare).toBeGreaterThan(0.04);
  });
});

describe("DocumentDetector + PerspectiveCorrector", () => {
  it("finds the page corners on a dark background and flattens a keystoned page", () => {
    const flat = syntheticPage({ background: 50 });
    // Aynı sayfayı yamuk çek: üst kenar daraltılır (telefon sayfaya eğik tutulmuş).
    const quadIn: Quad = { topLeft: { x: 220, y: 110 }, topRight: { x: 580, y: 110 }, bottomRight: { x: 680, y: 990 }, bottomLeft: { x: 120, y: 990 } };
    const source = { topLeft: { x: 120, y: 110 }, topRight: { x: 680, y: 110 }, bottomRight: { x: 680, y: 990 }, bottomLeft: { x: 120, y: 990 } };
    const keystoned = createGray(800, 1100, 50);
    // Düz sayfanın kâğıt bölgesini yamuğa ileri eşle (ters eşleme: yamuk → düz).
    const unwarp = warpPerspective(flat, source, 5000);
    for (let y = 110; y < 990; y++) {
      const t = (y - 110) / 880;
      const left = 220 + (120 - 220) * t, right = 580 + (680 - 580) * t;
      for (let x = Math.ceil(left); x < right; x++) {
        const u = (x - left) / (right - left);
        keystoned.data[y * 800 + x] = unwarp.data[Math.min(unwarp.height - 1, Math.round(t * (unwarp.height - 1))) * unwarp.width + Math.min(unwarp.width - 1, Math.round(u * (unwarp.width - 1)))];
      }
    }
    const detection = detectDocument(keystoned);
    expect(detection.confidence).toBeGreaterThan(0.7);
    expect(detection.perspectiveDistortion).toBeGreaterThan(0.1);
    for (const corner of ["topLeft", "topRight", "bottomRight", "bottomLeft"] as const) {
      expect(Math.abs(detection.quad![corner].x - quadIn[corner].x)).toBeLessThan(20);
      expect(Math.abs(detection.quad![corner].y - quadIn[corner].y)).toBeLessThan(20);
    }
    const corrected = warpPerspective(keystoned, detection.quad!);
    // Düzeltilmiş sayfada satırlar yatay: eğim ~0 ve güven yüksek.
    const skew = estimateSkew(corrected);
    expect(Math.abs(skew.angle)).toBeLessThan(1);
  });

  it("does not crop when the page fills the frame (no background to separate)", () => {
    expect(detectDocument(planPage).confidence).toBeLessThan(0.5);
  });
});

describe("Deskew", () => {
  it("measures a known rotation of a real page within 0.75°", () => {
    const base = estimateSkew(paragrafPage).angle;
    expect(Math.abs(estimateSkew(rotateSmall(limitSize(paragrafPage, 1200), 3)).angle - (base + 3))).toBeLessThanOrEqual(0.75);
    expect(Math.abs(estimateSkew(rotateSmall(limitSize(paragrafPage, 1200), -2)).angle - (base - 2))).toBeLessThanOrEqual(0.75);
  });

  it("does not rotate an already straight synthetic page", () => {
    expect(Math.abs(estimateSkew(syntheticPage()).angle)).toBeLessThan(0.5);
  });
});

describe("Adaptive preprocessing selector", () => {
  it("keeps a GOOD photo minimal: original + mildly processed, no shadow correction", () => {
    const plan = planPreprocessing(reportOf({}));
    expect(plan.variants.map((variant) => variant.id)).toEqual(["A_original", "B_enhanced"]);
    expect(plan.variants[1].steps).not.toContain("illumination");
    expect(plan.variants[1].steps).toContain("contrast_mild");
  });

  it("adds shadow correction for a shadowed page and more passes for ACCEPTABLE", () => {
    const plan = planPreprocessing(reportOf({ shadow: 0.5, level: "ACCEPTABLE" }));
    expect(plan.variants.find((variant) => variant.id === "B_enhanced")!.steps).toEqual(expect.arrayContaining(["illumination", "contrast"]));
    expect(plan.variants.length).toBeGreaterThanOrEqual(3);
    expect(plan.variants.find((variant) => variant.id === "C_adaptive")!.steps).toContain("sauvola");
  });

  it("upscales and sharpens small / blurry text", () => {
    const plan = planPreprocessing(reportOf({ blur: 0.5, estimatedTextHeight: 12, level: "ACCEPTABLE" }));
    expect(plan.variants.find((variant) => variant.id === "B_enhanced")!.steps).toEqual(expect.arrayContaining(["upscale", "sharpen"]));
  });

  it("tries both 90° and 270° for a sideways photo", () => {
    const plan = planPreprocessing(reportOf({ orientation: "sideways", level: "ACCEPTABLE" }));
    expect(plan.variants.filter((variant) => variant.wave === 1).map((variant) => variant.id)).toEqual(["A_original", "B_enhanced_r90", "B_enhanced_r270"]);
    expect(plan.variants.filter((variant) => variant.wave === 2).every((variant) => variant.rotate === "auto")).toBe(true);
  });

  it("uses perspective correction only when the page detection is confident", () => {
    const quad = { topLeft: { x: 10, y: 10 }, topRight: { x: 900, y: 30 }, bottomRight: { x: 950, y: 1300 }, bottomLeft: { x: 20, y: 1350 } };
    expect(planPreprocessing(reportOf({ documentConfidence: 0.9, documentCoverage: 0.7, documentQuad: quad })).geometry.perspective).toBe(true);
    expect(planPreprocessing(reportOf({ documentConfidence: 0.4, documentCoverage: 0.7, documentQuad: quad })).geometry.perspective).toBe(false);
  });

  it("gives POOR photos the largest pass budget", () => {
    const plan = planPreprocessing(reportOf({ level: "POOR", shadow: 0.8, documentConfidence: 0.9, documentCoverage: 0.6, documentQuad: { topLeft: { x: 0, y: 0 }, topRight: { x: 900, y: 0 }, bottomRight: { x: 900, y: 1300 }, bottomLeft: { x: 0, y: 1300 } } }));
    expect(plan.variants.length).toBeGreaterThanOrEqual(5);
  });

  it("renders a real page variant and reports the steps it actually applied", () => {
    const quality = analyzeImageQuality(paragrafPage);
    const spec = planPreprocessing(quality).variants.find((variant) => variant.kind === "enhanced")!;
    const { image, applied } = renderVariant(paragrafPage, spec, quality);
    expect(applied).toContain("grayscale");
    expect(image.width).toBeGreaterThan(500);
  });
});

// --- OCR sonuçları ---------------------------------------------------------

const entry = (label: string | null, title: string, page: number | null, extra: Partial<TocRawItem> = {}): TocRawItem => ({ type: "entry", unitNumber: 2, title, label, page, confidence: 0.9, ...extra });
const unit = (number: number, title: string): TocRawItem => ({ type: "unit", unitNumber: number, title, label: null, page: null, confidence: 0.9 });
const pass = (variantId: string, items: TocRawItem[]): OcrPass => ({ variantId, page: { pageKind: "table_of_contents", items }, applied: [], rotation: 0, elapsedMs: 10 });
const cleanItems = () => [unit(2, "PARAGRAFTA KONU VE ANA DÜŞÜNCE"), entry("Test 1", "Paragrafta Konu ve Ana Düşünce", 27), entry("Test 2", "Paragrafta Konu ve Ana Düşünce", 30), entry("Test 3", "Paragrafta Konu ve Ana Düşünce", 33)];

describe("OCR result scoring", () => {
  it("scores a clean, complete, ordered read above garbage", () => {
    const garbage = pass("garbage", [entry("T3st l", "P@r@gr|ft@ K0nu", null, { confidence: 0.9 }), entry(null, "lll11 ###", 12)]);
    const scores = scorePasses([pass("clean", cleanItems()), garbage]);
    expect(scores[0].total).toBeGreaterThan(scores[1].total + 0.2);
    expect(scores[0].breakdown.language).toBeGreaterThan(scores[1].breakdown.language);
    expect(scores[0].breakdown.numberConsistency).toBe(1);
  });

  it("does not trust the provider's self-reported confidence alone", () => {
    const confidentButBroken = pass("broken", [entry("Test 1", "Paragrafta Konu", 40, { confidence: 1 }), entry("Test 2", "Paragrafta Konu", 12, { confidence: 1 })]);
    const modestButRight = pass("right", cleanItems().map((item) => ({ ...item, confidence: 0.7 })));
    const [broken, right] = scorePasses([confidentButBroken, modestButRight]);
    expect(right.total).toBeGreaterThan(broken.total);
  });
});

describe("Multi-pass consensus", () => {
  it("keeps the Turkish spelling agreed by the passes and raises confidence", () => {
    const folded = cleanItems().map((item) => ({ ...item, title: item.title.replace("Düşünce", "Dusunce").replace("DÜŞÜNCE", "DUSUNCE") }));
    const passes = [pass("A", cleanItems()), pass("B", folded), pass("C", cleanItems())];
    const result = buildConsensus(passes, scorePasses(passes));
    const titles = result.page.items.filter((item) => item.type === "entry").map((item) => item.title);
    expect(titles.every((title) => title === "Paragrafta Konu ve Ana Düşünce")).toBe(true);
    expect(result.page.items.every((item) => item.support === 1)).toBe(true);
    expect(result.page.items.filter((item) => item.type === "entry").every((item) => !item.review?.title && !item.review?.page)).toBe(true);
  });

  it("prefers the Turkish-character reading on a 1–1 tie", () => {
    const folded = cleanItems().map((item) => ({ ...item, title: item.title.replace("Düşünce", "Dusunce") }));
    const passes = [pass("A", folded), pass("B", cleanItems())];
    const result = buildConsensus(passes, scorePasses(passes));
    expect(result.page.items[1].title).toBe("Paragrafta Konu ve Ana Düşünce");
  });

  it("lowers confidence for a line only one pass saw and flags disputed page numbers", () => {
    const withExtra = [...cleanItems(), entry("Test 4", "Paragrafta Konu ve Ana Düşünce", 36)];
    const disputed = cleanItems().map((item) => (item.label === "Test 2" ? { ...item, page: 38 } : item));
    const passes = [pass("A", withExtra), pass("B", disputed), pass("C", cleanItems())];
    const result = buildConsensus(passes, scorePasses(passes));
    const test4 = result.page.items.find((item) => item.label === "Test 4")!;
    const test1 = result.page.items.find((item) => item.label === "Test 1")!;
    const test2 = result.page.items.find((item) => item.label === "Test 2")!;
    expect(test4.confidence!).toBeLessThan(test1.confidence!);
    expect(test2.page).toBe(30);
    expect(test2.review?.page).toBe(true);
  });

  it("recovers a line the best pass skipped when most passes saw it", () => {
    const skipped = cleanItems().filter((item) => item.label !== "Test 2");
    const passes = [pass("A", [...skipped.map((item) => ({ ...item, confidence: 1 }))]), pass("B", cleanItems()), pass("C", cleanItems())];
    const result = buildConsensus(passes, scorePasses(passes));
    expect(result.page.items.map((item) => item.label)).toEqual([null, "Test 1", "Test 2", "Test 3"]);
  });
});

describe("Turkish text normalization + page numbers", () => {
  it("never alters raw Turkish text; matching uses a separate normalized form", () => {
    expect(textSimilarity("Paragrafta Konu ve Ana Düşünce", "Paragrafta Konu ve Ana Dusunce")).toBe(1);
    expect(textSimilarity("Paragrafın Yapısı", "Paragrafta Yardımcı Düşünce")).toBeLessThan(0.6);
  });

  it("parses page numbers and flags OCR look-alike corrections instead of trusting them", () => {
    expect(parsePageNumber("12")).toMatchObject({ value: 12, corrected: false });
    expect(parsePageNumber("I2")).toMatchObject({ value: 12, corrected: true });
    expect(parsePageNumber("l2")).toMatchObject({ value: 12, corrected: true });
    expect(parsePageNumber("1Z")).toMatchObject({ value: 12, corrected: true });
    expect(parsePageNumber("Sayfa (143)")).toMatchObject({ value: 143, corrected: false });
    expect(parsePageNumber("IO")).toMatchObject({ value: null });
    expect(parsePageNumber("abc")).toMatchObject({ value: null });
    expect(parsePageNumber("99999")).toMatchObject({ value: null });
  });

  it("splits a dotted leader line into title and page", () => {
    expect(splitTrailingPage("Paragrafta Anlatım ........ 12")).toEqual({ title: "Paragrafta Anlatım", pageText: "12" });
    expect(splitTrailingPage("Paragrafta Anlatım")).toEqual({ title: "Paragrafta Anlatım", pageText: null });
  });

  it("rates Turkish text above OCR garbage", () => {
    expect(turkishPlausibility("Paragrafta Konu ve Ana Düşünce")).toBeGreaterThan(0.8);
    expect(turkishPlausibility("|||@@ ## 1l1l")).toBeLessThan(0.3);
  });

  it("computes CER and WER", () => {
    expect(characterErrorRate("Düşünce", "Dusunce")).toBeCloseTo(3 / 7);
    expect(wordErrorRate("Paragrafta Konu ve Ana Düşünce", "Paragrafta Konu ve Ana Dusunce")).toBeCloseTo(1 / 5);
  });
});

describe("TOC parser — dotted leaders, hierarchy, content types", () => {
  it("turns 'Test 1 Paragrafta Anlatım ........ 12' into a structured test entry", () => {
    const items = repairPageNumbers([unit(1, "PARAGRAFTA ANLATIM"), { type: "entry", unitNumber: 1, title: "Paragrafta Anlatım ........ 12", label: "Test 1", page: null }]);
    const { entries } = parseTableOfContents([{ items }]);
    expect(entries[0]).toMatchObject({ contentType: "topic_test", testNumber: 1, title: "Paragrafta Anlatım", pageStart: 12, unitNumber: 1, unitTitle: "PARAGRAFTA ANLATIM" });
  });

  it("builds unit → topic → tests / ÖSYM / simulation", () => {
    const items: TocRawItem[] = [
      { type: "unit", unitNumber: 2, title: "", label: null, page: null },
      { type: "section", unitNumber: null, title: "PARAGRAFTA KONU VE ANA DÜŞÜNCE", label: null, page: null },
      entry("Test 1", "Paragrafta Konu ve Ana Düşünce", 27), entry("Test 6", "Paragrafta Konu ve Ana Düşünce", 44), entry("ÖSYM Tipi", "", 47),
      { type: "section", unitNumber: null, title: "SİMÜLASYON PARAGRAF DENEMELERİ", label: null, page: null },
      entry("Simülasyon 1", "Paragraf Denemesi", 200),
    ];
    const { entries } = parseTableOfContents([{ items }]);
    expect(entries.map((item) => [item.unitNumber, item.unitTitle, item.contentType, item.testNumber])).toEqual([
      [2, "PARAGRAFTA KONU VE ANA DÜŞÜNCE", "topic_test", 1],
      [2, "PARAGRAFTA KONU VE ANA DÜŞÜNCE", "topic_test", 6],
      [2, "PARAGRAFTA KONU VE ANA DÜŞÜNCE", "osym_type", null],
      [null, "SİMÜLASYON PARAGRAF DENEMELERİ", "simulation", 1],
    ]);
    expect(entries[1]).toMatchObject({ pageStart: 44, pageEnd: 46 });
    expect(entries[3].matchText).toBeNull();
  });

  it("carries read confidence and review flags into entries", () => {
    const { entries } = parseTableOfContents([{ items: [entry("Test 1", "Paragrafta Anlatım", 9, { confidence: 0.55, review: { page: true } })] }]);
    expect(entries[0]).toMatchObject({ readConfidence: 0.55, review: { title: false, page: true } });
  });
});

describe("Header / footer / ISBN / logo filter", () => {
  it("keeps them out of the structure (raw text is untouched)", () => {
    const header: TocRawItem = { type: "section", unitNumber: null, title: "PARAGRAF SORU BANKASI", label: null, page: null };
    const pages: TocRawPage[] = [
      { items: [header, entry("Test 1", "Paragrafta Anlatım", 9), entry(null, "ISBN 978-605-2156-12-3", null), entry(null, "www.bilgisarmal.com", null)] },
      { items: [header, entry("Test 2", "Paragrafta Anlatım", 12), { type: "section", unitNumber: null, title: "Bilgi Sarmal", label: null, page: null }, entry(null, "© Tüm hakları saklıdır", null)] },
    ];
    const { pages: cleaned, removed } = filterTocNoise(pages, { publisher: "Bilgi Sarmal" });
    const kept = cleaned.flatMap((page) => page.items.map((item) => item.title));
    expect(kept).toEqual(["Paragrafta Anlatım", "Paragrafta Anlatım"]);
    expect(removed.map((line) => line.reason).sort()).toEqual(["copyright", "isbn", "publisher", "repeated_header", "repeated_header", "url"]);
  });
});

describe("Curriculum matching constraints", () => {
  const topics: MatchableTopic[] = CURRICULUM.map((def, index) => ({ id: index + 1, ...def }));
  const idOf = (topic: string) => topics.find((item) => item.topic === topic)!.id;

  it("matches an OCR spelling without Turkish characters to the right topic", () => {
    expect(matchTopic("Paragrafta Konu ve Ana Dusunce", topics, { subject: "Türkçe" }).best?.topicId).toBe(idOf("Paragrafta Konu ve Ana Düşünce"));
  });

  it("does not confuse 'Paragrafın Yapısı' with 'Paragrafta Yardımcı Düşünce'", () => {
    expect(matchTopic("Paragrafın Yapısı", topics, { subject: "Türkçe" }).best?.topicId).not.toBe(idOf("Paragrafta Yardımcı Düşünce"));
  });

  it("stays inside the book's subject", () => {
    const result = matchTopic("Paragrafta Konu ve Ana Düşünce", topics, { subject: "Matematik" });
    expect(result.best === null || topics.find((topic) => topic.id === result.best!.topicId)!.subject === "Matematik").toBe(true);
  });
});

// --- Orkestratör -----------------------------------------------------------

const providerFrom = (respond: (callIndex: number, dataUrl: string) => TocRawPage | Promise<TocRawPage>): OcrProvider & { calls: string[] } => {
  const calls: string[] = [];
  return { name: "fake", calls, extractTableOfContentsPage: vi.fn(async (dataUrl: string) => { calls.push(dataUrl); return respond(calls.length - 1, dataUrl); }) };
};

describe("OcrOrchestrator", () => {
  it("stops after the first wave when the passes agree (cost control)", async () => {
    const provider = providerFrom(() => ({ pageKind: "table_of_contents", items: cleanItems().map((item) => ({ ...item, confidence: 0.97 })) }));
    const report = await readTocImage(jpegDataUrl("paragraf-soru-bankasi/icindekiler-1.jpeg"), { provider });
    expect(report.waves).toBe(1);
    expect(provider.calls.length).toBe(report.passes.filter((item) => item.status === "ok").length);
    expect(report.notes.join(" ")).toMatch(/doğruladı|ek okuma/);
    expect(report.quality).not.toBeNull();
    expect(report.rawText).toContain("Paragrafta Konu ve Ana Düşünce");
  }, 60_000);

  it("runs a second wave when the first reads disagree", async () => {
    const provider = providerFrom((callIndex) => ({ pageKind: "table_of_contents", items: callIndex === 1 ? cleanItems().slice(0, 2).map((item) => ({ ...item, title: `${item.title} x${callIndex}`, confidence: 0.6 })) : cleanItems() }));
    const report = await readTocImage(jpegDataUrl("paragraf-soru-bankasi/icindekiler-1.jpeg"), { provider });
    expect(report.waves).toBe(2);
    expect(report.passes.some((item) => item.variantId === "C_adaptive" && item.status === "ok")).toBe(true);
  }, 60_000);

  it("picks the rotation whose read scores higher for a sideways photo", async () => {
    // Birinci dalga sırası: A_original, B_enhanced_r90, B_enhanced_r270 → yalnızca 270° okuması düzgün.
    const sideways = rotateQuarter(paragrafPage, 90);
    const { encodeGrayToJpegDataUrl } = await import("./bookContent/imageCodec");
    const provider = providerFrom((callIndex) => ({ pageKind: "table_of_contents", items: callIndex === 2 ? cleanItems() : callIndex < 3 ? [entry(null, "ʎɐpı ɹɐʇɐʎ", null, { confidence: 0.3 })] : cleanItems() }));
    const report = await readTocImage(encodeGrayToJpegDataUrl(sideways), { provider });
    expect(report.plan!.geometry.sideways).toBe(true);
    expect(report.notes.join(" ")).toMatch(/270°/);
    expect(report.chosenVariant).not.toBe("B_enhanced_r90");
    expect(report.passes.filter((item) => item.variantId.startsWith("C_") || item.variantId.startsWith("D_")).every((item) => item.applied.length === 0 || item.applied.includes("rotate270"))).toBe(true);
  }, 60_000);

  it("stops immediately on a permanent service error (no pointless retries)", async () => {
    const provider = providerFrom(() => { throw new LlmUnavailableError("not_configured", "no key"); });
    await expect(readTocImage(jpegDataUrl("paragraf-soru-bankasi/icindekiler-1.jpeg"), { provider })).rejects.toBeInstanceOf(LlmUnavailableError);
  }, 60_000);

  it("respects the time budget: slow passes time out and are reported, not awaited forever", async () => {
    const provider = providerFrom((callIndex) => (callIndex === 0 ? { pageKind: "table_of_contents", items: cleanItems() } : new Promise<TocRawPage>(() => undefined)));
    const report = await readTocImage(jpegDataUrl("paragraf-soru-bankasi/icindekiler-1.jpeg"), { provider, config: { timeBudgetMs: 4_000, passTimeoutMs: 1_500, minRemainingForWaveMs: 3_000, maxWorkingDimension: 1200, jpegQuality: 80, correctiveReread: false } });
    expect(report.passes.some((item) => item.status === "timeout")).toBe(true);
    expect(report.elapsedMs).toBeLessThan(6_000);
    expect(report.page.items.length).toBeGreaterThan(0);
  }, 30_000);
});
