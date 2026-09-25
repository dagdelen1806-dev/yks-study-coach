import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import { BookOpen, Loader2, ScanLine, Target, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { AppRouter } from "../../../../server/routers";
import BookContentScanner, { type ScannerBook } from "./BookContentScanner";

type Recommendation = inferRouterOutputs<AppRouter>["bookContent"]["recommendations"][number];
type ContentRow = inferRouterOutputs<AppRouter>["bookContent"]["contents"][number];

const SNOOZE_KEY = "pusula:book-reco-snoozed";
const todayKey = () => new Date().toISOString().slice(0, 10);
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
    <div className="rounded-2xl border border-[#1f2333]/[0.07] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-[#1f2333]">{rec.subject} — {rec.topic}</div>
          <div className="mt-1 text-[11px] text-[#6d7390]">📚 {bookTitle}</div>
          <div className="mt-0.5 text-[11px] text-[#6d7390]">📖 {describeTarget(rec)}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="rounded-full bg-[#fff0ed] px-2 py-0.5 text-[10px] font-bold text-[#d95d4d]">Zayıflık %{Math.round(rec.weakness * 100)}</div>
          <div className="mt-1 text-[11px] font-semibold text-[#1f2333]">⏱️ {rec.minutes} dk</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => addToPlan.mutate({ topicId: rec.topicId, bookId: rec.bookId, bookTitle, when: "today" })} className="h-8 rounded-lg bg-[#3b5ccc] px-3 text-[11px] font-semibold text-white disabled:opacity-50">Bugün çalış</button>
        <button disabled={busy} onClick={() => addToPlan.mutate({ topicId: rec.topicId, bookId: rec.bookId, bookTitle, when: "auto" })} className="h-8 rounded-lg border border-[#3b5ccc]/25 px-3 text-[11px] font-semibold text-[#3b5ccc] disabled:opacity-50">Plana ekle</button>
        {onSnooze && <button disabled={busy} onClick={onSnooze} className="h-8 rounded-lg px-3 text-[11px] font-semibold text-[#8b8c95] hover:text-[#343643]">Sonra</button>}
        {busy && <Loader2 className="animate-spin self-center text-[#3b5ccc]" size={14} />}
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
  const recommendations = trpc.bookContent.recommendations.useQuery(undefined, { retry: false });
  const [snoozed, setSnoozed] = useState<string[]>(readSnoozed);
  const visible = (recommendations.data ?? []).filter((rec) => !snoozed.includes(recoKey(rec))).slice(0, 3);
  if (!recommendations.data?.length || visible.length === 0) return null;

  const snooze = (rec: Recommendation) => {
    const next = [...snoozed, recoKey(rec)];
    setSnoozed(next);
    writeSnoozed(next);
  };

  return (
    <div className="soft-card border-[#3b5ccc]/15 bg-[#f4f6ff] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="eyebrow text-[#3b5ccc]">🎯 Bugünkü öneri</div>
          <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.04em] text-[#1f2333]">Zayıf konularını kendi kitaplarından çalış.</h2>
        </div>
        <span className="shrink-0 rounded-full bg-[#e3e9ff] px-2.5 py-1 text-[10px] font-bold text-[#3b5ccc]">{recommendations.data.length} öneri</span>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {visible.map((rec) => <RecommendationRow key={recoKey(rec)} rec={rec} bookTitle={bookTitles[rec.bookId] ?? "Kitabın"} onSnooze={() => snooze(rec)} />)}
      </div>
    </div>
  );
}

/** Raf kartındaki kısa içerik özeti + "Kitabı aç". */
export function BookContentBadge({ bookId, onOpen }: { bookId: string; onOpen: () => void }) {
  const summaries = trpc.bookContent.summaries.useQuery(undefined, { retry: false, staleTime: 30_000 });
  const recommendations = trpc.bookContent.recommendations.useQuery(undefined, { retry: false, staleTime: 30_000 });
  const summary = summaries.data?.find((item) => item.bookId === bookId);
  const weakMatches = recommendations.data?.filter((rec) => rec.bookId === bookId).length ?? 0;
  return (
    <button onClick={onOpen} className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-[#3b5ccc]/15 bg-[#f7f9ff] px-3 py-2 text-left text-[11px] hover:bg-[#eef2ff]">
      <span className="flex items-center gap-1.5 font-semibold text-[#3b5ccc]">{summary ? <BookOpen size={13} /> : <ScanLine size={13} />}{summary ? `${summary.topicIds.length} konu · ${summary.entries} içerik` : "İçindekileri tara"}</span>
      <span className="text-[#6d7390]">{weakMatches > 0 ? `🎯 ${weakMatches} zayıf konu eşleşmesi` : "Kitabı aç →"}</span>
    </button>
  );
}

/** Kitap detayı: içindekiler (ünite → testler → müfredat konusu) ve bu kitaptaki zayıf konu eşleşmeleri. */
export function BookDetailDialog({ book, onClose }: { book: ScannerBook; onClose: () => void }) {
  const contents = trpc.bookContent.contents.useQuery({ bookId: book.id }, { retry: false });
  const recommendations = trpc.bookContent.recommendations.useQuery(undefined, { retry: false });
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
            <h2 className="text-[20px] font-semibold tracking-[-0.04em] text-[#1f2333]">{book.title}</h2>
            <p className="mt-1 text-[12px] text-[#858690]">{[book.publisher, book.subject, book.exam].filter(Boolean).join(" · ")}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-[#8b8c95] hover:bg-[#f7f5ef]" aria-label="Kapat"><X size={16} /></button>
        </div>

        {bookRecs.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#d95d4d]"><Target size={14} /> Zayıf konularınla eşleşenler</div>
              {bookRecs.length > 1 && <button disabled={addToPlan.isPending} onClick={planAll} className="h-8 rounded-lg bg-[#1f2333] px-3 text-[11px] font-semibold text-white disabled:opacity-50">Zayıf konularımı bu kitaptan çalış</button>}
            </div>
            <div className="mt-2 space-y-2">{bookRecs.map((rec) => <RecommendationRow key={recoKey(rec)} rec={rec} bookTitle={book.title} />)}</div>
          </div>
        )}

        <div className="mt-5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[12px] font-semibold text-[#1f2333]">İçindekiler</div>
            <button onClick={() => setScanning(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#3b5ccc]/25 px-3 text-[11px] font-semibold text-[#3b5ccc]"><ScanLine size={13} /> {contents.data?.length ? "Yeniden tara" : "İçindekileri tara"}</button>
          </div>
          {contents.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#3b5ccc]" size={20} /></div>
          ) : contents.isError ? (
            <p className="mt-3 rounded-xl bg-[#fff0ed] p-3 text-[12px] text-[#d95d4d]">{contents.error.message}</p>
          ) : !contents.data?.length ? (
            <p className="mt-3 rounded-2xl bg-[#f7f5ef] p-4 text-[12px] leading-5 text-[#6d7390]">Bu kitabın içindekiler sayfalarını tararsan, ünite ve testleri YKS konularıyla eşleştirip zayıf olduğun konular için bu kitaptan çalışma önerisi hazırlarız.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {units.map((unit) => {
                const tests = unit.rows.filter((row) => row.contentType === "topic_test").length;
                const topics = Array.from(new Set(unit.rows.map((row) => row.topic?.topic).filter(Boolean)));
                const pages = unit.rows.flatMap((row) => [row.pageStart, row.pageEnd]).filter((value): value is number => value !== null);
                return (
                  <div key={unit.key} className="rounded-xl border border-[#1f2333]/[0.07] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-[.08em] text-[#9a9ba3]">{unit.unitNumber !== null ? `${unit.unitNumber}. Ünite` : "Bölüm"}</div>
                        <div className="text-[12px] font-semibold text-[#343643]">{unit.unitTitle || "—"}</div>
                        <div className="mt-0.5 text-[10px] text-[#8b8c95]">{topics.length ? `→ ${topics.join(", ")}` : "Konuya bağlı değil"}</div>
                      </div>
                      <div className="shrink-0 text-right text-[10px] text-[#8b8c95]">
                        <div className="font-semibold text-[#545661]">{tests ? `${tests} test` : `${unit.rows.length} içerik`}</div>
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
