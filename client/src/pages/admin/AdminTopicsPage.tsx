import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Pencil, Plus, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EXAM_KINDS, EXAM_KIND_DEFS, type ExamKind } from "@shared/exams";

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
      </Card>

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
