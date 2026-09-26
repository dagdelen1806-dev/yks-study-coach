/**
 * OCR benchmark — gerçek kitap fotoğrafları (server/fixtures/books) üzerinde.
 *
 *   npx tsx scripts/ocr-benchmark.ts            # ön işleme ölçümleri (LLM gerekmez)
 *   LLM_API_KEY=... npx tsx scripts/ocr-benchmark.ts --ocr   # + gerçek OCR doğruluğu (ücretli çağrılar)
 *
 * Doğruluk ölçütleri (CER, WER, ünite/test/sayfa/konu doğruluğu) yalnızca gerçek
 * bir sağlayıcıyla ölçülür; ölçülemeyen değer "Not measured" yazılır, uydurulmaz.
 * Ground truth: fixtures/.../toc-raw.json (fotoğraflardan elle çıkarıldı).
 * Ara görüntüler .ocr-debug/benchmark/ altına yazılır (git'e girmez).
 */
import fs from "node:fs";
import path from "node:path";
import { CURRICULUM } from "../shared/curriculum";
import { estimateSkew } from "../shared/imaging/geometry";
import { limitSize, rotateQuarter, rotateSmall } from "../shared/imaging/image";
import { planPreprocessing, renderVariant } from "../shared/imaging/pipeline";
import { analyzeImageQuality } from "../shared/imaging/quality";
import { matchTopic } from "../server/bookContent/curriculumMatcher";
import { decodeJpegToGray, encodeGrayToJpegDataUrl } from "../server/bookContent/imageCodec";
import { characterErrorRate, wordErrorRate } from "../server/bookContent/ocrText";
import type { TocRawPage } from "../server/bookContent/tocParser";

type Case = { name: string; image: string; truth: TocRawPage | null; subject: string };
const root = path.join(import.meta.dirname, "..", "server", "fixtures", "books");
const paragraf = JSON.parse(fs.readFileSync(path.join(root, "paragraf-soru-bankasi/toc-raw.json"), "utf8")) as { pages: TocRawPage[] };
const start = JSON.parse(fs.readFileSync(path.join(root, "start-matematik/toc-raw.json"), "utf8")) as { pages: TocRawPage[] };
const cases: Case[] = [
  { name: "paragraf-icindekiler-1", image: "paragraf-soru-bankasi/icindekiler-1.jpeg", truth: paragraf.pages[0], subject: "Türkçe" },
  { name: "paragraf-icindekiler-2", image: "paragraf-soru-bankasi/icindekiler-2.jpeg", truth: paragraf.pages[1], subject: "Türkçe" },
  { name: "start-kitap-bitirme-plani", image: "start-matematik/kitap-bitirme-plani.jpg", truth: start.pages[0], subject: "Matematik" },
];
const withOcr = process.argv.includes("--ocr");
const debugDir = path.join(import.meta.dirname, "..", ".ocr-debug", "benchmark");
fs.mkdirSync(debugDir, { recursive: true });

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const lines: string[] = [];
const log = (line = "") => { lines.push(line); console.log(line); };

log("# OCR benchmark");
log(`Tarih: ${new Date().toISOString()} · OCR ölçümü: ${withOcr ? "AÇIK" : "kapalı (yalnızca ön işleme)"}`);
log();
log("## 1) Ön işleme (gerçek fotoğraflar, LLM yok)");
log("| Fotoğraf | Seviye | Sorunlar | Yön | Eğim | Belge güveni | Plan (dalga 1 / toplam) | Varyant süresi |");
log("|---|---|---|---|---|---|---|---|");
for (const item of cases) {
  const gray = limitSize(decodeJpegToGray(fs.readFileSync(path.join(root, item.image))), 2400);
  const quality = analyzeImageQuality(gray);
  const plan = planPreprocessing(quality);
  let renderMs = 0;
  for (const variant of plan.variants.filter((spec) => spec.kind !== "original")) {
    const started = Date.now();
    const { image } = renderVariant(gray, variant, quality, variant.rotate === "auto" ? 0 : variant.rotate);
    renderMs += Date.now() - started;
    fs.writeFileSync(path.join(debugDir, `${item.name}__${variant.id}.jpg`), Buffer.from(encodeGrayToJpegDataUrl(image).split(",")[1], "base64"));
  }
  log(`| ${item.name} | ${quality.level} | ${quality.issues.map((issue) => issue.code).join(", ") || "—"} | ${quality.orientation} | ${quality.skew}° (güven ${quality.skewConfidence}) | ${quality.documentConfidence} | ${plan.variants.filter((spec) => spec.wave === 1).length} / ${plan.variants.length} | ${renderMs} ms |`);
}

log();
log("## 2) Geometri doğruluğu (bilinen dönüşümler)");
let orientationHits = 0, orientationTotal = 0;
const skewErrors: number[] = [];
for (const item of cases) {
  const gray = limitSize(decodeJpegToGray(fs.readFileSync(path.join(root, item.image))), 1400);
  const base = estimateSkew(gray).angle;
  for (const angle of [-3, -1.5, 2, 4]) skewErrors.push(Math.abs(estimateSkew(rotateSmall(gray, angle)).angle - (base + angle)));
  for (const turn of [0, 90, 270] as const) {
    orientationTotal++;
    const sideways = analyzeImageQuality(rotateQuarter(gray, turn)).orientation === "sideways";
    if (sideways === (turn !== 0)) orientationHits++;
  }
}
skewErrors.sort((a, b) => a - b);
log(`- Yan çekim tespiti (0°/90°/270°, ${orientationTotal} deneme): ${orientationHits}/${orientationTotal} doğru`);
log(`- Eğim ölçümü (${skewErrors.length} bilinen dönüş): ortalama hata ${(skewErrors.reduce((sum, value) => sum + value, 0) / skewErrors.length).toFixed(2)}°, en kötü ${skewErrors[skewErrors.length - 1].toFixed(2)}°`);

log();
log("## 3) OCR doğruluğu");
const topics = CURRICULUM.map((def, index) => ({ id: index + 1, ...def }));
const truthText = (page: TocRawPage) => page.items.map((entry) => [entry.label ?? "", entry.title, entry.page ?? ""].filter(Boolean).join(" ")).join("\n");
if (!withOcr || !(process.env.LLM_API_KEY || process.env.OPENAI_API_KEY)) {
  log("Not measured — gerçek OCR için `LLM_API_KEY=... npx tsx scripts/ocr-benchmark.ts --ocr` çalıştırın (ücretli LLM çağrısı yapar).");
  log("CER, WER, ünite/test/sayfa numarası ve konu eşleştirme doğruluğu, nihai güven: Not measured.");
} else {
  const { readTocImage } = await import("../server/bookContent/ocrOrchestrator");
  const { getOcrProvider } = await import("../server/bookContent/ocrProvider");
  log("| Fotoğraf | CER | WER | Ünite | Test/konu satırı | Sayfa no | Konu eşleştirme | Uzlaşı | Geçiş | Süre |");
  log("|---|---|---|---|---|---|---|---|---|---|");
  for (const item of cases) {
    if (!item.truth) continue;
    const dataUrl = `data:image/jpeg;base64,${fs.readFileSync(path.join(root, item.image)).toString("base64")}`;
    const report = await readTocImage(dataUrl, { provider: getOcrProvider() });
    const got = report.page.items;
    const truthUnits = item.truth.items.filter((entry) => entry.type === "unit");
    const unitHits = truthUnits.filter((unit) => got.some((entry) => entry.type === "unit" && entry.unitNumber === unit.unitNumber)).length;
    const truthEntries = item.truth.items.filter((entry) => entry.type === "entry");
    let entryHits = 0, pageHits = 0, mappingHits = 0, mappingTotal = 0;
    for (const expected of truthEntries) {
      const found = got.find((entry) => entry.type === "entry" && (entry.label ?? "") === (expected.label ?? "") && characterErrorRate(expected.title, entry.title) < 0.2);
      if (!found) continue;
      entryHits++;
      if (found.page === expected.page) pageHits++;
      const want = matchTopic(expected.title || "", topics, { subject: item.subject }).best?.topicId;
      if (want !== undefined) { mappingTotal++; if (matchTopic(found.title || "", topics, { subject: item.subject }).best?.topicId === want) mappingHits++; }
    }
    log(`| ${item.name} | ${pct(characterErrorRate(truthText(item.truth), report.rawText))} | ${pct(wordErrorRate(truthText(item.truth), report.rawText))} | ${unitHits}/${truthUnits.length} | ${entryHits}/${truthEntries.length} | ${pageHits}/${truthEntries.length} | ${mappingTotal ? pct(mappingHits / mappingTotal) : "—"} | ${pct(report.agreement)} | ${report.passes.filter((pass) => pass.status === "ok").length} | ${(report.elapsedMs / 1000).toFixed(1)} sn |`);
  }
}
fs.writeFileSync(path.join(debugDir, "report.md"), lines.join("\n") + "\n");
console.log(`\nRapor ve ara görüntüler: ${debugDir}`);
