import { EXAM_KIND_DEFS, type ExamKind } from "./exams";

/**
 * Yönetim Paneli → Sınav konuları Excel dosyası. Dışa aktarılan dosya aynı zamanda içe aktarma şablonudur:
 * Kimlik dolu satır o konuyu günceller, boşsa yeni konu (ya da aynı adlı konuya eşlenir). Okunan sütunlar:
 * Kimlik, Sınav, Ders, Ünite, Konu, Gizli; diğerleri (Kaynak, Öğrenci sayısı, Eski adlar) bilgi içindir.
 */
export const TOPIC_SHEET_COLUMNS = ["Kimlik", "Sınav", "Ders", "Ünite", "Konu", "Gizli", "Kaynak", "Öğrenci sayısı", "Eski adlar"] as const;

export type TopicSheetRow = { line: number; id: number | null; subject: string; unit: string; topic: string; hidden: boolean | null };

const normalize = (value: string) => value.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]/g, "");
const HEADER_ALIASES: Record<"id" | "exam" | "subject" | "unit" | "topic" | "hidden", string[]> = {
  id: ["kimlik", "id", "konuid", "konukimligi"],
  exam: ["sinav", "sinavturu", "exam"],
  subject: ["ders", "dersadi", "subject"],
  unit: ["unite", "uniteadi", "bolum", "unit"],
  topic: ["konu", "konuadi", "topic"],
  hidden: ["gizli", "gizlimi", "hidden"],
};
const TRUE_WORDS = new Set(["evet", "e", "1", "true", "x", "gizli", "var"]);
const FALSE_WORDS = new Set(["hayir", "h", "0", "false", "yok", "gorunur", "acik"]);
const text = (value: unknown) => (value === null || value === undefined ? "" : String(value).trim());

export function parseHiddenCell(value: unknown): boolean | null {
  const word = normalize(text(value));
  if (!word) return null;
  if (TRUE_WORDS.has(word)) return true;
  if (FALSE_WORDS.has(word)) return false;
  return null;
}

const examMatches = (cell: string, exam: ExamKind) => {
  const word = normalize(cell);
  return !word || word === normalize(exam) || word === normalize(EXAM_KIND_DEFS[exam].label);
};

/**
 * `records`: sheet_to_json çıktısı (başlık satırı anahtar). Satır numarası Excel'deki gibidir (başlık 1. satır).
 * Sınav sütunu dolu ve seçili sınavdan farklı olan satırlar `otherExamLines`e ayrılır; Ders/Ünite/Konu sütunu
 * yoksa `missingColumns` döner.
 */
export function parseTopicSheet(records: Array<Record<string, unknown>>, exam: ExamKind): { rows: TopicSheetRow[]; otherExamLines: number[]; missingColumns: string[] } {
  const headers = Object.keys(records[0] ?? {});
  const column = (field: keyof typeof HEADER_ALIASES) => headers.find((header) => HEADER_ALIASES[field].includes(normalize(header)));
  const columns = { id: column("id"), exam: column("exam"), subject: column("subject"), unit: column("unit"), topic: column("topic"), hidden: column("hidden") };
  const missingColumns = (["subject", "unit", "topic"] as const).filter((field) => !columns[field]).map((field) => ({ subject: "Ders", unit: "Ünite", topic: "Konu" })[field]);
  if (missingColumns.length) return { rows: [], otherExamLines: [], missingColumns };
  const rows: TopicSheetRow[] = [];
  const otherExamLines: number[] = [];
  records.forEach((record, index) => {
    const line = index + 2;
    const subject = text(record[columns.subject!]);
    const unit = text(record[columns.unit!]);
    const topic = text(record[columns.topic!]);
    if (!subject && !unit && !topic) return; // boş satır
    if (columns.exam && !examMatches(text(record[columns.exam]), exam)) { otherExamLines.push(line); return; }
    const rawId = columns.id ? Number(text(record[columns.id])) : NaN;
    rows.push({ line, id: Number.isInteger(rawId) && rawId > 0 ? rawId : null, subject, unit, topic, hidden: columns.hidden ? parseHiddenCell(record[columns.hidden]) : null });
  });
  return { rows, otherExamLines, missingColumns };
}
