import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { BookOpen, BookmarkCheck, BookmarkPlus, CheckCircle2, ExternalLink, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Same color values already used for status/tone chips elsewhere in the app
// (see `toneClasses` / `statusMeta` in Home.tsx) — reused here rather than
// introducing a new ad-hoc palette for difficulty.
const DIFFICULTY_META: Record<string, { label: string; dot: string; text: string; bg: string; emoji: string }> = {
  easy: { label: "Kolay", dot: "#2e8666", text: "#2e8666", bg: "#e9f7f0", emoji: "🟢" },
  medium: { label: "Orta", dot: "#bd7c18", text: "#bd7c18", bg: "#fff8df", emoji: "🟡" },
  hard: { label: "Zor", dot: "#d95d4d", text: "#d95d4d", bg: "#fff0ed", emoji: "🔴" },
};

const BOOK_TYPE_LABELS: Record<string, string> = {
  question_bank: "Soru bankası",
  topic_explanation: "Konu anlatımı",
  topic_explanation_question_bank: "Konu anlatımı + soru bankası",
  mock_exam: "Deneme",
  fasikul: "Fasikül",
  past_questions: "Çıkmış sorular",
  camp: "Kamp kitabı",
  test_book: "Test kitabı",
  reference: "Başvuru kaynağı",
  other: "Diğer",
};

function DifficultyBadge({ label, confidence }: { label: string; confidence: number }) {
  const meta = DIFFICULTY_META[label] ?? DIFFICULTY_META.medium;
  const lowConfidence = confidence < 0.55;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ color: meta.text, backgroundColor: meta.bg }} title={lowConfidence ? "Otomatik sınıflandırma, düşük güven — inceleme bekliyor olabilir" : undefined}>
      <span>{meta.emoji}</span>
      {meta.label}
      {lowConfidence && <span className="text-[9px] font-normal opacity-70">(taslak)</span>}
    </span>
  );
}

function BookCard({ book, owned, onToggleLibrary, togglePending }: { book: { id: number; name: string; slug: string; publisher: string | null; examScope: string; subject: string | null; bookType: string; imageUrl: string | null; difficultyLabel: string; difficultyScore: number; difficultyConfidence: number; price: number | null; productUrl: string | null }; owned: boolean; onToggleLibrary: () => void; togglePending: boolean }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#1f2333]/[0.06] bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf1ff] text-[#3b5ccc]">
          <BookOpen size={18} />
        </div>
        <DifficultyBadge label={book.difficultyLabel} confidence={book.difficultyConfidence} />
      </div>
      <div>
        <div className="text-[14px] font-semibold leading-5 text-[#1f2333]">{book.name}</div>
        <div className="mt-1 text-[12px] text-[#858690]">{book.publisher ?? "Yayıncı belirtilmemiş"}</div>
      </div>
      <div className="flex flex-wrap gap-1.5 text-[10px] font-medium text-[#6d6e78]">
        <span className="rounded-full bg-[#f5f4f0] px-2 py-0.5">{book.examScope.replace("_", " + ")}</span>
        {book.subject && <span className="rounded-full bg-[#f5f4f0] px-2 py-0.5">{book.subject}</span>}
        <span className="rounded-full bg-[#f5f4f0] px-2 py-0.5">{BOOK_TYPE_LABELS[book.bookType] ?? book.bookType}</span>
      </div>
      <button
        onClick={onToggleLibrary}
        disabled={togglePending}
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition disabled:opacity-60 ${owned ? "bg-[#e9f7f0] text-[#2e8666] hover:bg-[#ddf0e6]" : "bg-[#1f2333] text-white hover:opacity-90"}`}
      >
        {owned ? <BookmarkCheck size={14} /> : <BookmarkPlus size={14} />}
        {owned ? "Kütüphanemde" : "Kütüphaneme ekle"}
      </button>
      <div className="mt-auto flex items-center justify-between pt-1">
        <span className="text-[11px] text-[#9a9ba3]">{book.price ? `${book.price.toFixed(2)} ₺` : "Fiyat bilgisi yok"}</span>
        {book.productUrl ? (
          <a href={book.productUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3b5ccc] hover:underline">
            Kaynağa git <ExternalLink size={12} />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function RecommendationPanel() {
  const { user } = useAuth();
  const recommendations = trpc.catalog.recommendations.useQuery({ limit: 6 }, { enabled: Boolean(user), retry: false });

  if (!user) {
    return (
      <div className="rounded-2xl border border-dashed border-[#1f2333]/[0.12] bg-[#faf9f6] p-5 text-[12px] text-[#858690]">
        Seviyene uygun kaynak önerilerini görmek için giriş yap.
      </div>
    );
  }

  if (recommendations.isLoading) return <div className="text-[12px] text-[#9a9ba3]">Öneriler hesaplanıyor…</div>;
  if (!recommendations.data || recommendations.data.length === 0) {
    return <div className="rounded-2xl border border-dashed border-[#1f2333]/[0.12] bg-[#faf9f6] p-5 text-[12px] text-[#858690]">Henüz yeterli konu ilerleme verisi yok — konu haritasında birkaç sonuç kaydettikçe burası kişiselleşir.</div>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {recommendations.data.map((rec) => (
        <div key={`${rec.bookId}-${rec.topic}`} className="rounded-2xl border border-[#1f2333]/[0.06] bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-[#f1efff] px-2 py-0.5 text-[10px] font-semibold text-[#7566c3]">{rec.label}</span>
            {rec.book && <DifficultyBadge label={rec.book.difficultyLabel} confidence={rec.book.difficultyConfidence} />}
          </div>
          <div className="mt-2 text-[13px] font-semibold text-[#1f2333]">{rec.book?.name ?? `Kaynak #${rec.bookId}`}</div>
          <div className="mt-1 text-[11px] text-[#858690]">{rec.subject} · {rec.topic}</div>
          <p className="mt-2 text-[11px] leading-4 text-[#9a9ba3]">{rec.reason}</p>
        </div>
      ))}
    </div>
  );
}

function AdminReviewPanel() {
  const utils = trpc.useUtils();
  const needsReview = trpc.catalog.admin.needsReview.useQuery();
  const approve = trpc.catalog.admin.approve.useMutation({ onSuccess: () => utils.catalog.admin.needsReview.invalidate() });
  const markReviewed = trpc.catalog.admin.markNeedsReview.useMutation({ onSuccess: () => utils.catalog.admin.needsReview.invalidate() });

  if (needsReview.isLoading) return null;
  const rows = needsReview.data ?? [];
  if (rows.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[#f3d9a8] bg-[#fffaf0] p-4">
      <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[#8a5a12]">
        <Sparkles size={15} /> İnceleme bekleyen kaynaklar ({rows.length})
      </div>
      <div className="space-y-2">
        {rows.slice(0, 8).map((row) => (
          <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-2 text-[12px]">
            <div>
              <span className="font-medium text-[#1f2333]">{row.name}</span>
              <span className="ml-2 text-[#9a9ba3]">skor {row.difficultyScore} · güven {Number(row.difficultyConfidence).toFixed(2)} · {row.classificationMethod}</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => approve.mutate({ bookId: row.id })} disabled={approve.isPending}>
                <CheckCircle2 size={13} className="mr-1" /> Onayla
              </Button>
              <Button size="sm" variant="ghost" onClick={() => markReviewed.mutate({ bookId: row.id, needsReview: false })} disabled={markReviewed.isPending}>
                Yoksay
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResourceCatalogSection() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [exam, setExam] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [bookType, setBookType] = useState<string>("all");

  // "Kütüphaneme ekle" — mevcut resources.addBook/removeBook mutasyonları
  // (kişisel raf zaten bu tabloyu kullanıyor) yeniden kullanılıyor; yeni bir
  // kütüphane modeli oluşturulmadı. Kataloğun sayısal `book.id`'si, string
  // `bookId` kolonuna doğrudan yazılır — eski statik katalog id'leri hiçbir
  // zaman salt sayısal olmadığından (`book-tyt-mat-345` gibi) çakışma olmaz.
  const resourcesSnapshot = trpc.resources.snapshot.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const ownedBookIds = new Set((resourcesSnapshot.data?.inventory ?? []).map((row) => row.bookId));
  const addBook = trpc.resources.addBook.useMutation({ onSuccess: () => { utils.resources.snapshot.invalidate(); toast.success("Kitap kütüphanene eklendi."); }, onError: () => toast.error("Eklenemedi, tekrar dener misin?") });
  const removeBook = trpc.resources.removeBook.useMutation({ onSuccess: () => { utils.resources.snapshot.invalidate(); toast("Kitap kütüphanenden çıkarıldı."); }, onError: () => toast.error("Çıkarılamadı, tekrar dener misin?") });
  const toggleLibrary = (bookId: number) => {
    if (!user) { toast.error("Kütüphanene eklemek için giriş yapmalısın."); return; }
    const key = String(bookId);
    if (ownedBookIds.has(key)) removeBook.mutate({ bookId: key });
    else addBook.mutate({ bookId: key });
  };

  const list = trpc.catalog.list.useQuery({
    page,
    pageSize: 12,
    search: search || undefined,
    exam: exam === "all" ? undefined : (exam as "TYT" | "AYT" | "TYT_AYT" | "YKS" | "GENEL"),
    difficulty: difficulty === "all" ? undefined : (difficulty as "easy" | "medium" | "hard"),
    bookType:
      bookType === "all"
        ? undefined
        : (bookType as "question_bank" | "topic_explanation" | "topic_explanation_question_bank" | "mock_exam" | "fasikul" | "past_questions" | "camp" | "test_book" | "reference" | "other"),
  });

  const resetToFirstPage = () => setPage(1);

  return (
    <div className="space-y-7 animate-page-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow mb-2">Kaynak kataloğu · zorluk motoru</div>
          <h1 className="page-heading">Yayıncı bağımsız, zorluk etiketli kaynak kataloğu.</h1>
          <p className="page-subtitle">Sınav, ders ve zorluk seviyesine göre filtrele; performansına göre kişisel öneriler al.</p>
        </div>
        <span className="demo-chip"><BookOpen size={12} /> {list.data?.total ?? "…"} kaynak</span>
      </div>

      <section>
        <div className="mb-3 text-[13px] font-semibold text-[#1f2333]">Seviyene uygun kaynaklar</div>
        <RecommendationPanel />
      </section>

      {isAdmin && <AdminReviewPanel />}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Kaynak ara…" value={search} onChange={(e) => { setSearch(e.target.value); resetToFirstPage(); }} className="max-w-xs" />
          <Select value={exam} onValueChange={(v) => { setExam(v); resetToFirstPage(); }}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Sınav" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm sınavlar</SelectItem>
              <SelectItem value="TYT">TYT</SelectItem>
              <SelectItem value="AYT">AYT</SelectItem>
              <SelectItem value="TYT_AYT">TYT + AYT</SelectItem>
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={(v) => { setDifficulty(v); resetToFirstPage(); }}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Zorluk" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm seviyeler</SelectItem>
              <SelectItem value="easy">🟢 Kolay</SelectItem>
              <SelectItem value="medium">🟡 Orta</SelectItem>
              <SelectItem value="hard">🔴 Zor</SelectItem>
            </SelectContent>
          </Select>
          <Select value={bookType} onValueChange={(v) => { setBookType(v); resetToFirstPage(); }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tür" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm türler</SelectItem>
              {Object.entries(BOOK_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {list.isLoading && <div className="text-[12px] text-[#9a9ba3]">Kaynaklar yükleniyor…</div>}
        {!list.isLoading && (list.data?.items.length ?? 0) === 0 && (
          <div className="rounded-2xl border border-dashed border-[#1f2333]/[0.12] bg-[#faf9f6] p-6 text-center text-[12px] text-[#858690]">
            Bu filtrelerle eşleşen kaynak yok. Filtreleri değiştirmeyi dene ya da bir sync bekle.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.data?.items.map((book) => (
            <BookCard key={book.id} book={book} owned={ownedBookIds.has(String(book.id))} togglePending={addBook.isPending || removeBook.isPending} onToggleLibrary={() => toggleLibrary(book.id)} />
          ))}
        </div>

        {list.data && list.data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Önceki</Button>
            <span className="text-[12px] text-[#9a9ba3]">Sayfa {list.data.page} / {list.data.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= list.data.totalPages} onClick={() => setPage((p) => p + 1)}>Sonraki</Button>
          </div>
        )}
      </section>
    </div>
  );
}
