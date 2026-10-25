import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Eye, EyeOff, Loader2, Pencil, Plus, Search, Upload, X } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EXAM_KINDS, EXAM_KIND_DEFS, type ExamKind } from "@shared/exams";
import { TOPIC_SHEET_COLUMNS, parseTopicSheet, type TopicSheetRow } from "@shared/topicSheet";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type AdminTopic = RouterOutputs["admin"]["topics"]["list"]["topics"][number];
type ImportPlan = RouterOutputs["admin"]["topics"]["importPreview"];
type ImportState = { fileName: string; rows: TopicSheetRow[]; otherExamLines: number[]; plan: ImportPlan };

/** Sınavın tüm konuları (gizliler dahil) tek sayfalık Excel'e; aynı dosya içe aktarma şablonudur. */
async function exportTopics(exam: ExamKind, topics: AdminTopic[]) {
  const XLSX = await import("xlsx");
  const rows = topics.map((row) => [row.id, EXAM_KIND_DEFS[exam].label, row.subject, row.unit, row.topic, row.hidden ? "Evet" : "Hayır", ORIGIN_LABELS[row.origin], row.studentCount, row.previousNames.join(", ")]);
  const sheet = XLSX.utils.aoa_to_sheet([[...TOPIC_SHEET_COLUMNS], ...rows]);
  sheet["!cols"] = [{ wch: 8 }, { wch: 12 }, { wch: 18 }, { wch: 34 }, { wch: 48 }, { wch: 7 }, { wch: 20 }, { wch: 14 }, { wch: 30 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Konular");
  XLSX.writeFile(workbook, `konular-${exam}-${new Date().toLocaleDateString("sv-SE")}.xlsx`);
}

function ImportPreview({ exam, state, applying, onApply, onClose }: { exam: ExamKind; state: ImportState; applying: boolean; onApply: () => void; onClose: () => void }) {
  const { plan } = state;
  const changes = plan.add.length + plan.update.length;
  const describe = (item: ImportPlan["update"][number]) => [
    item.to.topic !== item.from.topic && `ad: ${item.from.topic} → ${item.to.topic}`,
    item.to.unit !== item.from.unit && `ünite: ${item.from.unit} → ${item.to.unit}`,
    item.to.hidden !== item.from.hidden && (item.to.hidden ? "gizlenecek" : "gösterilecek"),
  ].filter(Boolean).join(" · ");
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !applying && onClose()}>
      <div className="modal-card max-w-[860px]!" role="dialog" aria-label="Excel aktarım önizlemesi">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow mb-2">{EXAM_KIND_DEFS[exam].label} · {state.fileName}</div>
            <h2 className="text-[22px] font-semibold text-ink font-display">Excel aktarım önizlemesi</h2>
            <p className="mt-1 text-[13px] text-ink-3">Henüz hiçbir şey kaydedilmedi. Değişiklikleri kontrol edip "Uygula"ya bas.</p>
          </div>
          <button onClick={onClose} disabled={applying} className="rounded-lg p-2 text-ink-3 hover:bg-paper" aria-label="Kapat"><X size={16} /></button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[["Eklenecek", plan.add.length, "bg-success-soft text-success"], ["Güncellenecek", plan.update.length, "bg-brand-soft text-brand"], ["Değişmeyen", plan.unchanged, "bg-paper text-ink-3"], ["Atlanacak", plan.skipped.length + state.otherExamLines.length, "bg-warn-soft text-warn"]].map(([label, value, tone]) => (
            <div key={label as string} className={`rounded-xl p-3 ${tone}`}><div className="text-[12px] font-medium opacity-80">{label}</div><div className="text-[22px] font-semibold">{value}</div></div>
          ))}
        </div>
        <div className="mt-4 max-h-[44vh] space-y-4 overflow-auto text-[13px]">
          {plan.add.length > 0 && <section><h3 className="font-bold text-ink">Eklenecek konular</h3><ul className="mt-1 space-y-0.5">{plan.add.slice(0, 300).map((item) => <li key={item.line} className="text-ink-2"><span className="text-ink-4">{item.line}.</span> {item.subject} › {item.unit} › <strong>{item.topic}</strong>{item.hidden ? " (gizli)" : ""}</li>)}</ul></section>}
          {plan.update.length > 0 && <section><h3 className="font-bold text-ink">Güncellenecek konular</h3><ul className="mt-1 space-y-0.5">{plan.update.slice(0, 300).map((item) => <li key={item.line} className="text-ink-2"><span className="text-ink-4">{item.line}.</span> {item.subject} › {describe(item)}</li>)}</ul></section>}
          {(plan.skipped.length > 0 || state.otherExamLines.length > 0) && (
            <section><h3 className="font-bold text-warn">Atlanacak satırlar</h3><ul className="mt-1 space-y-0.5">
              {state.otherExamLines.length > 0 && <li className="text-ink-2">Satır {state.otherExamLines.slice(0, 20).join(", ")}{state.otherExamLines.length > 20 ? "…" : ""}: başka sınava ait.</li>}
              {plan.skipped.slice(0, 300).map((item) => <li key={item.line} className="text-ink-2"><span className="text-ink-4">{item.line}.</span> {item.topic}: {item.reason}</li>)}
            </ul></section>
          )}
          {(plan.add.length > 300 || plan.update.length > 300 || plan.skipped.length > 300) && <p className="text-[12px] text-ink-4">Listeler ilk 300 satırla sınırlı gösteriliyor; uygulama tüm satırları kapsar.</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={applying}>Vazgeç</Button>
          <Button onClick={onApply} disabled={applying || changes === 0}>{applying ? <Loader2 size={14} className="animate-spin" /> : changes === 0 ? "Değişiklik yok" : `Uygula (${changes})`}</Button>
        </div>
      </div>
    </div>
  );
}

const ORIGIN_LABELS = { curriculum: "Müfredat", admin: "Yönetici ekledi", other: "Eski / öğrenci kaydı" } as const;
const FORM_NOTES: Record<"dershaneTemplate" | "curriculum" | "studentTopics", string> = {
  curriculum: "Bu sınavın deneme formundaki konu satırları bu listeden gelir: eklediğin konu forma girer, gizlediğin çıkar.",
  dershaneTemplate: "TYT deneme formu soru sayılı dershane şablonunu kullanır; buradaki değişiklikler konu haritasına, kitap eşleştirmeye ve AI plana yansır. Yeniden adlandırılan konuya şablonun eski adı da bağlanır.",
  studentTopics: "AYT deneme formu öğrencinin kendi konularından gelir; buradaki değişiklikler konu haritasına, kitap eşleştirmeye ve AI plana yansır.",
};

/**
 * Yönetim Paneli → Konular: sınav > ders > ünite > konu. Konu silinmez, gizlenir (öğrenci verisi kalır, müfredat
 * tohumu geri eklemez). Yeniden adlandırılan konunun eski adı saklanır; eski adla gelen veri aynı konuya bağlanır.
 */
export default function AdminTopicsPage() {
  const utils = trpc.useUtils();
  const [exam, setExam] = useState<ExamKind>("TYT");
  const [subject, setSubject] = useState("");
  const [query, setQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const list = trpc.admin.topics.list.useQuery({ exam });
  useEffect(() => { if (list.data && !list.data.subjects.includes(subject)) setSubject(list.data.subjects[0] ?? ""); }, [list.data, subject]);
  const refresh = () => { utils.admin.topics.list.invalidate({ exam }); utils.topics.curriculum.invalidate(); };
  const onError = (error: { message: string }) => toast.error(error.message);
  const add = trpc.admin.topics.add.useMutation({ onSuccess: () => { toast.success("Konu eklendi."); setNewTopic(""); refresh(); }, onError });
  const update = trpc.admin.topics.update.useMutation({ onSuccess: () => { toast.success("Konu güncellendi."); setEditing(null); refresh(); }, onError });
  const renameUnit = trpc.admin.topics.renameUnit.useMutation({ onSuccess: (result) => { toast.success(`Ünite adı ${result.count} konuda güncellendi.`); setEditingUnit(null); refresh(); }, onError });
  const setHidden = trpc.admin.topics.setHidden.useMutation({ onSuccess: (_, input) => { toast.success(input.hidden ? "Konu gizlendi." : "Konu yeniden gösteriliyor."); refresh(); }, onError });

  // Excel'den yükleme: dosya tarayıcıda okunur, sunucu planlar (önizleme), onaylanınca uygular.
  const fileRef = useRef<HTMLInputElement>(null);
  const [importState, setImportState] = useState<ImportState | null>(null);
  const preview = trpc.admin.topics.importPreview.useMutation({ onError });
  const apply = trpc.admin.topics.importApply.useMutation({
    onSuccess: (plan) => { toast.success(`${plan.add.length} konu eklendi, ${plan.update.length} konu güncellendi.`); setImportState(null); refresh(); },
    onError,
  });
  const readFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) { toast.error("Excel (.xlsx, .xls) ya da CSV dosyası seç."); return; }
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsed = parseTopicSheet(XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false }), exam);
      if (parsed.missingColumns.length) { toast.error(`Dosyada şu sütun(lar) yok: ${parsed.missingColumns.join(", ")}. "Excel'e aktar" ile şablonu indirip onu doldur.`); return; }
      if (!parsed.rows.length) { toast.error(parsed.otherExamLines.length ? `Dosyadaki satırlar ${EXAM_KIND_DEFS[exam].label} sınavına ait değil; önce sınavı seç.` : "Dosyada konu satırı yok."); return; }
      if (parsed.rows.length > 3000) { toast.error("Tek seferde en fazla 3000 satır yüklenebilir."); return; }
      const plan = await preview.mutateAsync({ exam, rows: parsed.rows });
      setImportState({ fileName: file.name, rows: parsed.rows, otherExamLines: parsed.otherExamLines, plan });
    } catch (error) {
      if (!(error instanceof Error && /TRPC/.test(error.name))) toast.error("Dosya okunamadı. Excel dosyasının bozuk olmadığından emin ol.");
    }
  };

  const [newUnit, setNewUnit] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [editing, setEditing] = useState<{ id: number; topic: string; unit: string } | null>(null);
  const [editingUnit, setEditingUnit] = useState<{ from: string; to: string } | null>(null);

  const subjectTopics = useMemo(() => (list.data?.topics ?? []).filter((row) => row.subject === subject), [list.data, subject]);
  const units = useMemo(() => Array.from(new Set(subjectTopics.map((row) => row.unit))), [subjectTopics]);
  const needle = query.trim().toLocaleLowerCase("tr");
  const visible = subjectTopics.filter((row) => (showHidden || !row.hidden) && (!needle || `${row.topic} ${row.unit} ${row.previousNames.join(" ")}`.toLocaleLowerCase("tr").includes(needle)));
  const groups = units.map((unit) => ({ unit, rows: visible.filter((row) => row.unit === unit) })).filter((group) => group.rows.length > 0);
  const hiddenCount = subjectTopics.filter((row) => row.hidden).length;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
          <label className="block text-[12px] font-semibold text-ink-2">Sınav
            <select value={exam} onChange={(event) => { setExam(event.target.value as ExamKind); setSubject(""); setEditing(null); }} className="form-input mt-1">
              {EXAM_KINDS.map((kind) => <option key={kind} value={kind}>{EXAM_KIND_DEFS[kind].label}</option>)}
            </select>
          </label>
          <div>
            <span className="block text-[12px] font-semibold text-ink-2">Ders</span>
            <div className="mt-1 flex flex-wrap gap-1.5" role="tablist" aria-label="Dersler">
              {(list.data?.subjects ?? []).map((name) => (
                <button key={name} role="tab" aria-selected={name === subject} onClick={() => { setSubject(name); setEditing(null); }} className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${name === subject ? "bg-brand text-white" : "bg-paper text-ink-3 hover:text-ink"}`}>
                  {name} <span className="font-normal opacity-75">{(list.data?.topics ?? []).filter((row) => row.subject === name && !row.hidden).length}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-[12px] text-ink-3">{FORM_NOTES[EXAM_KIND_DEFS[exam].formRows]}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" disabled={!list.data} onClick={() => list.data && void exportTopics(exam, list.data.topics)}><Download size={14} /> Excel'e aktar</Button>
          <Button variant="outline" size="sm" disabled={preview.isPending} onClick={() => fileRef.current?.click()}>{preview.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Excel'den yükle</Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" aria-label="Konu Excel dosyası" onChange={(event) => { void readFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
          <span className="text-[12px] text-ink-4">Aktarılan dosya şablondur: Kimlik dolu satır o konuyu günceller, boş satır yeni konu ekler. Gizli: Evet / Hayır.</span>
        </div>
      </Card>

      {importState && <ImportPreview exam={exam} state={importState} applying={apply.isPending} onApply={() => apply.mutate({ exam, rows: importState.rows })} onClose={() => setImportState(null)} />}

      {subject && (
        <Card className="p-5">
          <h2 className="text-[15px] font-bold text-ink">{subject} dersine konu ekle</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
            <input value={newUnit} onChange={(event) => setNewUnit(event.target.value)} list="admin-topic-units" placeholder="Ünite (var olanı seç ya da yenisini yaz)" className="form-input" aria-label="Ünite" />
            <datalist id="admin-topic-units">{units.map((unit) => <option key={unit} value={unit} />)}</datalist>
            <input value={newTopic} onChange={(event) => setNewTopic(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && newUnit.trim().length >= 2 && newTopic.trim().length >= 2) add.mutate({ exam, subject, unit: newUnit.trim(), topic: newTopic.trim() }); }} placeholder="Konu adı" className="form-input" aria-label="Konu adı" />
            <Button disabled={add.isPending || newUnit.trim().length < 2 || newTopic.trim().length < 2} onClick={() => add.mutate({ exam, subject, unit: newUnit.trim(), topic: newTopic.trim() })}><Plus size={14} /> Ekle</Button>
          </div>
        </Card>
      )}

      <Card className="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-rule px-5 py-3">
          <div className="relative min-w-[200px] flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Konu, ünite ya da eski ad ara" className="form-input pl-8" aria-label="Konu ara" /></div>
          <label className="inline-flex items-center gap-2 text-[12px] font-semibold text-ink-2"><input type="checkbox" checked={showHidden} onChange={(event) => setShowHidden(event.target.checked)} /> Gizlenenleri göster ({hiddenCount})</label>
        </div>
        {list.isLoading ? <div className="p-8 text-center"><Loader2 className="mx-auto animate-spin text-ink-4" /></div> : !groups.length ? <p className="p-6 text-center text-[13px] text-ink-3">{subjectTopics.length ? "Aramaya uyan konu yok." : "Bu derste henüz konu yok; yukarıdan ekleyebilirsin."}</p> : (
          <div className="divide-y divide-rule">
            {groups.map((group) => (
              <section key={group.unit} aria-label={`${group.unit} ünitesi`} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {editingUnit?.from === group.unit ? (
                    <div className="flex flex-1 flex-wrap gap-2">
                      <input value={editingUnit.to} onChange={(event) => setEditingUnit({ ...editingUnit, to: event.target.value })} className="form-input max-w-[360px]" aria-label="Yeni ünite adı" />
                      <Button size="sm" disabled={renameUnit.isPending || editingUnit.to.trim().length < 2} onClick={() => renameUnit.mutate({ exam, subject, from: group.unit, to: editingUnit.to.trim() })}>Kaydet</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingUnit(null)}>Vazgeç</Button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-[13px] font-bold uppercase tracking-wide text-ink-3">{group.unit}</h3>
                      <button onClick={() => setEditingUnit({ from: group.unit, to: group.unit })} className="text-[12px] font-semibold text-brand">Üniteyi yeniden adlandır</button>
                    </>
                  )}
                </div>
                <ul className="mt-2 space-y-1">
                  {group.rows.map((row) => (
                    <li key={row.id} className={`rounded-xl px-3 py-2 ${row.hidden ? "bg-paper opacity-70" : "hover:bg-paper"}`}>
                      {editing?.id === row.id ? (
                        <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_auto_auto]">
                          <input value={editing.topic} onChange={(event) => setEditing({ ...editing, topic: event.target.value })} className="form-input" aria-label="Konu adı (düzenle)" />
                          <input value={editing.unit} onChange={(event) => setEditing({ ...editing, unit: event.target.value })} list="admin-topic-units" className="form-input" aria-label="Ünite (düzenle)" />
                          <Button size="sm" disabled={update.isPending || editing.topic.trim().length < 2 || editing.unit.trim().length < 2} onClick={() => update.mutate({ id: row.id, topic: editing.topic.trim(), unit: editing.unit.trim() })}>Kaydet</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Vazgeç</Button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 text-[13px]">
                          <span className={`min-w-0 flex-1 font-semibold ${row.hidden ? "text-ink-4 line-through" : "text-ink"}`}>{row.topic}</span>
                          {row.previousNames.length > 0 && <span className="text-[11px] text-ink-4" title={row.previousNames.join(", ")}>eski ad: {row.previousNames.join(", ")}</span>}
                          <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] text-ink-3">{ORIGIN_LABELS[row.origin]}</span>
                          {row.studentCount > 0 && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">{row.studentCount} öğrencide veri</span>}
                          {row.hidden && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-bold text-warn">Gizli</span>}
                          <button onClick={() => setEditing({ id: row.id, topic: row.topic, unit: row.unit })} className="rounded-lg p-1.5 text-ink-3 hover:bg-white hover:text-ink" aria-label={`${row.topic} düzenle`}><Pencil size={14} /></button>
                          <button disabled={setHidden.isPending} onClick={() => { if (row.hidden || window.confirm(`"${row.topic}" gizlensin mi? Yeni listelerde ve deneme formunda görünmez; öğrencilerin mevcut verisi korunur.`)) setHidden.mutate({ id: row.id, hidden: !row.hidden }); }} className="rounded-lg p-1.5 text-ink-3 hover:bg-white hover:text-ink" aria-label={`${row.topic} ${row.hidden ? "göster" : "gizle"}`}>{row.hidden ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
