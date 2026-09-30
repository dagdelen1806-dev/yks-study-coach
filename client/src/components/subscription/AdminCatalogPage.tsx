import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const bookTypeLabels: Record<string, string> = {
  question_bank: "Soru bankası",
  topic_explanation: "Konu anlatımı",
  topic_explanation_question_bank: "Konu anlatımlı soru bankası",
  mock_exam: "Deneme",
  fasikul: "Fasikül",
  past_questions: "Çıkmış sorular",
  camp: "Kamp kitabı",
  test_book: "Test kitabı",
  reference: "Kaynak/başvuru",
  other: "Diğer",
};
const bookTypeOptions = Object.keys(bookTypeLabels);
const examScopeOptions = ["TYT", "AYT", "TYT_AYT", "YKS", "GENEL"];

type FormState = {
  bookId: number | null;
  name: string;
  publisherName: string;
  isbn: string;
  subject: string;
  bookType: string;
  examScope: string;
  description: string;
  imageUrl: string;
};

const emptyForm: FormState = { bookId: null, name: "", publisherName: "", isbn: "", subject: "", bookType: "question_bank", examScope: "TYT", description: "", imageUrl: "" };

/**
 * Admin "Kaynak Kataloğu" yönetimi — kitapisler.com senkronu Vercel'in
 * IP'lerinden engellendiği için (canlıda doğrulandı: yerelden çalışırken
 * sorunsuz, Vercel Cron'dan hep 0 sonuç) katalog artık burada elle de
 * doldurulabiliyor. Eklenen kitap aynı `catalog_books` tablosuna yazıldığı
 * için öğrenci tarafındaki Kaynak Kataloğu hiçbir ek işlem gerekmeden onu
 * gösterir (bkz. server/routers/resourceCatalogAdmin.ts başlık yorumu).
 */
export default function AdminCatalogPage() {
  const utils = trpc.useUtils();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<FormState>(emptyForm);
  const pageSize = 20;

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const list = trpc.catalog.admin.list.useQuery({ page, pageSize, search: search || undefined });
  const refetch = () => { list.refetch(); utils.catalog.list.invalidate(); };

  const create = trpc.catalog.admin.create.useMutation({
    onSuccess: () => { toast.success("Kaynak kataloğa eklendi."); setForm(emptyForm); refetch(); },
    onError: (error) => toast.error(error.message),
  });
  const update = trpc.catalog.admin.update.useMutation({
    onSuccess: () => { toast.success("Kaynak güncellendi."); setForm(emptyForm); refetch(); },
    onError: (error) => toast.error(error.message),
  });
  const setActive = trpc.catalog.admin.setActive.useMutation({
    onSuccess: () => { refetch(); },
    onError: (error) => toast.error(error.message),
  });

  const isEditing = form.bookId !== null;
  const submitting = create.isPending || update.isPending;

  const startEdit = (row: { id: number; name: string; publisher: string | null; examScope: string; subject: string | null; bookType: string }) => {
    setForm({ bookId: row.id, name: row.name, publisherName: row.publisher ?? "", isbn: "", subject: row.subject ?? "", bookType: row.bookType, examScope: row.examScope, description: "", imageUrl: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = () => {
    if (!form.name.trim()) { toast.error("Kitap adı gerekli."); return; }
    const payload = {
      name: form.name.trim(),
      publisherName: form.publisherName.trim() || undefined,
      isbn: form.isbn.trim() || undefined,
      subject: form.subject.trim() || undefined,
      bookType: form.bookType as (typeof bookTypeOptions)[number],
      examScope: form.examScope as (typeof examScopeOptions)[number],
      description: form.description.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
    };
    if (isEditing && form.bookId !== null) update.mutate({ bookId: form.bookId, ...payload } as never);
    else create.mutate(payload as never);
  };

  return (
    <div className="space-y-4">
      <Card className="soft-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[16px] font-semibold text-ink">{isEditing ? "Kaynağı düzenle" : "Yeni kaynak ekle"}</h2>
          {isEditing && <button onClick={() => setForm(emptyForm)} className="text-[12px] font-semibold text-ink-3 underline">Vazgeç, yeni kayıt formuna dön</button>}
        </div>
        <p className="mt-1 text-[12px] text-ink-4">Kitapisler.com senkronu Vercel'in sunucu IP'lerinden engellendiği için katalog artık burada elle de yönetiliyor. Eklenen kaynak öğrencilerin Kaynak Kataloğu'nda hemen görünür.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Kitap adı *" className="form-input text-[13px]" />
          <input value={form.publisherName} onChange={(event) => setForm({ ...form, publisherName: event.target.value })} placeholder="Yayınevi" className="form-input text-[13px]" />
          <input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Ders (Matematik, Türkçe...)" className="form-input text-[13px]" />
          <select value={form.examScope} onChange={(event) => setForm({ ...form, examScope: event.target.value })} className="form-input text-[13px]">{examScopeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select value={form.bookType} onChange={(event) => setForm({ ...form, bookType: event.target.value })} className="form-input text-[13px]">{bookTypeOptions.map((item) => <option key={item} value={item}>{bookTypeLabels[item]}</option>)}</select>
          <input value={form.isbn} onChange={(event) => setForm({ ...form, isbn: event.target.value })} placeholder="ISBN (opsiyonel)" className="form-input text-[13px]" />
          <input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="Kapak görseli URL (opsiyonel)" className="form-input text-[13px] sm:col-span-2 lg:col-span-2" />
          <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Kısa açıklama (opsiyonel)" className="form-input text-[13px] sm:col-span-2 lg:col-span-3" />
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={submit} disabled={submitting} className="h-10 rounded-xl bg-brand px-5 text-[12px] font-semibold text-white">{submitting ? "Kaydediliyor..." : isEditing ? "Güncelle" : "Kataloğa ekle"}</Button>
        </div>
      </Card>

      <Card className="soft-card overflow-hidden">
        <div className="border-b border-ink/[0.06] p-4"><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Kaynak ara..." className="form-input h-10 max-w-xs text-[13px]" /></div>
        {list.isLoading ? (
          <div className="flex justify-center p-10"><Loader2 className="animate-spin text-brand" size={20} /></div>
        ) : !list.data?.items.length ? (
          <div className="p-8 text-center text-[13px] text-ink-3">Katalogda henüz kaynak yok — yukarıdan ilk kaydı ekle.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[13px]">
              <thead className="border-b border-ink/[0.06] bg-paper text-[12px] text-ink-4"><tr><th className="px-4 py-2.5">ID</th><th className="px-4 py-2.5">Kaynak</th><th className="px-4 py-2.5">Ders</th><th className="px-4 py-2.5">Sınav</th><th className="px-4 py-2.5">Tür</th><th className="px-4 py-2.5">Durum</th><th className="px-4 py-2.5" /></tr></thead>
              <tbody className="divide-y divide-ink/[0.06]">
                {list.data.items.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-ink-3">#{row.id}</td>
                    <td className="px-4 py-2.5 font-medium text-ink-2">{row.name}{row.publisher ? <span className="ml-1.5 text-[12px] font-normal text-ink-4">· {row.publisher}</span> : null}{row.needsReview && <span className="ml-1.5 rounded-full bg-warn-soft px-1.5 py-0.5 text-[11px] font-bold text-warn">inceleme</span>}</td>
                    <td className="px-4 py-2.5 text-ink-3">{row.subject ?? "—"}</td>
                    <td className="px-4 py-2.5 text-ink-3">{row.examScope}</td>
                    <td className="px-4 py-2.5 text-ink-3">{bookTypeLabels[row.bookType] ?? row.bookType}</td>
                    <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[12px] font-bold ${row.active ? "bg-success-soft text-success" : "bg-paper text-ink-3"}`}>{row.active ? "Aktif" : "Pasif"}</span></td>
                    <td className="px-4 py-2.5 text-right"><div className="flex justify-end gap-3"><button onClick={() => startEdit(row)} className="text-[12px] font-semibold text-brand">Düzenle</button><button onClick={() => setActive.mutate({ bookId: row.id, active: !row.active })} className="text-[12px] font-semibold text-danger">{row.active ? "Pasife al" : "Aktif et"}</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && list.data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-ink/[0.06] px-4 py-3 text-[12px] text-ink-3">
            <span>{list.data.total} kayıt · sayfa {page}/{list.data.totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-ink/10 px-3 py-1.5 disabled:opacity-40">Önceki</button>
              <button onClick={() => setPage((p) => Math.min(list.data!.totalPages, p + 1))} disabled={page >= list.data.totalPages} className="rounded-lg border border-ink/10 px-3 py-1.5 disabled:opacity-40">Sonraki</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
