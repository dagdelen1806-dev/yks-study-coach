// Defterim ders sekmeleri: simge ve sıra. Müfredatta olmayan (ör. eski kayıtlardaki)
// dersler de içerik varsa sekme olarak görünür, sıranın sonuna eklenir.

const SUBJECT_ICONS: Record<string, string> = {
  Türkçe: "📖",
  Matematik: "📐",
  Geometri: "📏",
  Fizik: "⚛️",
  Kimya: "🧪",
  Biyoloji: "🧬",
  Edebiyat: "✒️",
  Tarih: "🏛️",
  Coğrafya: "🌍",
  Felsefe: "💭",
  "Din Kültürü": "🕌",
  Fen: "🔬",
  Sosyal: "🗺️",
};

/** Her öğrencide her zaman görünen temel ders defterleri (TYT/AYT sırası). */
export const CORE_SUBJECTS = ["Türkçe", "Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji", "Edebiyat", "Tarih", "Coğrafya", "Felsefe", "Din Kültürü"];

export const subjectIcon = (subject: string | null) => (subject ? SUBJECT_ICONS[subject] ?? "📘" : "📒");

/** Sekme kimliği: "all" = tüm defter, "general" = derssiz, aksi halde ders adı. */
export type NotebookTab = { kind: "all" } | { kind: "general" } | { kind: "subject"; subject: string };
export const tabKey = (tab: NotebookTab) => (tab.kind === "subject" ? `s:${tab.subject}` : tab.kind);
export const parseTabKey = (value: string | null): NotebookTab => (value === "general" ? { kind: "general" } : value?.startsWith("s:") ? { kind: "subject", subject: value.slice(2) } : { kind: "all" });

/** Sekme sırası: temel dersler, sonra içerik olan diğer dersler (alfabetik). */
export function orderedSubjects(withContent: string[]): string[] {
  const extra = withContent.filter((subject) => !CORE_SUBJECTS.includes(subject)).sort((a, b) => a.localeCompare(b, "tr"));
  return [...CORE_SUBJECTS, ...extra];
}
