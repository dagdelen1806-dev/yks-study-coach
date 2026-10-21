import { trpc } from "@/lib/trpc";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EXAM_TRACK_DEFS, EXAM_TRACKS, GRADE_LEVEL_LABELS, defaultKindOf, subjectNamesOf, type ExamTrack, type GradeLevel } from "@shared/exams";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { primaryButton, secondaryButton } from "./kit";

/**
 * Üst çubuktaki aktif sınav seçici. Aday birden çok sınava hazırlanabilir (ör. KPSS + MEB-AGS);
 * konu haritası, denemeler, AI planı ve yapay zekâ kotası aktif sınava göre çalışır. Sınav
 * değişince sayfa yenilenir: sayfadaki tüm önbellek yeni sınavla baştan kurulsun.
 */
export default function ExamTrackSwitcher() {
  const tracks = trpc.onboarding.tracks.useQuery(undefined, { retry: false });
  const [adding, setAdding] = useState(false);
  const switchTrack = trpc.onboarding.switchTrack.useMutation({ onSuccess: () => window.location.reload(), onError: (error) => toast.error(error.message) });
  const rows = tracks.data ?? [];
  const active = rows.find((row) => row.active);
  if (!active) return null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rule bg-white px-3 text-[13px] font-bold text-ink hover:border-brand/40" aria-label="Aktif sınav">
            {EXAM_TRACK_DEFS[active.track].label}<ChevronDown size={14} className="text-ink-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {rows.map((row) => (
            <DropdownMenuItem key={row.track} disabled={row.active || switchTrack.isPending} onClick={() => switchTrack.mutate({ track: row.track })}>
              <span className="flex-1">{EXAM_TRACK_DEFS[row.track].label}{row.examYear ? ` · ${row.examYear}` : ""}</span>{row.active && <Check size={14} className="text-brand" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setAdding(true)}><Plus size={14} className="mr-2" /> Sınav ekle</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {adding && <AddExamTrackDialog existing={rows.map((row) => row.track)} onClose={() => setAdding(false)} />}
    </>
  );
}

/** Yeni sınav ekleme: sınav, eğitim durumu, sınav yılı ve (gerekiyorsa) alan testleri. */
export function AddExamTrackDialog({ existing, onClose }: { existing: ExamTrack[]; onClose: () => void }) {
  const available = EXAM_TRACKS.filter((track) => !existing.includes(track));
  const [track, setTrack] = useState<ExamTrack | "">(available[0] ?? "");
  const [gradeLevel, setGradeLevel] = useState<GradeLevel | "">("");
  const [examYear, setExamYear] = useState(String(new Date().getFullYear() + 1));
  const [selected, setSelected] = useState<string[]>([]);
  const add = trpc.onboarding.addTrack.useMutation({
    onSuccess: () => { toast.success("Sınav eklendi; şimdi ona geçiyoruz."); window.location.reload(); },
    onError: (error) => toast.error(error.message),
  });
  const def = track ? EXAM_TRACK_DEFS[track] : null;
  const submit = () => {
    if (!track || !gradeLevel) { toast.error("Sınavı ve eğitim durumunu seç."); return; }
    add.mutate({ track, gradeLevel, examYear: Number(examYear), selectedSubjects: selected, activate: true });
  };
  return (
    <div className="modal-backdrop" style={{ zIndex: 320 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-card max-w-[460px]" role="dialog" aria-modal="true" aria-label="Sınav ekle">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[13px] font-semibold text-brand">Birden çok sınava hazırlanıyorsan</p><h2 className="mt-1 text-[20px] font-extrabold text-ink">Sınav ekle</h2></div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-4 hover:bg-paper" aria-label="Kapat"><X size={17} /></button>
        </div>
        {available.length === 0 ? <p className="mt-4 text-[13px] text-ink-3">Tüm sınavlar zaten listende.</p> : (
          <div className="mt-4 space-y-4">
            <label className="block"><span className="form-label">Sınav</span>
              <select value={track} onChange={(event) => { setTrack(event.target.value as ExamTrack); setGradeLevel(""); setSelected([]); }} className="form-input">
                {available.map((item) => <option key={item} value={item}>{EXAM_TRACK_DEFS[item].label} — {EXAM_TRACK_DEFS[item].onboarding.description}</option>)}
              </select>
            </label>
            {def && (
              <>
                <label className="block"><span className="form-label">{def.gradeQuestion}</span>
                  <select value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value as GradeLevel)} className="form-input" aria-label={def.gradeQuestion}>
                    <option value="">Seç</option>
                    {def.gradeLevels.map((grade) => <option key={grade} value={grade}>{GRADE_LEVEL_LABELS[grade]}</option>)}
                  </select>
                </label>
                <label className="block"><span className="form-label">Hedef sınav yılın</span><input inputMode="numeric" value={examYear} onChange={(event) => setExamYear(event.target.value.replace(/[^0-9]/g, ""))} maxLength={4} className="form-input max-w-[140px]" /></label>
                {def.chooseSubjects && (
                  <div><span className="form-label">{def.chooseSubjects.label}</span>
                    <div className="flex flex-wrap gap-2">
                      {subjectNamesOf(defaultKindOf(track as ExamTrack)).map((subject) => {
                        const on = selected.includes(subject);
                        return <button key={subject} type="button" role="checkbox" aria-checked={on} onClick={() => setSelected(on ? selected.filter((item) => item !== subject) : [...selected, subject])} className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium ${on ? "border-brand bg-brand text-white" : "border-rule bg-white text-ink-2"}`}>{subject}</button>;
                      })}
                    </div>
                  </div>
                )}
                {def.addonOf && <p className="rounded-xl bg-paper px-3 py-2 text-[12.5px] leading-5 text-ink-3">{def.label}, {EXAM_TRACK_DEFS[def.addonOf].label}'nin branşıdır: {EXAM_TRACK_DEFS[def.addonOf].label} aboneliğin varsa bu sınavın aboneliği indirimli olur.</p>}
              </>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className={secondaryButton}>Vazgeç</button>
              <button onClick={submit} disabled={add.isPending} className={primaryButton}><Plus size={15} /> {add.isPending ? "Ekleniyor…" : "Ekle ve geç"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
