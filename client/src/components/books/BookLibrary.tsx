import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import { BookOpen, Loader2, ScanLine, Target, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AppRouter } from "../../../../server/routers";
import BookContentScanner, { type ScannerBook } from "./BookContentScanner";
import { NoteCard } from "../notebook/NoteList";
import { useNotebook } from "../notebook/NotebookProvider";
import { toLocalDateKey } from "@shared/dates";
import { palette } from "@shared/palette";

type Recommendation = inferRouterOutputs<AppRouter>["bookContent"]["recommendations"][number];
type ContentRow = inferRouterOutputs<AppRouter>["bookContent"]["contents"][number];

const SNOOZE_KEY = "pusula:book-reco-snoozed";
const todayKey = () => toLocalDateKey();
const recoKey = (rec: Pick<Recommendation, "topicId" | "bookId">) => `${rec.bookId}:${rec.topicId}`;

// "Sonra" yalnızca bugün için gizler; tarayıcıya özel bir kolaylık (kalıcı veri değil).
function readSnoozed(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? "{}") as { date?: string; keys?: string[] };
    return parsed.date === todayKey() ? parsed.keys ?? [] : [];
  } catch {
    return [];
  }
}
function writeSnoozed(keys: string[]) {
  try { localStorage.setItem(SNOOZE_KEY, JSON.stringify({ date: todayKey(), keys })); } catch {}
}

const describeTarget = (rec: Recommendation) => [
  rec.unitNumber !== null ? `Ünite ${rec.unitNumber}` : rec.unitTitle,
  rec.testRange ? `Test ${rec.testRange}` : rec.labels.join(", "),
  rec.pageStart !== null ? `Sayfa ${rec.pageStart}${rec.pageEnd && rec.pageEnd !== rec.pageStart ? `–${rec.pageEnd}` : ""}` : null,
].filter(Boolean).join(" · ");

function useAddToPlan() {
  const utils = trpc.useUtils();
  return trpc.bookContent.addToPlan.useMutation({
    onSuccess: async (result) => {
      const day = new Date(`${result.date}T12:00:00Z`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
      toast.success(`Plana eklendi: ${day} · ${result.minutes} dk`);
      await Promise.all([utils.bookContent.recommendations.invalidate(), utils.calendar.snapshot.invalidate()]);
    },
    onError: (error) => toast.error(error.message),
  });
}

function RecommendationRow({ rec, bookTitle, onSnooze }: { rec: Recommendation; bookTitle: string; onSnooze?: () => void }) {
  const addToPlan = useAddToPlan();
  const busy = addToPlan.isPending;
  return (
    <div className="rounded-2xl border border-ink/[0.07] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-ink">{rec.subject} — {rec.topic}</div>
          <div className="mt-1 text-[12px] text-ink-3">📚 {bookTitle}</div>
          <div className="mt-0.5 text-[12px] text-ink-3">📖 {describeTarget(rec)}</div>
        </div>
        <div className="shrink-0 text-right">
          {rec.purpose === "review"
            ? <div className="rounded-full bg-warn-soft px-2 py-0.5 text-[12px] font-bold text-warn">Tekrar · %{Math.round(rec.weakness * 100)}</div>
            : <div className="rounded-full bg-danger-soft px-2 py-0.5 text-[12px] font-bold text-danger">Zayıflık %{Math.round(rec.weakness * 100)}</div>}
          <div className="mt-1 text-[12px] font-semibold text-ink">⏱️ {rec.minutes} dk</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => addToPlan.mutate({ topicId: rec.topicId, bookId: rec.bookId, bookTitle, when: "today" })} className="h-8 rounded-lg bg-brand px-3 text-[12px] font-semibold text-white disabled:opacity-50">Bugün çalış</button>
        <button disabled={busy} onClick={() => addToPlan.mutate({ topicId: rec.topicId, bookId: rec.bookId, bookTitle, when: "auto" })} className="h-8 rounded-lg border border-brand/25 px-3 text-[12px] font-semibold text-brand disabled:opacity-50">Plana ekle</button>
        {onSnooze && <button disabled={busy} onClick={onSnooze} className="h-8 rounded-lg px-3 text-[12px] font-semibold text-ink-3 hover:text-ink-2">Sonra</button>}
        {busy && <Loader2 className="animate-spin self-center text-brand" size={14} />}
      </div>
    </div>
  );
}

/**
 * "🎯 Bugünkü öneri" — zayıf konuların için, rafındaki kitaplardan çalışma
 * önerisi. Planı kendiliğinden değiştirmez; her öneri öğrencinin açık bir
 * tercihiyle ("Bugün çalış" / "Plana ekle") plana girer.
 */
export function BookRecommendationsCard({ bookTitles }: { bookTitles: Record<string, string> }) {
  const utils = trpc.useUtils();
  const recommendations = trpc.bookContent.recommendations.useQuery(undefined, { retry: false });
  const summaries = trpc.bookContent.summaries.useQuery(undefined, { retry: false, staleTime: 30_000 });
  const autoSchedule = trpc.bookContent.autoSchedule.useQuery(undefined, { retry: false });
  const setAutoSchedule = trpc.bookContent.setAutoSchedule.useMutation({ onSuccess: (enabled) => { utils.bookContent.autoSchedule.setData(undefined, enabled); toast.success(enabled ? "Kitap görevleri artık kapasitene göre otomatik planlanacak." : "Otomatik planlama kapatıldı; öneriler yalnızca önerilecek."); }, onError: (error) => toast.error(error.message) });
  const runAutoSchedule = trpc.bookContent.runAutoSchedule.useMutation({
    onSuccess: async ({ added }) => {
      if (added > 0) toast.success(`${added} kitap görevi otomatik olarak planına eklendi.`);
      await Promise.all([utils.bookContent.recommendations.invalidate(), utils.calendar.snapshot.invalidate()]);
    },
  });
  const [snoozed, setSnoozed] = useState<string[]>(readSnoozed);

  // Tercih açıksa günde bir kez otomatik planla (tarayıcı başına; sunucu tarafı zaten idempotent).
  useEffect(() => {
    if (!autoSchedule.data || !recommendations.data?.length || runAutoSchedule.isPending) return;
    const key = "pusula:book-autoschedule-ran";
    try { if (localStorage.getItem(key) === todayKey()) return; localStorage.setItem(key, todayKey()); } catch {}
    runAutoSchedule.mutate({ bookTitles });
  }, [autoSchedule.data, recommendations.data?.length]);

  const visible = (recommendations.data ?? []).filter((rec) => !snoozed.includes(recoKey(rec))).slice(0, 3);
  const hasScannedBook = Boolean(summaries.data?.some((summary) => summary.entries > 0));
  if (!hasScannedBook && !recommendations.data?.length) return null;

  const toggle = (
    <label className="flex cursor-pointer items-center gap-2 text-[12px] text-ink-2">
      <input type="checkbox" className="h-4 w-4 accent-brand" checked={Boolean(autoSchedule.data)} disabled={autoSchedule.isLoading || setAutoSchedule.isPending} onChange={(event) => setAutoSchedule.mutate({ enabled: event.target.checked })} />
      Zayıf konular için kitapları otomatik planla
    </label>
  );
  if (visible.length === 0) {
    return <div className="soft-card flex flex-wrap items-center justify-between gap-3 border-brand/10 bg-brand-soft px-5 py-3"><span className="text-[13px] text-ink-3">🎯 Şu an kitaplarından önerilecek zayıf konu yok.</span>{toggle}</div>;
  }

  const snooze = (rec: Recommendation) => {
    const next = [...snoozed, recoKey(rec)];
    setSnoozed(next);
    writeSnoozed(next);
  };

  return (
    <div className="soft-card border-brand/15 bg-brand-soft p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="eyebrow text-brand">🎯 Bugünkü öneri</div>
          <h2 className="mt-1 text-[21px] font-semibold text-ink font-display">Zayıf konularını kendi kitaplarından çalış.</h2>
        </div>
        <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-[12px] font-bold text-brand">{recommendations.data?.length ?? 0} öneri</span>
      </div>
      <div className="mt-2">{toggle}</div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {visible.map((rec) => <RecommendationRow key={recoKey(rec)} rec={rec} bookTitle={bookTitles[rec.bookId] ?? "Kitabın"} onSnooze={() => snooze(rec)} />)}
      </div>
    </div>
  );
}

type Completion = inferRouterOutputs<AppRouter>["bookContent"]["summaries"][number]["completion"];

/** Tamamlanma oranına göre renk: başlangıç → yolda → bitmek üzere → tamamlandı. */
const completionTone = (percent: number) => (percent >= 100 ? palette.success : percent >= 70 ? palette.success : percent >= 30 ? palette.brand : palette.ink3);

export function CompletionBar({ completion, compact = false }: { completion: Completion; compact?: boolean }) {
  if (completion.percent === null) return null;
  const tone = completionTone(completion.percent);
  const unit = completion.basis === "contents" ? "içerik" : "sayfa";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold" style={{ color: tone }}>%{completion.percent} tamamlandı{completion.percent >= 100 ? " ✓" : ""}</span>
        <span className="text-[12px] text-ink-3">{completion.done}/{completion.total} {unit}{!compact && completion.accuracy !== null ? ` · %${completion.accuracy} doğruluk` : ""}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-rule" role="progressbar" aria-valuenow={completion.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Kitap tamamlanma oranı">
        <div className="h-full rounded-full transition-all" style={{ width: `${completion.percent}%`, background: tone }} />
      </div>
    </div>
  );
}

/** Raf kartındaki tamamlanma puanı + içerik özeti + "Kitabı aç". */
export function BookContentBadge({ bookId, onOpen }: { bookId: string; onOpen: () => void }) {
  const summaries = trpc.bookContent.summaries.useQuery(undefined, { retry: false, staleTime: 30_000 });
  const recommendations = trpc.bookContent.recommendations.useQuery(undefined, { retry: false, staleTime: 30_000 });
  const summary = summaries.data?.find((item) => item.bookId === bookId);
  const weakMatches = recommendations.data?.filter((rec) => rec.bookId === bookId).length ?? 0;
  const scanned = Boolean(summary?.entries);
  return (
    <button onClick={onOpen} className="mt-3 w-full rounded-xl border border-brand/15 bg-brand-soft px-3 py-2 text-left text-[12px] hover:bg-brand-soft">
      {summary && summary.completion.percent !== null && <div className="mb-2"><CompletionBar completion={summary.completion} compact /></div>}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-semibold text-brand">{scanned ? <BookOpen size={13} /> : <ScanLine size={13} />}{scanned ? `${summary!.topicIds.length} konu · ${summary!.entries} içerik` : "İçindekileri tara"}</span>
        <span className="text-ink-3">{weakMatches > 0 ? `🎯 ${weakMatches} konu eşleşmesi` : "Kitabı aç →"}</span>
      </div>
    </button>
  );
}

/** Kitap detayı: içindekiler (ünite → testler → müfredat konusu) ve bu kitaptaki zayıf konu eşleşmeleri. */
export function BookDetailDialog({ book, onClose }: { book: ScannerBook; onClose: () => void }) {
  const contents = trpc.bookContent.contents.useQuery({ bookId: book.id }, { retry: false });
  const recommendations = trpc.bookContent.recommendations.useQuery(undefined, { retry: false });
  const summaries = trpc.bookContent.summaries.useQuery(undefined, { retry: false });
  const completion = summaries.data?.find((item) => item.bookId === book.id)?.completion;
  const notebook = useNotebook();
  const bookNotes = trpc.notes.list.useQuery({ bookId: book.id, limit: 6 }, { retry: false });
  const unitProgress = (unitNumber: number | null, unitTitle: string) => completion?.units.find((unit) => unit.unitNumber === unitNumber && unit.unitTitle === unitTitle);
  const addToPlan = useAddToPlan();
  const [scanning, setScanning] = useState(false);
  const bookRecs = (recommendations.data ?? []).filter((rec) => rec.bookId === book.id);

  const units = useMemo(() => {
    const groups: { key: string; unitNumber: number | null; unitTitle: string; rows: ContentRow[] }[] = [];
    for (const row of contents.data ?? []) {
      const key = `${row.unitNumber ?? "-"}|${row.unitTitle}`;
      const group = groups[groups.length - 1];
      if (group && group.key === key) group.rows.push(row);
      else groups.push({ key, unitNumber: row.unitNumber, unitTitle: row.unitTitle, rows: [row] });
    }
    return groups;
  }, [contents.data]);

  const planAll = async () => {
    let added = 0;
    for (const rec of bookRecs) {
      try {
        await addToPlan.mutateAsync({ topicId: rec.topicId, bookId: rec.bookId, bookTitle: book.title, when: "auto" });
        added += 1;
      } catch {
        break; // Plan doldu ya da öneri geçersizleşti — hata mesajı zaten gösterildi.
      }
    }
    if (added > 1) toast.success(`${added} kitap görevi plana eklendi.`);
  };

  if (scanning) return <BookContentScanner book={book} onClose={() => setScanning(false)} />;

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-card max-w-[640px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow mb-2">Kitap kütüphanem</div>
            <h2 className="text-[23px] font-semibold text-ink font-display">{book.title}</h2>
            <p className="mt-1 text-[13px] text-ink-3">{[book.publisher, book.subject, book.exam].filter(Boolean).join(" · ")}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-3 hover:bg-paper" aria-label="Kapat"><X size={16} /></button>
        </div>

        {completion && completion.percent !== null && (
          <div className="mt-4 rounded-2xl bg-paper p-3">
            <CompletionBar completion={completion} />
            {completion.questions > 0 && <div className="mt-1.5 text-[12px] text-ink-3">Bu kitaptan toplam {completion.questions} soru çözdün.</div>}
          </div>
        )}

        {bookRecs.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-danger"><Target size={14} /> Zayıf konularınla eşleşenler</div>
              {bookRecs.length > 1 && <button disabled={addToPlan.isPending} onClick={planAll} className="h-8 rounded-lg bg-ink px-3 text-[12px] font-semibold text-white disabled:opacity-50">Zayıf konularımı bu kitaptan çalış</button>}
            </div>
            <div className="mt-2 space-y-2">{bookRecs.map((rec) => <RecommendationRow key={recoKey(rec)} rec={rec} bookTitle={book.title} />)}</div>
          </div>
        )}

        <div className="mt-5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13px] font-semibold text-ink">📝 Bu kitaptaki notların {bookNotes.data?.items.length ? `(${bookNotes.data.items.length}${bookNotes.data.nextCursor ? "+" : ""})` : ""}</div>
            <button onClick={() => notebook.open({ prefill: { bookId: book.id, subject: book.subject } })} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-warn/25 px-3 text-[12px] font-semibold text-warn">+ Not ekle</button>
          </div>
          {bookNotes.data?.items.length ? <div className="mt-2 space-y-2">{bookNotes.data.items.map((note) => <NoteCard key={note.id} note={note} onOpen={(id) => notebook.open({ noteId: id })} />)}</div> : <p className="mt-2 text-[13px] text-ink-3">Bu kitapla çalışırken aldığın notlar burada görünür.</p>}
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13px] font-semibold text-ink">İçindekiler</div>
            <button onClick={() => setScanning(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand/25 px-3 text-[12px] font-semibold text-brand"><ScanLine size={13} /> {contents.data?.length ? "Yeniden tara" : "İçindekileri tara"}</button>
          </div>
          {contents.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-brand" size={20} /></div>
          ) : contents.isError ? (
            <p className="mt-3 rounded-xl bg-danger-soft p-3 text-[13px] text-danger">{contents.error.message}</p>
          ) : !contents.data?.length ? (
            <p className="mt-3 rounded-2xl bg-paper p-4 text-[13px] leading-5 text-ink-3">Bu kitabın içindekiler sayfalarını tararsan, ünite ve testleri YKS konularıyla eşleştirip zayıf olduğun konular için bu kitaptan çalışma önerisi hazırlarız.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {units.map((unit) => {
                const tests = unit.rows.filter((row) => row.contentType === "topic_test").length;
                const topics = Array.from(new Set(unit.rows.map((row) => row.topic?.topic).filter(Boolean)));
                const pages = unit.rows.flatMap((row) => [row.pageStart, row.pageEnd]).filter((value): value is number => value !== null);
                const progress = unitProgress(unit.unitNumber, unit.unitTitle);
                const unitPercent = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
                return (
                  <div key={unit.key} className="relative overflow-hidden rounded-xl border border-ink/[0.07] p-3">
                    {unitPercent > 0 && <div className="absolute inset-y-0 left-0 bg-success-soft" style={{ width: `${unitPercent}%` }} aria-hidden />}
                    <div className="relative flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[12px] font-bold text-ink-4">{unit.unitNumber !== null ? `${unit.unitNumber}. Ünite` : "Bölüm"}{progress && progress.done > 0 ? <span className="ml-1.5 normal-case tracking-normal text-success">· {progress.done}/{progress.total} tamamlandı{progress.done === progress.total ? " ✓" : ""}</span> : null}</div>
                        <div className="text-[13px] font-semibold text-ink-2">{unit.unitTitle || "—"}</div>
                        <div className="mt-0.5 text-[12px] text-ink-3">{topics.length ? `→ ${topics.join(", ")}` : "Konuya bağlı değil"}</div>
                      </div>
                      <div className="shrink-0 text-right text-[12px] text-ink-3">
                        <div className="font-semibold text-ink-2">{tests ? `${tests} test` : `${unit.rows.length} içerik`}</div>
                        {pages.length > 0 && <div>sf. {Math.min(...pages)}–{Math.max(...pages)}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
