import { invokeLLM } from "../_core/llm";
import { isValidTime, nonExamPresetsFor, scheduleSubjectsFor, toMinutes, type ClassBlock, type ClassPeriod } from "../../shared/classSchedule";
import { EXAM_TRACK_DEFS, type ExamTrack } from "../../shared/exams";

// Ders programı fotoğrafı → okul programı (ders saatleri + gün/ders hücreleri). Okunan program
// kaydedilmez; düzenleyiciye doldurulur, öğrenci kontrol edip kaydeder.

export type ScheduleImport = { periods: ClassPeriod[]; blocks: ClassBlock[]; skipped: number };

// Okul ders adı → sınavın dersi; ilk eşleşen kural kazanır (null = tanınan ama plana girmeyen ders).
// Yeni sınav buraya kendi kurallarıyla eklenir (Record olduğu için TypeScript hatırlatır).
const LESSON_RULES: Record<ExamTrack, Array<[RegExp, string | null]>> = {
  // 8. sınıf: din kültürü ve İngilizce LGS dersidir; seçmeli/uygulama dersleri plana girmez.
  LGS: [
    [/SE[ÇC]MEL[İI]|REHBERL[İI]K|BEDEN|SPOR|G[ÖO]RSEL SANAT|M[ÜU]Z[İI]K|TEKNOLOJ[İI]|B[İI]L[İI][ŞS][İI]M|PEYGAMBER|KUR.?AN|PROJE/, null],
    [/D[İI]N K[ÜU]LT[ÜU]R|AHLAK/, "Din Kültürü"],
    [/YABANCI D[İI]L|[İI]NG[İI]L[İI]ZCE/, "İngilizce"],
    [/[İI]NKILAP|TAR[İI]H/, "İnkılap Tarihi"],
    [/FEN/, "Fen Bilimleri"],
    [/MATEMAT[İI]K/, "Matematik"],
    [/T[ÜU]RK[ÇC]E/, "Türkçe"],
  ],
  YKS: [
    [/D[İI]N K[ÜU]LT[ÜU]R|AHLAK|YABANCI D[İI]L|[İI]NG[İI]L[İI]ZCE|ALMANCA|FRANSIZCA|REHBERL[İI]K|BEDEN|SPOR|G[ÖO]RSEL SANAT|M[ÜU]Z[İI]K|SA[ĞG]LIK B[İI]LG|TRAF[İI]K|PEYGAMBER|KUR.?AN|H[İI]TABET|PROJE/, null],
    [/GEOMETR[İI]/, "Geometri"],
    [/MATEMAT[İI]K/, "Matematik"],
    [/F[İI]Z[İI]K/, "Fizik"],
    [/K[İI]MYA/, "Kimya"],
    [/B[İI]YOLOJ[İI]/, "Biyoloji"],
    [/EDEB[İI]YAT/, "Edebiyat"],
    [/T[ÜU]RK D[İI]L[İI]|T[ÜU]RK[ÇC]E/, "Türkçe"],
    [/TAR[İI]H|[İI]NKILAP/, "Tarih"],
    [/CO[ĞG]RAFYA/, "Coğrafya"],
    [/FELSEFE|MANTIK|PS[İI]KOLOJ[İI]|SOSYOLOJ[İI]/, "Felsefe"],
  ],
};

/**
 * Okul ders adından sınavın dersi (ör. YKS: "HTDE_BİYOLOJİ (SEÇMELİ-2)" → Biyoloji). known=false: ad
 * tanınmadı (modelin seçimine bakılır); known=true ve subject=null: tanınan ama sınav dışı ders.
 */
export function classifyLesson(name: string, track: ExamTrack = "YKS"): { known: boolean; subject: string | null } {
  const value = name.toLocaleUpperCase("tr-TR");
  for (const [pattern, subject] of LESSON_RULES[track]) if (pattern.test(value)) return { known: true, subject };
  return { known: false, subject: null };
}

/** "Fizik", "HTDE Biyoloji (Seçmeli-2)" gibi okunur, kısa etiket. */
function lessonLabel(name: string, code: string, subject: string | null): string {
  const cleaned = name.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return subject ?? (code.trim() || "Ders");
  const titled = cleaned.toLocaleLowerCase("tr-TR").split(" ").map((word) => {
    const index = word.search(/[a-zçğıöşü]/);
    return index < 0 ? word : word.slice(0, index) + word[index].toLocaleUpperCase("tr-TR") + word.slice(index + 1);
  }).join(" ");
  return titled.slice(0, 80);
}

const normalizeTime = (value: unknown) => {
  const match = /^(\d{1,2})[:.](\d{2})$/.exec(String(value ?? "").trim());
  if (!match) return null;
  const time = `${match[1].padStart(2, "0")}:${match[2]}`;
  return isValidTime(time) ? time : null;
};

/** Modelin ham yanıtını doğrular: geçersiz saatler/hücreler atlanır, aynı gün/ders saatine ilk okunan yazılır. */
export function parseScheduleImport(raw: unknown, track: ExamTrack = "YKS"): ScheduleImport {
  const examSubjects: readonly string[] = scheduleSubjectsFor(track);
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const periods = (Array.isArray(value.periods) ? value.periods : []).flatMap((item) => {
    const period = item as Record<string, unknown>;
    const start = normalizeTime(period?.start);
    const end = normalizeTime(period?.end);
    return start && end && toMinutes(start) < toMinutes(end) ? [{ start, end }] : [];
  }).slice(0, 12);
  let skipped = 0;
  const seen = new Set<string>();
  const blocks: ClassBlock[] = [];
  for (const item of Array.isArray(value.lessons) ? value.lessons : []) {
    const lesson = (item ?? {}) as Record<string, unknown>;
    const day = Number(lesson.day);
    const periodIndex = Number(lesson.period) - 1;
    const period = periods[periodIndex];
    const key = `${day}-${periodIndex}`;
    if (!Number.isInteger(day) || day < 1 || day > 7 || !period || seen.has(key)) { skipped += 1; continue; }
    const name = String(lesson.name ?? "").slice(0, 120);
    const code = String(lesson.code ?? "").slice(0, 20);
    if (!name.trim() && !code.trim()) { skipped += 1; continue; }
    seen.add(key);
    // Önce ders adından kendi eşlememiz; ad tanınmazsa modelin seçtiği YKS dersi (listedeyse).
    const byName = classifyLesson(name || code, track);
    const fromModel = examSubjects.includes(lesson.subject as string) ? (lesson.subject as string) : null;
    const subject = byName.known ? byName.subject : fromModel;
    blocks.push({ source: "school", dayOfWeek: day, startTime: period.start, endTime: period.end, subject, label: subject && !/SE[ÇC]MEL[İI]|HTDE/i.test(name) ? subject : lessonLabel(name, code, subject) });
  }
  return { periods, blocks, skipped };
}

const SCHEMA = {
  type: "object",
  properties: {
    periods: { type: "array", items: { type: "object", properties: { start: { type: "string" }, end: { type: "string" } }, required: ["start", "end"], additionalProperties: false } },
    lessons: { type: "array", items: { type: "object", properties: { day: { type: "integer" }, period: { type: "integer" }, code: { type: "string" }, name: { type: "string" }, subject: { type: "string" } }, required: ["day", "period", "code", "name", "subject"], additionalProperties: false } },
  },
  required: ["periods", "lessons"],
  additionalProperties: false,
};

/** Fotoğraftaki haftalık ders programını okur (AI). Hata sağlayıcıdan gelir; çağıran kullanıcı mesajına çevirir. */
export async function readScheduleFromImage(dataUrl: string, invoke: typeof invokeLLM = invokeLLM, track: ExamTrack = "YKS"): Promise<ScheduleImport> {
  const examSubjects = scheduleSubjectsFor(track);
  const response = await invoke({
    messages: [
      {
        role: "system",
        content: `Sen Türk ${EXAM_TRACK_DEFS[track].schoolKind}/dershane haftalık ders programı okuyucususun. Yalnızca görselde görüleni çıkar, uydurma.
- periods: ders saatleri sırasıyla (1. ders, 2. ders...), başlangıç/bitiş "SS:dd".
- lessons: dolu her hücre için bir kayıt. day: 1=Pazartesi … 7=Pazar. period: ders saatinin sıra numarası (1'den başlar).
- code: hücredeki kısaltma (ör. FİZF4). name: dersin tam adı — programın altındaki ders listesinden (Ders → Dersin Adı) bul; liste yoksa kısaltmadan anla.
- subject: dersin ${track} karşılığı, yalnızca şu listeden biri: ${examSubjects.join(", ")}. Bu sınavda sorulmayan dersler (ör. ${nonExamPresetsFor(track).filter((label) => label !== "Diğer ders").join(", ").toLocaleLowerCase("tr")}, seçmeli dersler) için "${EXAM_TRACK_DEFS[track].label} dışı" yaz.
Öğretmen adlarını yazma.`,
      },
      { role: "user", content: [{ type: "text", text: "Bu haftalık ders programını oku." }, { type: "image_url", image_url: { url: dataUrl, detail: "high" } }] },
    ],
    response_format: { type: "json_schema", json_schema: { name: "class_schedule", strict: true, schema: SCHEMA } },
  });
  const content = response.choices[0]?.message?.content;
  const text = typeof content === "string" ? content : content?.map((part) => (part.type === "text" ? part.text : "")).join("") ?? "";
  const result = parseScheduleImport(JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "") || "{}"), track);
  if (!result.periods.length || !result.blocks.length) throw new Error("Programdan ders saati ya da ders okunamadı.");
  return result;
}
