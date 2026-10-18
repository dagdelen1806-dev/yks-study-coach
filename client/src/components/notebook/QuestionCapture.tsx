import { trpc } from "@/lib/trpc";
import { DIFFICULTIES, ERROR_TYPES, type Difficulty, type ErrorType } from "@shared/questionNotebook";
import { Camera, ChevronDown, Loader2, Mic, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import NoteImageDialog from "./NoteImageDialog";
import VoiceRecorder from "./VoiceRecorder";
import { newClientId } from "./drafts";
import { attachmentUrl } from "./media";
import { useCurriculumTopics } from "./useNotebookData";

export type QuestionPrefill = { subject?: string | null; topicId?: number | null; studySessionId?: number | null; bookId?: string | null };

const QUESTION_AI_CONSENT_KEY = "pusula:question-ai-consent";

/** Seçim çipi: AI önerisiyse küçük "✨ öneri" işareti taşır; öğrenci dokununca kendi seçimi olur. */
export function Chip({ active, onClick, children, suggested }: { active: boolean; onClick: () => void; children: React.ReactNode; suggested?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${active ? "border-brand bg-brand-soft text-brand" : "border-ink/10 text-ink-2 hover:bg-paper"}`}>
      {children}{active && suggested && <span className="ml-1 text-violet">✨</span>}
    </button>
  );
}

/**
 * 📷 Soru ekle — çözülemeyen soruyu 3 dokunuşta deftere al: fotoğraf → "nerede
 * takıldın?" (yaz ya da söyle) → kaydet. Ders/konu/hata türü/zorluk isteğe
 * bağlı; "✨ Öner" bunları fotoğraftan ÖNERİR, öğrenci onaylar ya da düzeltir.
 * Çözüm notu sonradan da eklenebilir. İlk tekrar ertesi gün.
 */
export default function QuestionCapture({ prefill, onClose, onSaved }: { prefill?: QuestionPrefill; onClose: () => void; onSaved?: (id: number) => void }) {
  const utils = trpc.useUtils();
  const { topics, subjects } = useCurriculumTopics();
  const [clientId] = useState(newClientId);
  const [imageId, setImageId] = useState<number | null>(null);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [stuckPoint, setStuckPoint] = useState("");
  const [voice, setVoice] = useState<{ attachmentId: number; duration: number } | null>(null);
  const [subject, setSubject] = useState<string>(prefill?.subject ?? "");
  const [topicId, setTopicId] = useState<number | null>(prefill?.topicId ?? null);
  const [errorType, setErrorType] = useState<ErrorType | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [solutionText, setSolutionText] = useState("");
  const [solutionImageId, setSolutionImageId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<null | "photo" | "solutionPhoto" | "voice" | "solutionVoice" | "consent">(null);
  // AI önerisi: hangi alanlar hâlâ AI'ın önerdiği değerde (öğrenci değiştirince işaret kalkar).
  const [suggested, setSuggested] = useState<{ topicId: number | null; topic: boolean; errorType: boolean; difficulty: boolean } | null>(null);
  const suggest = trpc.questions.suggest.useMutation();
  const create = trpc.questions.create.useMutation();

  const subjectTopics = topics.filter((topic) => !subject || topic.subject === subject);
  const canSuggest = Boolean(imageId || stuckPoint.trim());
  const canSave = Boolean(imageId || stuckPoint.trim());

  const runSuggest = async (consentGiven = false) => {
    let consent = consentGiven;
    try { consent = consent || localStorage.getItem(QUESTION_AI_CONSENT_KEY) === "1"; } catch {}
    if (!consent) { setDialog("consent"); return; }
    try {
      const result = await suggest.mutateAsync({ attachmentId: imageId, stuckPoint: stuckPoint.trim() || null });
      if (result.ocrText) setOcrText(result.ocrText);
      if (result.topicId) { setTopicId(result.topicId); setSubject(result.subject ?? subject); }
      if (result.errorType && !errorType) setErrorType(result.errorType);
      if (result.difficulty && !difficulty) setDifficulty(result.difficulty);
      setSuggested({ topicId: result.topicId, topic: Boolean(result.topicId), errorType: Boolean(result.errorType && !errorType), difficulty: Boolean(result.difficulty && !difficulty) });
      toast.success(result.topicId ? "✨ Öneriler hazır — doğruysa bırak, değilse düzelt." : "✨ Konu emin olunamadı; ders ve konuyu sen seçer misin?");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Öneri hazırlanamadı.");
    }
  };

  const save = async () => {
    if (!canSave) { toast.error("Sorunun fotoğrafını ekle ya da nerede takıldığını yaz."); return; }
    try {
      const question = await create.mutateAsync({
        clientId,
        questionImageId: imageId,
        questionOcrText: ocrText,
        voiceAttachmentId: voice?.attachmentId ?? null,
        voiceDuration: voice?.duration ?? null,
        stuckPoint: stuckPoint.trim() || null,
        subject: subject || null,
        topicId,
        aiTopicId: suggested?.topicId ?? null,
        errorType,
        errorTypeSource: errorType ? (suggested?.errorType ? "ai" : "student") : null,
        difficulty,
        solutionText: solutionText.trim() || null,
        solutionImageId,
        studySessionId: prefill?.studySessionId ?? null,
        bookId: prefill?.bookId ?? null,
      });
      void utils.questions.invalidate();
      void utils.notes.list.invalidate();
      void utils.notes.calendar.invalidate();
      toast.success("📓 Soru defterine eklendi · ilk tekrar yarın");
      onSaved?.(question.id);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Soru kaydedilemedi.");
    }
  };

  return (
    <div className="modal-backdrop items-end sm:items-center" style={{ zIndex: 310 }} onMouseDown={(event) => event.target === event.currentTarget && !create.isPending && onClose()}>
      <div className="modal-card max-h-[92vh] max-w-[560px] overflow-y-auto" role="dialog" aria-modal="true" aria-label="Soru ekle">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[16px] font-semibold text-ink">📷 Çözemediğin soruyu ekle</div>
            <p className="text-[12px] text-ink-3">Fotoğrafla, nerede takıldığını anlat — gerisini sonra da tamamlayabilirsin.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-3 hover:bg-paper" aria-label="Kapat"><X size={16} /></button>
        </div>

        {/* 1 · Fotoğraf */}
        <div className="mt-4">
          {imageId ? (
            <div className="relative overflow-hidden rounded-2xl border border-ink/10 bg-paper">
              <img src={attachmentUrl(imageId)} alt="Soru fotoğrafı" className="mx-auto max-h-60 object-contain" />
              <button onClick={() => { setImageId(null); setOcrText(null); }} className="absolute right-2 top-2 rounded-lg bg-white/90 px-2 py-1 text-[12px] font-semibold text-ink-2 shadow">Değiştir</button>
            </div>
          ) : (
            <button onClick={() => setDialog("photo")} className="flex h-32 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-brand/30 text-[14px] font-semibold text-brand hover:bg-brand-soft"><Camera size={26} /> Soru fotoğrafı çek / seç</button>
          )}
        </div>

        {/* 2 · Takıldığım yer */}
        <label className="mt-4 block">
          <span className="form-label">❓ Nerede takıldın?</span>
          <div className="relative">
            <textarea value={stuckPoint} onChange={(event) => setStuckPoint(event.target.value)} maxLength={4000} rows={3} placeholder="Örn. İkinci adımdan sonra ne yapacağımı anlamadım…" className="form-input min-h-[84px] py-2 pr-12" />
            <button type="button" onClick={() => setDialog("voice")} className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-xl bg-danger text-white" aria-label="Sesle anlat"><Mic size={16} /></button>
          </div>
          {voice && <span className="mt-1 block text-[12px] text-ink-3">🎙️ Ses kaydı karta eklenecek</span>}
        </label>

        {/* 3 · Ders / konu (+ ✨ Öner) */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="form-label mb-0">Ders ve konu</span>
          <button type="button" onClick={() => void runSuggest()} disabled={!canSuggest || suggest.isPending} className="flex h-8 items-center gap-1.5 rounded-lg bg-violet-soft px-3 text-[12px] font-semibold text-violet disabled:opacity-40">
            {suggest.isPending ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Öner
          </button>
        </div>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          <select aria-label="Ders" value={subject} onChange={(event) => { setSubject(event.target.value); setTopicId(null); setSuggested((current) => current && { ...current, topic: false }); }} className="form-input h-10"><option value="">Ders seç…</option>{subjects.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select aria-label="Konu" value={topicId ?? ""} onChange={(event) => { const id = event.target.value ? Number(event.target.value) : null; const topic = topics.find((item) => item.id === id); setTopicId(id); if (topic) setSubject(topic.subject); setSuggested((current) => current && { ...current, topic: false }); }} className="form-input h-10"><option value="">Konu seç…</option>{subjectTopics.map((topic) => <option key={topic.id} value={topic.id}>{subject ? "" : `${topic.subject} · `}{topic.topic}</option>)}</select>
        </div>
        {suggested?.topic && topicId && <p className="mt-1 text-[12px] text-violet">✨ AI önerisi — yanlışsa listeden düzelt.</p>}

        {/* 4 · Hata türü + zorluk */}
        <div className="mt-4">
          <span className="form-label">Muhtemel hata türü <span className="font-normal text-ink-4">(isteğe bağlı)</span></span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(ERROR_TYPES) as ErrorType[]).map((key) => (
              <Chip key={key} active={errorType === key} suggested={suggested?.errorType} onClick={() => { setErrorType(errorType === key ? null : key); setSuggested((current) => current && { ...current, errorType: false }); }}>{ERROR_TYPES[key].icon} {ERROR_TYPES[key].label}</Chip>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <span className="form-label">Zorluk</span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(DIFFICULTIES) as Difficulty[]).map((key) => (
              <Chip key={key} active={difficulty === key} suggested={suggested?.difficulty} onClick={() => { setDifficulty(difficulty === key ? null : key); setSuggested((current) => current && { ...current, difficulty: false }); }}>{DIFFICULTIES[key]}</Chip>
            ))}
          </div>
        </div>

        {/* 5 · Çözüm notu (isteğe bağlı) */}
        <button type="button" onClick={() => setShowSolution((value) => !value)} aria-expanded={showSolution} className="mt-4 flex w-full items-center justify-between rounded-xl bg-paper px-3 py-2.5 text-left text-[13px] font-semibold text-ink-2">
          🗣️ Çözüm notu {solutionText || solutionImageId ? "✓" : "(isteğe bağlı — sonra da eklenebilir)"} <ChevronDown size={14} className={showSolution ? "rotate-180" : ""} />
        </button>
        {showSolution && (
          <div className="mt-2 space-y-2">
            <div className="relative">
              <textarea value={solutionText} onChange={(event) => setSolutionText(event.target.value)} maxLength={4000} rows={3} placeholder="Örn. Öğretmen önce paydayı eşitledi…" className="form-input min-h-[84px] py-2 pr-12" aria-label="Çözüm notu" />
              <button type="button" onClick={() => setDialog("solutionVoice")} className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-xl bg-danger text-white" aria-label="Çözümü sesle anlat"><Mic size={16} /></button>
            </div>
            {solutionImageId
              ? <div className="flex items-center gap-2"><img src={attachmentUrl(solutionImageId)} alt="Çözüm fotoğrafı" className="h-16 rounded-lg border border-ink/10" /><button onClick={() => setSolutionImageId(null)} className="text-[12px] font-semibold text-ink-3">Kaldır</button></div>
              : <button type="button" onClick={() => setDialog("solutionPhoto")} className="flex h-9 items-center gap-1.5 rounded-lg border border-ink/10 px-3 text-[12px] font-semibold text-ink-2"><Camera size={14} /> Çözüm fotoğrafı ekle</button>}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="h-11 rounded-xl border border-ink/10 px-4 text-[13px] font-semibold text-ink-3">Vazgeç</button>
          <button onClick={() => void save()} disabled={!canSave || create.isPending} className="flex h-11 items-center gap-2 rounded-xl bg-brand hover:bg-brand-strong px-5 text-[14px] font-semibold text-white disabled:opacity-40">{create.isPending && <Loader2 size={15} className="animate-spin" />} Defterime kaydet</button>
        </div>
      </div>

      {dialog === "photo" && <NoteImageDialog confirmLabel="Soruyu ekle" onClose={() => setDialog(null)} onDone={(id) => { setDialog(null); setImageId(id); setOcrText(null); }} />}
      {dialog === "solutionPhoto" && <NoteImageDialog confirmLabel="Çözümü ekle" onClose={() => setDialog(null)} onDone={(id) => { setDialog(null); setSolutionImageId(id); }} />}
      {dialog === "voice" && <VoiceRecorder onClose={() => setDialog(null)} onDone={(result) => { setDialog(null); setStuckPoint((current) => [current.trim(), result.text].filter(Boolean).join(" ")); if (result.attachmentId) setVoice({ attachmentId: result.attachmentId, duration: result.durationSec }); }} />}
      {dialog === "solutionVoice" && <VoiceRecorder offerKeepAudio={false} onClose={() => setDialog(null)} onDone={(result) => { setDialog(null); setSolutionText((current) => [current.trim(), result.text].filter(Boolean).join(" ")); }} />}
      {dialog === "consent" && (
        <div className="modal-backdrop" style={{ zIndex: 320 }} onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}>
          <div className="modal-card max-w-[400px]">
            <h2 className="text-[16px] font-semibold text-ink">✨ Öneri için AI kullanımı</h2>
            <p className="mt-2 text-[13px] leading-5 text-ink-2"><strong>Soru fotoğrafı</strong> ve <strong>takıldığın yer için yazdıkların</strong> AI servisine gönderilir. AI yalnızca ders, konu, zorluk ve olası hata türü <em>önerir</em>; hiçbirini sen onaylamadan kesinleştirmez.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDialog(null)} className="h-10 rounded-xl border border-ink/10 px-4 text-[13px] font-semibold text-ink-3">Vazgeç</button>
              <button onClick={() => { try { localStorage.setItem(QUESTION_AI_CONSENT_KEY, "1"); } catch {} setDialog(null); void runSuggest(true); }} className="h-10 rounded-xl bg-violet px-4 text-[13px] font-semibold text-white">Anladım, öner</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
