import { EXAM_KIND_DEFS, type ExamKind } from "./exams";

/**
 * Novara Rehber — akademik takip kuralları (saf, AI'sız, test edilebilir).
 *
 * "Akademik inceleme önerisi" bir teşhis değildir: yalnızca karşılaştırılabilir denemelerde düşüş
 * eğilimi görüldüğünü söyler. Karşılaştırma yalnızca aynı sınav türünde (TYT, AYT, LGS ayrı), aynı
 * hazırlık döneminde, tam denemeler arasında ve bilinen yayınevleri karışmadan yapılır. Veri
 * yetersizse öneri üretilmez; nedeni açıkça söylenir.
 */

export type ComparableExam = {
  id: number;
  examKind: ExamKind;
  date: Date;
  net: number;
  /** Öğrencinin kendi girdiği deneme mi, kurumdan aktarılan mı (Connect). */
  source: "student" | "org";
  publisher?: string | null;
  /** "branch" = branş denemesi; tam denemeyle karşılaştırılmaz. Boşsa tam deneme sayılır. */
  scope?: "full" | "branch" | null;
};

export type CaseConfidence = "high" | "medium";
export type InsufficientReason = "not_enough_exams" | "mixed_publishers" | "different_season" | "too_spread_out";

export type TrendResult =
  | { status: "signal"; examKind: ExamKind; confidence: CaseConfidence; evidence: Array<Pick<ComparableExam, "id" | "date" | "net">>; totalChange: number; steps: number[] }
  | { status: "no_signal"; examKind: ExamKind; evidence: Array<Pick<ComparableExam, "id" | "date" | "net">>; totalChange: number; steps: number[] }
  | { status: "insufficient"; examKind: ExamKind; reason: InsufficientReason; evidence: Array<Pick<ComparableExam, "id" | "date" | "net">> };

export const ACADEMIC_CASE_RULES = {
  /** Karşılaştırılan son deneme sayısı. */
  examsCompared: 3,
  /** Son denemeler en fazla bu kadar gün içine yayılmış olmalı. */
  windowDays: 75,
  /** Toplam düşüş eşiği (net). Sınav türünde tanım yoksa varsayılan. */
  minTotalDrop: { default: 5, LGS: 3 } as Partial<Record<ExamKind | "default", number>>,
  /** Hazırlık dönemi bu ayda başlar (0 = Ocak; 7 = Ağustos): Ağustos–Temmuz arası aynı dönem. */
  seasonStartMonth: 7,
};
export type AcademicCaseRules = typeof ACADEMIC_CASE_RULES;

const DAY = 24 * 60 * 60 * 1000;
const normalizePublisher = (value: string | null | undefined) => (value ?? "").trim().toLocaleLowerCase("tr").replace(/\s+yay[ıi]nlar[ıi]$/, "").replace(/\s+/g, " ") || null;
const round2 = (value: number) => Math.round(value * 100) / 100;

/** Hazırlık dönemi (ör. Ağustos 2026 – Temmuz 2027 → 2026). */
export function seasonOf(date: Date, rules: AcademicCaseRules = ACADEMIC_CASE_RULES): number {
  return date.getMonth() >= rules.seasonStartMonth ? date.getFullYear() : date.getFullYear() - 1;
}

export const minTotalDropFor = (kind: ExamKind, rules: AcademicCaseRules = ACADEMIC_CASE_RULES) => rules.minTotalDrop[kind] ?? rules.minTotalDrop.default ?? 5;

/**
 * Karşılaştırma anahtarı: sınav türü + kapsam (+ biliniyorsa yayınevi). Aynı riskin ikinci kez
 * açık dosya üretmemesi için de bu anahtar kullanılır.
 */
export function comparabilityKey(exam: Pick<ComparableExam, "examKind" | "scope" | "publisher">): string {
  return [exam.examKind, exam.scope ?? "full", normalizePublisher(exam.publisher) ?? "*"].join("|");
}

/**
 * Bir sınav türünde son N tam denemenin düşüş eğilimi. Kural: her adım ≤ 0 ve toplam düşüş ≥ eşik.
 * Güven: tamamı kurumdan ve yayınevi aynı/biliniyorsa "high", diğer geçerli durumlarda "medium".
 */
export function trendDecline(exams: ComparableExam[], examKind: ExamKind, rules: AcademicCaseRules = ACADEMIC_CASE_RULES): TrendResult {
  const recent = exams
    .filter((exam) => exam.examKind === examKind && exam.scope !== "branch" && Number.isFinite(exam.net))
    .sort((a, b) => b.date.getTime() - a.date.getTime() || b.id - a.id)
    .slice(0, rules.examsCompared)
    .reverse();
  const evidence = recent.map(({ id, date, net }) => ({ id, date, net }));
  if (recent.length < rules.examsCompared) return { status: "insufficient", examKind, reason: "not_enough_exams", evidence };
  if (recent.at(-1)!.date.getTime() - recent[0].date.getTime() > rules.windowDays * DAY) return { status: "insufficient", examKind, reason: "too_spread_out", evidence };
  if (new Set(recent.map((exam) => seasonOf(exam.date, rules))).size > 1) return { status: "insufficient", examKind, reason: "different_season", evidence };
  const publishers = new Set(recent.map((exam) => normalizePublisher(exam.publisher)).filter((value): value is string => Boolean(value)));
  if (publishers.size > 1) return { status: "insufficient", examKind, reason: "mixed_publishers", evidence };

  const steps = recent.slice(1).map((exam, index) => round2(exam.net - recent[index].net));
  const totalChange = round2(recent.at(-1)!.net - recent[0].net);
  const declining = steps.every((step) => step <= 0) && -totalChange >= minTotalDropFor(examKind, rules);
  if (!declining) return { status: "no_signal", examKind, evidence, totalChange, steps };
  const allKnown = recent.every((exam) => normalizePublisher(exam.publisher));
  const confidence: CaseConfidence = recent.every((exam) => exam.source === "org") && allKnown ? "high" : "medium";
  return { status: "signal", examKind, confidence, evidence, totalChange, steps };
}

/** Öğrencinin bütün sınav türleri için ayrı ayrı (TYT ve LGS asla aynı karşılaştırmaya girmez). */
export function trendSignals(exams: ComparableExam[], rules: AcademicCaseRules = ACADEMIC_CASE_RULES): TrendResult[] {
  const kinds = Array.from(new Set(exams.map((exam) => exam.examKind)));
  return kinds.map((kind) => trendDecline(exams, kind, rules));
}

export const ACADEMIC_REVIEW_TITLE = "Akademik inceleme önerisi";
export const ACADEMIC_REVIEW_TEXT = "Öğrencinin son üç karşılaştırılabilir denemesinde netleri düşüş eğilimindedir. Çalışma kayıtları ve ders bazlı sonuçlar incelenerek rehberlik görüşmesi değerlendirilmesi önerilir.";

export const INSUFFICIENT_REASON_TEXT: Record<InsufficientReason, string> = {
  not_enough_exams: "Karşılaştırma için bu sınav türünde en az üç tam deneme gerekli.",
  mixed_publishers: "Son denemeler farklı yayınevlerine ait; netler doğrudan karşılaştırılamaz.",
  different_season: "Son denemeler farklı hazırlık dönemlerine ait.",
  too_spread_out: "Son denemeler arasında çok uzun süre var; eğilim güvenilir değil.",
};

export const CONFIDENCE_TEXT: Record<CaseConfidence, string> = {
  high: "Yüksek güven: kurumdan aktarılan, aynı yayınevine ait denemeler.",
  medium: "Orta güven: denemelerin bir kısmı öğrencinin kendi girişi ya da yayınevi bilinmiyor.",
};

/** Ekranda gösterilecek tek satırlık açıklama (ör. "TYT: 82 → 76 → 69 (−13 net)"). */
export function describeTrend(result: TrendResult): string {
  const label = EXAM_KIND_DEFS[result.examKind]?.label ?? result.examKind;
  const chain = result.evidence.map((exam) => String(round2(exam.net)).replace(".", ",")).join(" → ");
  if (result.status === "insufficient") return `${label}: inceleme için yetersiz veri. ${INSUFFICIENT_REASON_TEXT[result.reason]}`;
  const change = String(Math.abs(result.totalChange)).replace(".", ",");
  return `${label}: ${chain} (${result.totalChange < 0 ? "−" : "+"}${change} net)`;
}
