import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import { ArrowDown, ArrowUp, Camera, Check, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { AppRouter } from "../../../../server/routers";
import { compressImage } from "./imageCompression";

export type ScannerBook = { id: string; title: string; publisher: string; subject: string; exam: string };

type Preview = inferRouterOutputs<AppRouter>["bookContent"]["readTableOfContents"];
type ContentType = Preview["entries"][number]["contentType"];
type Method = "exact_topic" | "exact_alias" | "contains_topic" | "contains_alias" | "fuzzy" | "manual" | "none";

type Row = {
  key: string;
  unitNumber: number | null;
  unitTitle: string;
  contentType: ContentType;
  label: string;
  testNumber: number | null;
  title: string;
  pageStart: number | null;
  pageEnd: number | null;
  topicId: number | null;
  method: Method;
  confidence: number;
  /** auto: yüksek güven · confirm: öğrenci onayı bekliyor · manual: elle seçilmeli · not_applicable: karma içerik */
  tier: "auto" | "confirm" | "manual" | "not_applicable";
  confirmed: boolean;
};

type Page = { key: string; file: File; previewUrl: string };
type Step = "pages" | "reading" | "review" | "saved";

const CONTENT_TYPE_LABELS: Record<ContentType, string> = { topic_test: "Konu testi", topic: "Konu", osym_type: "ÖSYM tipi", review: "Sarmal / karma", simulation: "Deneme / simülasyon" };
const isMixed = (type: ContentType) => type === "review" || type === "simulation";
const MAX_PAGES = 8;
let keySeq = 0;
const nextKey = () => `k${++keySeq}`;

/**
 * İçindekiler tarama akışı: sayfaları çek/sırala → analiz → eşleşmeleri onayla
 * → kaydet. OCR yalnızca öneri üretir; kütüphaneye yazılan her şey öğrencinin
 * bu ekranda gördüğü ve onayladığı içeriktir. OCR başarısız olursa ya da
 * öğrenci isterse içerik tamamen elle girilebilir.
 */
export default function BookContentScanner({ book, onClose, onSaved }: { book: ScannerBook; onClose: () => void; onSaved?: () => void }) {
  const [step, setStep] = useState<Step>("pages");
  const [pages, setPages] = useState<Page[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [source, setSource] = useState<"ocr" | "manual">("ocr");
  const [error, setError] = useState("");
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const readToc = trpc.bookContent.readTableOfContents.useMutation();
  const save = trpc.bookContent.save.useMutation();
  const topicOptions = trpc.bookContent.topicOptions.useQuery({ subject: showAllSubjects ? null : book.subject }, { enabled: step === "review" });

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (images.length < files.length) toast.error("Yalnızca fotoğraf ekleyebilirsin.");
    setPages((current) => [...current, ...images.map((file) => ({ key: nextKey(), file, previewUrl: URL.createObjectURL(file) }))].slice(0, MAX_PAGES));
    if (pages.length + images.length > MAX_PAGES) toast.error(`En fazla ${MAX_PAGES} sayfa ekleyebilirsin.`);
    setError("");
  };
  const movePage = (index: number, delta: number) => setPages((current) => {
    const next = [...current];
    const target = index + delta;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const removePage = (key: string) => setPages((current) => current.filter((page) => page.key !== key));

  const analyze = async () => {
    if (pages.length === 0 || readToc.isPending) return;
    setStep("reading");
    setError("");
    try {
      const images = await Promise.all(pages.map((page) => compressImage(page.file)));
      const preview = await readToc.mutateAsync({ bookId: book.id, subject: book.subject || null, images: images.map(({ dataUrl, mimeType }) => ({ dataUrl, mimeType })) });
      setWarnings(preview.warnings);
      setRows(preview.entries.map((entry) => ({
        key: nextKey(),
        unitNumber: entry.unitNumber,
        unitTitle: entry.unitTitle,
        contentType: entry.contentType,
        label: entry.label,
        testNumber: entry.testNumber,
        title: entry.title,
        pageStart: entry.pageStart,
        pageEnd: entry.pageEnd,
        topicId: entry.tier === "manual" ? null : entry.suggestion?.topicId ?? null,
        method: entry.suggestion?.method ?? "none",
        confidence: entry.suggestion?.confidence ?? 0,
        tier: entry.tier,
        confirmed: entry.tier === "auto",
      })));
      setSource("ocr");
      setStep("review");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      setError(/fetch|network/i.test(message) ? "Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dener misin?" : message || "İçindekiler okunamadı.");
      setStep("pages");
    }
  };

  const startManual = () => {
    setSource("manual");
    setWarnings([]);
    setRows([{ key: nextKey(), unitNumber: 1, unitTitle: "", contentType: "topic_test", label: "Test 1", testNumber: 1, title: "", pageStart: null, pageEnd: null, topicId: null, method: "manual", confidence: 1, tier: "manual", confirmed: true }]);
    setStep("review");
  };

  const updateRow = (key: string, patch: Partial<Row>) => setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const setRowTopic = (key: string, topicId: number | null) => updateRow(key, { topicId, method: "manual", confidence: 1, confirmed: true });
  const unitKey = (row: Pick<Row, "unitNumber" | "unitTitle">) => `${row.unitNumber ?? "-"}|${row.unitTitle}`;
  const setUnitTopic = (unit: string, topicId: number | null) => setRows((current) => current.map((row) => (unitKey(row) === unit && !isMixed(row.contentType) ? { ...row, topicId, method: "manual", confidence: 1, confirmed: true } : row)));
  const confirmUnit = (unit: string) => setRows((current) => current.map((row) => (unitKey(row) === unit && row.topicId !== null ? { ...row, confirmed: true } : row)));
  const addRow = () => setRows((current) => {
    const last = current[current.length - 1];
    const testNumber = last?.contentType === "topic_test" && last.testNumber !== null ? last.testNumber + 1 : 1;
    return [...current, { key: nextKey(), unitNumber: last?.unitNumber ?? 1, unitTitle: last?.unitTitle ?? "", contentType: "topic_test", label: `Test ${testNumber}`, testNumber, title: last?.title ?? "", pageStart: null, pageEnd: null, topicId: last?.topicId ?? null, method: "manual", confidence: 1, tier: "manual", confirmed: true }];
  });

  const units = useMemo(() => {
    const groups: { key: string; unitNumber: number | null; unitTitle: string; rows: Row[] }[] = [];
    for (const row of rows) {
      const key = unitKey(row);
      const group = groups[groups.length - 1];
      if (group && group.key === key) group.rows.push(row);
      else groups.push({ key, unitNumber: row.unitNumber, unitTitle: row.unitTitle, rows: [row] });
    }
    return groups;
  }, [rows]);

  const pendingConfirm = rows.filter((row) => !isMixed(row.contentType) && row.topicId !== null && !row.confirmed).length;
  const unmatched = rows.filter((row) => !isMixed(row.contentType) && row.topicId === null).length;
  const invalidPages = rows.filter((row) => row.pageStart !== null && row.pageEnd !== null && row.pageEnd < row.pageStart).length;

  const submit = async () => {
    if (save.isPending) return;
    if (rows.length === 0) { toast.error("Kaydedilecek içerik yok."); return; }
    if (pendingConfirm > 0) { toast.error(`${pendingConfirm} eşleşme onayını bekliyor. Kontrol edip "Onayla"ya bas ya da konuyu değiştir.`); return; }
    if (invalidPages > 0) { toast.error("Bitiş sayfası başlangıçtan küçük olan satırlar var."); return; }
    if (rows.some((row) => !row.label.trim())) { toast.error("Her satırın bir adı olmalı (ör. Test 1)."); return; }
    try {
      await save.mutateAsync({
        bookId: book.id,
        subject: book.subject,
        source,
        items: rows.map((row) => {
          const topicId = isMixed(row.contentType) ? null : row.topicId;
          return { unitNumber: row.unitNumber, unitTitle: row.unitTitle, contentType: row.contentType, label: row.label.trim(), testNumber: row.testNumber, title: row.title, pageStart: row.pageStart, pageEnd: row.pageEnd, topicId, mappingMethod: topicId === null ? "none" : row.method, mappingConfidence: topicId === null ? 0 : row.confidence };
        }),
      });
      await Promise.all([utils.bookContent.contents.invalidate({ bookId: book.id }), utils.bookContent.summaries.invalidate(), utils.bookContent.recommendations.invalidate(), utils.resources.snapshot.invalidate()]);
      setStep("saved");
      onSaved?.();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "İçerik kaydedilemedi.");
    }
  };

  const stepIndex = { pages: 0, reading: 1, review: 2, saved: 3 }[step];
  const topicLabel = (topicId: number | null) => topicOptions.data?.find((topic) => topic.id === topicId)?.topic;

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && step !== "reading" && onClose()}>
      <div className="modal-card max-w-[760px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow mb-2">İçindekiler · {book.title}</div>
            <h2 className="text-[20px] font-semibold tracking-[-0.04em] text-[#1f2333]">
              {step === "pages" ? "İçindekiler sayfalarını tara" : step === "reading" ? "Kitabın içeriğini analiz ediyoruz…" : step === "review" ? (source === "manual" ? "İçindekileri elle gir" : "Eşleşmeleri kontrol et") : "Kütüphanene eklendi ✓"}
            </h2>
          </div>
          {step !== "reading" && <button onClick={onClose} className="rounded-lg p-2 text-[#8b8c95] hover:bg-[#f7f5ef]" aria-label="Kapat"><X size={16} /></button>}
        </div>

        <div className="mt-4 flex gap-1.5" aria-hidden>
          {["Sayfalar", "Analiz", "Onay", "Tamam"].map((label, index) => (
            <div key={label} className="flex-1">
              <div className={`h-1.5 rounded-full ${index <= stepIndex ? "bg-[#3b5ccc]" : "bg-[#eceae3]"}`} />
              <div className={`mt-1 text-[9px] font-semibold ${index <= stepIndex ? "text-[#3b5ccc]" : "text-[#b0b1b8]"}`}>{label}</div>
            </div>
          ))}
        </div>

        {step === "pages" && (
          <div className="mt-5">
            <p className="text-[12px] leading-5 text-[#6d7390]">İçindekiler sayfalarını sırayla, düz ve ışıklı çek. Sayfa numaralarının okunaklı olduğundan emin ol. Birden fazla sayfa varsa hepsini ekle; oklarla sıralayabilirsin.</p>
            {error && <div role="alert" className="mt-3 rounded-xl bg-[#fff0ed] p-3 text-[12px] font-medium text-[#d95d4d]">{error}</div>}
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {pages.map((page, index) => (
                <div key={page.key} className="relative overflow-hidden rounded-xl border border-[#1f2333]/10">
                  <img src={page.previewUrl} alt={`${index + 1}. sayfa`} className="h-32 w-full object-cover" />
                  <div className="absolute left-1.5 top-1.5 rounded-md bg-[#1f2333]/80 px-1.5 py-0.5 text-[10px] font-bold text-white">{index + 1}</div>
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-white/90 p-1">
                    <button onClick={() => movePage(index, -1)} disabled={index === 0} className="rounded p-1 disabled:opacity-30" aria-label="Öne al"><ArrowUp size={13} /></button>
                    <button onClick={() => movePage(index, 1)} disabled={index === pages.length - 1} className="rounded p-1 disabled:opacity-30" aria-label="Sona al"><ArrowDown size={13} /></button>
                    <button onClick={() => removePage(page.key)} className="rounded p-1 text-[#d95d4d]" aria-label="Sayfayı çıkar"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
              {pages.length < MAX_PAGES && (
                <button onClick={() => cameraRef.current?.click()} className="flex h-32 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#3b5ccc]/30 text-[11px] font-semibold text-[#3b5ccc] hover:bg-[#f4f6ff]">
                  <Camera size={20} />{pages.length === 0 ? "Sayfayı çek" : "Sonraki sayfa"}
                </button>
              )}
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
            <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <button onClick={() => galleryRef.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#1f2333]/10 px-3 text-[11px] font-semibold text-[#545661] hover:bg-[#f7f5ef]"><ImagePlus size={14} /> Galeriden seç</button>
                <button onClick={startManual} className="h-9 rounded-xl px-3 text-[11px] font-semibold text-[#8b8c95] hover:text-[#343643]">Bilgileri elle gir</button>
              </div>
              <button onClick={analyze} disabled={pages.length === 0 || readToc.isPending} className="h-10 rounded-xl bg-[#3b5ccc] px-4 text-[12px] font-semibold text-white disabled:opacity-40">{error ? "Tekrar dene" : `Analiz et (${pages.length} sayfa)`}</button>
            </div>
          </div>
        )}

        {step === "reading" && (
          <div className="flex flex-col items-center py-12 text-center">
            <Loader2 className="animate-spin text-[#3b5ccc]" size={28} />
            <p className="mt-4 text-[13px] font-semibold text-[#1f2333]">Kitabın içeriğini analiz ediyoruz…</p>
            <p className="mt-1 max-w-sm text-[12px] leading-5 text-[#8b8c95]">Ünite, test ve sayfa bilgileri okunuyor ve YKS müfredatındaki konularla eşleştiriliyor. Bu işlem birkaç saniye sürebilir; sayfayı kapatma.</p>
          </div>
        )}

        {step === "review" && (
          <div className="mt-5">
            {warnings.length > 0 && (
              <div className="mb-3 space-y-1 rounded-xl bg-[#fff8df] p-3 text-[11px] leading-5 text-[#8a6116]">
                {warnings.map((warning) => <div key={warning}>⚠ {warning}</div>)}
                <div className="font-semibold">Sayfa numaralarını aşağıdan düzeltebilirsin.</div>
              </div>
            )}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-[#eaf6f0] px-2 py-0.5 font-semibold text-[#3c8a6d]">{rows.filter((row) => row.topicId !== null && row.confirmed).length} eşleşti</span>
                {pendingConfirm > 0 && <span className="rounded-full bg-[#fff8df] px-2 py-0.5 font-semibold text-[#a1711d]">{pendingConfirm} onay bekliyor</span>}
                {unmatched > 0 && <span className="rounded-full bg-[#fff0ed] px-2 py-0.5 font-semibold text-[#d95d4d]">{unmatched} manuel eşleştirme gerekli</span>}
              </div>
              <label className="flex items-center gap-1.5 text-[#8b8c95]"><input type="checkbox" checked={showAllSubjects} onChange={(event) => setShowAllSubjects(event.target.checked)} /> Tüm derslerin konularını göster</label>
            </div>

            <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
              {units.map((unit) => {
                const practice = unit.rows.filter((row) => !isMixed(row.contentType));
                const unitTopicIds = new Set(practice.map((row) => row.topicId));
                const unitNeedsConfirm = practice.some((row) => row.topicId !== null && !row.confirmed);
                return (
                  <div key={unit.key} className="rounded-2xl border border-[#1f2333]/[0.07] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-[.08em] text-[#9a9ba3]">{unit.unitNumber !== null ? `${unit.unitNumber}. Ünite` : "Bölüm"}</div>
                        {source === "manual" ? (
                          <input value={unit.unitTitle} onChange={(event) => setRows((current) => current.map((row) => (unitKey(row) === unit.key ? { ...row, unitTitle: event.target.value } : row)))} placeholder="Ünite adı" className="form-input mt-1 h-8 text-[12px]" />
                        ) : (
                          <div className="truncate text-[13px] font-semibold text-[#1f2333]">{unit.unitTitle || "—"}</div>
                        )}
                      </div>
                      {practice.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          {unitNeedsConfirm && <button onClick={() => confirmUnit(unit.key)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#55a98b] px-2.5 text-[11px] font-semibold text-white"><Check size={12} /> Onayla</button>}
                          <select aria-label="Ünitenin konusunu değiştir" value={unitTopicIds.size === 1 ? String(Array.from(unitTopicIds)[0] ?? "") : ""} onChange={(event) => setUnitTopic(unit.key, event.target.value ? Number(event.target.value) : null)} className="form-input h-8 w-auto max-w-[220px] text-[11px]">
                            <option value="">{unitTopicIds.size > 1 ? "Karışık — tümüne uygula…" : "Konu seç…"}</option>
                            {topicOptions.data?.map((topic) => <option key={topic.id} value={topic.id}>{showAllSubjects ? `${topic.subject} · ` : ""}{topic.topic}</option>)}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 divide-y divide-[#1f2333]/[0.05]">
                      {unit.rows.map((row) => (
                        <div key={row.key} className="grid grid-cols-[1fr_auto] items-center gap-2 py-1.5 text-[11px] sm:grid-cols-[minmax(0,1.3fr)_auto_minmax(0,1.4fr)_auto]">
                          <div className="min-w-0">
                            {source === "manual" ? (
                              <div className="flex gap-1">
                                <input value={row.label} onChange={(event) => { const label = event.target.value; const number = label.match(/\d+/); updateRow(row.key, { label, testNumber: number ? Number(number[0]) : null }); }} className="form-input h-7 w-20 text-[11px]" aria-label="Etiket" />
                                <input value={row.title} onChange={(event) => updateRow(row.key, { title: event.target.value })} placeholder="Konu başlığı" className="form-input h-7 text-[11px]" aria-label="Başlık" />
                              </div>
                            ) : (
                              <div className="truncate"><span className="font-semibold text-[#343643]">{row.label}</span>{row.title && row.title !== row.label ? <span className="text-[#8b8c95]"> · {row.title}</span> : null}</div>
                            )}
                            <div className="text-[9px] text-[#b0b1b8]">{CONTENT_TYPE_LABELS[row.contentType]}</div>
                          </div>
                          <div className="flex items-center gap-1 text-[#8b8c95]">
                            sf.
                            <input type="number" min={1} value={row.pageStart ?? ""} onChange={(event) => updateRow(row.key, { pageStart: event.target.value ? Number(event.target.value) : null })} className="form-input h-7 w-14 px-1.5 text-[11px]" aria-label="Başlangıç sayfası" />
                            –
                            <input type="number" min={1} value={row.pageEnd ?? ""} onChange={(event) => updateRow(row.key, { pageEnd: event.target.value ? Number(event.target.value) : null })} className={`form-input h-7 w-14 px-1.5 text-[11px] ${row.pageStart !== null && row.pageEnd !== null && row.pageEnd < row.pageStart ? "border-[#d95d4d]" : ""}`} aria-label="Bitiş sayfası" />
                          </div>
                          <div className="col-span-2 min-w-0 sm:col-span-1">
                            {isMixed(row.contentType) ? (
                              <span className="text-[10px] text-[#b0b1b8]">Karma içerik — konuya bağlanmaz</span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <MatchBadge row={row} />
                                <select aria-label="Konuyu değiştir" value={row.topicId ?? ""} onChange={(event) => setRowTopic(row.key, event.target.value ? Number(event.target.value) : null)} className="form-input h-7 min-w-0 flex-1 text-[11px]">
                                  <option value="">{row.tier === "manual" ? "Manuel eşleştirme gerekli…" : "Konu yok"}</option>
                                  {row.topicId !== null && !topicOptions.data?.some((topic) => topic.id === row.topicId) && <option value={row.topicId}>{topicLabel(row.topicId) ?? "Önerilen konu"}</option>}
                                  {topicOptions.data?.map((topic) => <option key={topic.id} value={topic.id}>{showAllSubjects ? `${topic.subject} · ` : ""}{topic.topic}</option>)}
                                </select>
                              </div>
                            )}
                          </div>
                          <button onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))} className="justify-self-end rounded p-1 text-[#c4c5cc] hover:text-[#d95d4d]" aria-label="Satırı sil"><Trash2 size={12} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <button onClick={addRow} className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#1f2333]/10 px-3 text-[11px] font-semibold text-[#545661] hover:bg-[#f7f5ef]"><Plus size={13} /> Satır ekle</button>
                {source === "manual" && <button onClick={() => setRows((current) => { const lastUnit = current[current.length - 1]?.unitNumber ?? 0; const unitNumber = lastUnit + 1; return [...current, { key: nextKey(), unitNumber, unitTitle: "", contentType: "topic_test", label: "Test 1", testNumber: 1, title: "", pageStart: null, pageEnd: null, topicId: null, method: "manual", confidence: 1, tier: "manual", confirmed: true }]; })} className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#1f2333]/10 px-3 text-[11px] font-semibold text-[#545661] hover:bg-[#f7f5ef]"><Plus size={13} /> Ünite ekle</button>}
                <button onClick={() => { setStep("pages"); setRows([]); }} className="h-9 rounded-xl px-3 text-[11px] font-semibold text-[#8b8c95] hover:text-[#343643]">Geri</button>
              </div>
              <button onClick={submit} disabled={save.isPending} className="h-10 rounded-xl bg-[#1f2333] px-4 text-[12px] font-semibold text-white disabled:opacity-50">{save.isPending ? "Kaydediliyor…" : "Kütüphaneye kaydet"}</button>
            </div>
            {unmatched > 0 && pendingConfirm === 0 && <p className="mt-2 text-[10px] text-[#9a9ba3]">Konusu seçilmeyen {unmatched} satır da kaydedilir, ancak zayıf konu önerilerinde kullanılmaz.</p>}
          </div>
        )}

        {step === "saved" && (
          <div className="mt-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf6f0] text-[22px]">📚</div>
            <p className="mt-3 text-[13px] text-[#545661]">{rows.length} içerik satırı kaydedildi. Zayıf olduğun konular bu kitaptaki testlerle eşleşirse sana kitap bazlı çalışma önerisi göstereceğiz.</p>
            <button onClick={onClose} className="mt-5 h-10 rounded-xl bg-[#3b5ccc] px-5 text-[12px] font-semibold text-white">Tamam</button>
          </div>
        )}
      </div>
    </div>
  );
}

function MatchBadge({ row }: { row: Row }) {
  if (row.topicId === null) return <span className="shrink-0 rounded-full bg-[#fff0ed] px-1.5 py-0.5 text-[9px] font-bold text-[#d95d4d]">Eşleşme yok</span>;
  if (row.method === "manual") return <span className="shrink-0 rounded-full bg-[#edf1ff] px-1.5 py-0.5 text-[9px] font-bold text-[#3b5ccc]">Elle seçildi</span>;
  const percent = `%${Math.round(row.confidence * 100)}`;
  if (row.confirmed) return <span className="shrink-0 rounded-full bg-[#eaf6f0] px-1.5 py-0.5 text-[9px] font-bold text-[#3c8a6d]">✓ {percent}</span>;
  return <span className="shrink-0 rounded-full bg-[#fff8df] px-1.5 py-0.5 text-[9px] font-bold text-[#a1711d]">Onay gerekli {percent}</span>;
}
