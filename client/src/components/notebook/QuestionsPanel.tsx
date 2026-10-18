import { trpc } from "@/lib/trpc";
import { ERROR_TYPES, QUESTION_STATUS_LABELS, type QuestionStatus } from "@shared/questionNotebook";
import type { inferRouterOutputs } from "@trpc/server";
import { CalendarCheck, Camera, Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { AppRouter } from "../../../../server/routers";
import MoveToSubject from "./MoveToSubject";
import { useNotebook } from "./NotebookProvider";
import { statusTone } from "./QuestionDetail";
import { attachmentUrl } from "./media";

type QuestionItem = inferRouterOutputs<AppRouter>["questions"]["list"]["items"][number];

/** Liste ve ders defteri akışı için soru kartının ihtiyaç duyduğu alanlar. */
export type QuestionCardData = Pick<QuestionItem, "id" | "subject" | "topic" | "questionImageId" | "stuckPoint" | "status" | "errorType" | "nextReviewAt">;

export function QuestionCard({ question, onOpen, footer }: { question: QuestionCardData; onOpen: (id: number) => void; footer?: React.ReactNode }) {
  const next = question.nextReviewAt ? new Date(question.nextReviewAt) : null;
  const due = next ? next.getTime() <= new Date().setHours(23, 59, 59, 999) : false;
  return (
    <div className="overflow-hidden rounded-2xl border border-ink/[0.07] bg-white transition hover:border-brand/40">
    <button onClick={() => onOpen(question.id)} className="flex w-full gap-3 p-3 text-left">
      {question.questionImageId
        ? <img src={attachmentUrl(question.questionImageId)} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-xl bg-paper object-cover" />
        : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-paper text-[26px]" aria-hidden>❓</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-ink">{[question.subject, question.topic].filter(Boolean).join(" · ") || "Soru"}</div>
        {question.stuckPoint && <p className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-ink-3">“{question.stuckPoint}”</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px]">
          <span className={`rounded-full px-2 py-0.5 font-semibold ${statusTone[question.status]}`}>{QUESTION_STATUS_LABELS[question.status]}</span>
          {question.errorType && <span className="rounded-full bg-paper px-2 py-0.5 text-ink-2">{ERROR_TYPES[question.errorType].icon} {ERROR_TYPES[question.errorType].label}</span>}
          {next && <span className={due ? "font-semibold text-success" : "text-ink-4"}>{due ? "🔁 Tekrar zamanı" : `🔁 ${next.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}`}</span>}
        </div>
      </div>
    </button>
    {footer}
    </div>
  );
}

/** Genel Bakış ve defter başı: bugün tekrar bekleyen sorular + "Bugünün planına ekle". */
export function QuestionReviewCard({ compact = false, subject }: { compact?: boolean; /** Ders defteri sekmesi: yalnızca o dersin soruları (undefined = hepsi, null = Genel). */ subject?: string | null }) {
  const notebook = useNotebook();
  const utils = trpc.useUtils();
  const summary = trpc.questions.summary.useQuery(subject === undefined ? undefined : { subject }, { retry: false });
  const addTask = trpc.questions.addReviewTask.useMutation();
  const data = summary.data;
  if (!data || (compact && data.due === 0)) return null;
  const taskDone = data.task?.status === "completed";

  const plan = async () => {
    try {
      const result = await addTask.mutateAsync();
      toast.success(result.created ? `Bugünün planına eklendi · ${data.minutes} dk` : "Bu görev zaten bugünün planında.");
      void utils.questions.summary.invalidate();
      void utils.calendar.snapshot.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Plana eklenemedi.");
    }
  };

  if (data.due === 0) {
    return (
      <div className="rounded-2xl border border-ink/[0.07] bg-white px-4 py-3 text-[13px] text-ink-3">
        🔁 Bugün tekrar bekleyen soru yok.{taskDone ? " Bugünün defter görevi tamamlandı ✓" : ""}
      </div>
    );
  }
  return (
    <div className={`rounded-2xl border border-success/25 bg-success-soft ${compact ? "p-4 sm:p-5" : "p-4"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[14px] font-bold text-success">🔁 Defterimden tekrar zamanı</div>
          <p className="mt-0.5 text-[13px] text-ink-2">{data.due} soru seni bekliyor{data.due > data.reviewCount ? ` (bugün ilk ${data.reviewCount}'i)` : ""} · yaklaşık {data.minutes} dk</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.task
            ? <span className="flex h-10 items-center gap-1.5 rounded-xl bg-white/70 px-3 text-[12px] font-semibold text-success"><CalendarCheck size={14} /> {taskDone ? "Görev tamamlandı" : "Bugünün planında"}</span>
            : <button onClick={() => void plan()} disabled={addTask.isPending} className="flex h-10 items-center gap-1.5 rounded-xl border border-success/30 bg-white px-3 text-[12px] font-semibold text-success disabled:opacity-50"><CalendarCheck size={14} /> Bugünün planına ekle</button>}
          <button onClick={() => notebook.startReview(undefined, subject)} className="flex h-10 items-center gap-1.5 rounded-xl bg-success px-4 text-[13px] font-semibold text-white"><RotateCcw size={14} /> Tekrar çöz</button>
        </div>
      </div>
    </div>
  );
}

/** 📊 Hata Haritam: konu başına açık soru + en sık işaretlenen hata türü. */
export function ErrorMapCard({ onTopic, activeTopic = null, subject }: { onTopic?: (topicId: number | null, subject: string | null) => void; activeTopic?: string | null; subject?: string | null }) {
  const [days, setDays] = useState<30 | null>(30);
  const map = trpc.questions.errorMap.useQuery({ days, subject }, { retry: false });
  const data = map.data;
  const top = data?.topics.filter((item) => item.open > 0).slice(0, 6) ?? [];
  const max = Math.max(1, ...top.map((item) => item.open));
  return (
    <div className="soft-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[14px] font-bold text-ink">📊 Hata Haritam</div>
        <div className="flex rounded-lg bg-paper p-0.5 text-[12px]" role="tablist" aria-label="Dönem">
          {([[30, "30 gün"], [null, "Tümü"]] as const).map(([value, label]) => <button key={label} role="tab" aria-selected={days === value} onClick={() => setDays(value)} className={`h-7 rounded-md px-2.5 font-semibold ${days === value ? "bg-white text-ink shadow-sm" : "text-ink-3"}`}>{label}</button>)}
        </div>
      </div>
      {map.isLoading ? <div className="flex justify-center py-6"><Loader2 className="animate-spin text-brand" size={18} /></div>
        : !top.length ? <p className="mt-3 text-[13px] text-ink-3">{data?.total ? "Bu dönemdeki soruların hepsini öğrenmişsin 🎉" : "Çözemediğin soruları ekledikçe hangi konularda ve neden takıldığın burada görünecek."}</p>
          : (
            <>
              <ul className="mt-3 space-y-2">
                {top.map((item) => (
                  <li key={item.key}>
                    <button onClick={() => onTopic?.(item.topicId, item.topicId ? null : item.subject)} disabled={!onTopic} aria-pressed={activeTopic === item.key} className={`w-full rounded-lg px-1 text-left ${activeTopic === item.key ? "bg-brand-soft" : "hover:bg-paper"}`}>
                      <div className="flex items-baseline justify-between gap-2 text-[13px]"><span className="truncate font-semibold text-ink-2">{item.topic ?? item.subject}{item.topic && <span className="font-normal text-ink-4"> · {item.subject}</span>}</span><span className="shrink-0 font-semibold text-ink">{item.open}</span></div>
                      <div className="mt-1 h-2 rounded-full bg-paper"><div className="h-2 rounded-full bg-danger/70" style={{ width: `${(item.open / max) * 100}%` }} /></div>
                      {item.topErrorType && <div className="mt-0.5 text-[12px] text-ink-4">{ERROR_TYPES[item.topErrorType].icon} çoğunlukla {ERROR_TYPES[item.topErrorType].label.toLocaleLowerCase("tr-TR")}</div>}
                    </button>
                  </li>
                ))}
              </ul>
              {data!.errorTypes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-ink/[0.06] pt-3 text-[12px]">
                  {data!.errorTypes.map((item) => <span key={item.type} className="rounded-full bg-paper px-2 py-0.5 text-ink-2">{ERROR_TYPES[item.type].icon} {ERROR_TYPES[item.type].label} · {item.count}</span>)}
                </div>
              )}
              <p className="mt-2 text-[12px] text-ink-4">Hata türleri senin (ya da onayladığın ✨ önerilerin) işaretlemelerinden gelir.</p>
            </>
          )}
    </div>
  );
}

/**
 * ❓ Sorularım — Soru Defterim: çözemediğin soruları ekle, zamanı gelince
 * tekrar çöz, hangi konuda/neden takıldığını gör. Çözülenler basamak atlar,
 * son basamaktan sonra "öğrenildi" olur.
 */
export default function QuestionsPanel() {
  const notebook = useNotebook();
  const [status, setStatus] = useState<"open" | "mastered" | "all">("open");
  const [focus, setFocus] = useState<{ key: string; topicId: number | null; subject: string | null } | null>(null);
  const summary = trpc.questions.summary.useQuery(undefined, { retry: false });
  const list = trpc.questions.list.useInfiniteQuery({ status, topicId: focus?.topicId ?? null, subject: focus?.subject ?? undefined }, { getNextPageParam: (page) => page.nextCursor ?? undefined, retry: false });
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const totals = summary.data?.totals;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl bg-brand-strong p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[16px] font-semibold">📷 Takıldığın soruyu yakala</div>
          <p className="mt-0.5 text-[13px] text-white/70">Fotoğrafla, nerede takıldığını söyle — defterin onu 1, 3, 7, 14 ve 30 gün sonra yeniden karşına çıkarsın.</p>
          {totals && (totals.unsolved + totals.learning + totals.mastered > 0) && (
            <div className="mt-2 flex flex-wrap gap-1.5 text-[12px]">
              {(["unsolved", "learning", "mastered"] as QuestionStatus[]).map((key) => <span key={key} className="rounded-full bg-white/10 px-2 py-0.5">{QUESTION_STATUS_LABELS[key]} · {totals[key]}</span>)}
            </div>
          )}
        </div>
        <button onClick={() => notebook.captureQuestion()} className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-[14px] font-semibold text-ink"><Camera size={17} /> Soru ekle</button>
      </div>

      <QuestionReviewCard />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-paper p-1" role="tablist" aria-label="Soru durumu">
              {([["open", "Açık"], ["mastered", "Öğrenilen"], ["all", "Tümü"]] as const).map(([key, label]) => <button key={key} role="tab" aria-selected={status === key} onClick={() => setStatus(key)} className={`h-9 rounded-lg px-3 text-[13px] font-semibold ${status === key ? "bg-white text-ink shadow-sm" : "text-ink-3"}`}>{label}</button>)}
            </div>
            {focus && <button onClick={() => setFocus(null)} className="rounded-full bg-brand-soft px-3 py-1 text-[12px] font-semibold text-brand">Konu filtresi ×</button>}
          </div>
          {list.isLoading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand" size={22} /></div>
            : list.isError ? <div className="rounded-2xl bg-danger-soft p-4 text-[13px] text-danger">Sorular yüklenemedi. <button onClick={() => void list.refetch()} className="font-semibold underline">Tekrar dene</button></div>
              : items.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-ink/15 p-8 text-center">
                  <div className="text-[30px]" aria-hidden>📓</div>
                  <p className="mt-2 text-[14px] font-semibold text-ink">{status === "mastered" ? "Henüz son basamağı geçen soru yok." : focus ? "Bu konuda açık soru yok." : "Defterinde henüz soru yok."}</p>
                  {status !== "mastered" && !focus && <p className="mt-1 text-[13px] text-ink-3">Ders çalışırken çözemediğin ilk soruyu fotoğrafla — gerisini defterin hatırlar.</p>}
                </div>
              ) : <div className="grid gap-2 md:grid-cols-2">{items.map((question) => <QuestionCard key={question.id} question={question} onOpen={notebook.openQuestion} footer={!question.subject && <MoveToSubject noteId={question.noteId} />} />)}</div>}
          {list.hasNextPage && <div className="text-center"><button onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage} className="h-10 rounded-xl border border-ink/10 px-5 text-[13px] font-semibold text-ink-2">{list.isFetchingNextPage ? "Yükleniyor…" : "Daha fazla göster"}</button></div>}
        </div>
        <ErrorMapCard activeTopic={focus?.key ?? null} onTopic={(topicId, subject) => { const key = topicId !== null ? `t${topicId}` : `s${subject}`; setFocus(focus?.key === key ? null : { key, topicId, subject }); setStatus("open"); }} />
      </div>
    </div>
  );
}
