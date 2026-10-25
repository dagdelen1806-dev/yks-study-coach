import { PageHeader, Panel, primaryButton, secondaryButton } from "@/components/app/kit";
import { trpc } from "@/lib/trpc";
import { toLocalDateKey } from "@shared/dates";
import { AFFIRMATION_MAX, AFFIRMATION_MIN, JAR_CAPACITY, PRESET_AFFIRMATIONS, grainPosition, matchesAffirmation } from "@shared/intentionJar";
import { Amphora, Check, Loader2, Lock, Moon, PenLine } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * Niyet Kavanozum: öğrencinin kendine verdiği söz ve her akşam tekrarıyla biriken pirinç taneleri.
 * Kavanoz bir hatırlatıcıdır; pirincin bir gücü olduğu iddia edilmez. Yalnızca öğrenci görür.
 */
export default function IntentionJarSection() {
  const utils = trpc.useUtils();
  const jar = trpc.jar.get.useQuery();
  const [typed, setTyped] = useState("");
  const [justAdded, setJustAdded] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const ritual = trpc.jar.ritual.useMutation({
    onSuccess: (result) => {
      utils.jar.get.setData(undefined, result.jar);
      setTyped("");
      if (result.added) { setJustAdded(result.jar.total - 1); toast.success("Bugünün tanesi kavanozda. Sözünü hatırladığın için teşekkürler."); }
      else toast("Bugünün tanesi zaten kavanozda; yarın akşam yeniden görüşürüz.");
    },
    onError: (error) => toast.error(error.message),
  });

  if (jar.isLoading) return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="animate-spin text-brand" /></div>;
  if (!jar.data) return <p className="text-[13px] text-danger">Kavanoz yüklenemedi. <button onClick={() => jar.refetch()} className="font-semibold underline">Tekrar dene</button></p>;
  const data = jar.data;
  const ready = Boolean(data.active) && matchesAffirmation(typed, data.active?.text ?? "");

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Kişisel" title="Niyet Kavanozum" description={<>Kendine olumlu bir söz ver; her akşam onu yeniden yazdığında kavanoza bir pirinç tanesi düşer. Pirincin bir gücü yok: kavanoz, sözünü hatırladığın günlerin sembolü. <span className="inline-flex items-center gap-1 font-semibold text-ink-2"><Lock size={12} /> Yalnızca sen görürsün.</span></>} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
        <Panel icon={<Amphora size={18} />} title="Kavanozum" subtitle={`${data.total} tane${data.fullJars ? ` · ${data.fullJars} dolu kavanoz` : ""}`}>
          <Jar count={data.inCurrent} highlight={justAdded !== null ? justAdded % JAR_CAPACITY : null} />
          <div className="mt-3 text-center text-[13px] text-ink-3">
            {data.total === 0 ? "Kavanozun seni bekliyor. İlk tanesi bu akşam düşebilir." : `Bu kavanozda ${data.inCurrent} / ${JAR_CAPACITY} tane.`}
            {data.fullJars > 0 && <div className="mt-2 flex justify-center gap-1" aria-label={`${data.fullJars} dolu kavanoz`}>{Array.from({ length: Math.min(data.fullJars, 12) }, (_, index) => <Amphora key={index} size={18} className="text-brand" />)}</div>}
          </div>
          <RecentDays days={data.recentDays} />
        </Panel>

        <div className="space-y-5">
          {data.active && !editing ? (
            <Panel icon={<Moon size={18} />} title="Akşam tekrarı" subtitle={data.doneToday ? "Bugünün tanesi kavanozda." : "Sözünü yeniden yaz; aynıysa bugünün tanesi düşer."}>
              <blockquote className="rounded-2xl border border-brand/15 bg-brand-soft/50 px-5 py-4 text-[17px] font-semibold leading-7 text-ink">“{data.active.text}”</blockquote>
              {data.doneToday ? (
                <p className="mt-4 flex items-center gap-2 text-[14px] font-semibold text-success"><Check size={16} /> Bugün sözünü tekrarladın. Yarın akşam yeniden görüşürüz.</p>
              ) : (
                <div className="mt-4">
                  <label htmlFor="jar-ritual" className="form-label">Sözünü kendi cümlenle yeniden yaz</label>
                  <textarea id="jar-ritual" value={typed} onChange={(event) => setTyped(event.target.value)} rows={2} maxLength={AFFIRMATION_MAX + 20} className="form-input h-auto py-2 text-[15px]" placeholder={data.active.text} />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button onClick={() => ritual.mutate({ typed })} disabled={!ready || ritual.isPending} className={primaryButton}>{ritual.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Sözümü tekrarladım</button>
                    <span className="text-[12px] text-ink-4">{typed && !ready ? "Henüz sözünle aynı değil." : "Büyük/küçük harf ve noktalama önemli değil."}</span>
                  </div>
                </div>
              )}
              <button onClick={() => setEditing(true)} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand"><PenLine size={14} /> Sözümü değiştir</button>
              <p className="mt-2 text-[12px] text-ink-4">Bir akşam unutursan sorun değil: ceza yok, taneler kaybolmaz.</p>
            </Panel>
          ) : (
            <AffirmationEditor current={data.active?.text ?? null} onDone={() => setEditing(false)} canCancel={Boolean(data.active)} />
          )}

          {data.previous.length > 0 && (
            <Panel title="Önceki sözlerim" subtitle="Değiştirdiğin sözler silinmez; o günlerin taneleri de kavanozda.">
              <ul className="space-y-2 text-[13px]">{data.previous.map((row) => <li key={row.id} className="rounded-xl bg-paper px-3 py-2 text-ink-2">“{row.text}” <span className="text-ink-4">· {new Date(row.createdAt).toLocaleDateString("tr-TR")}{row.archivedAt ? ` – ${new Date(row.archivedAt).toLocaleDateString("tr-TR")}` : ""}</span></li>)}</ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function AffirmationEditor({ current, onDone, canCancel }: { current: string | null; onDone: () => void; canCancel: boolean }) {
  const utils = trpc.useUtils();
  const currentPreset = PRESET_AFFIRMATIONS.find((item) => item.text === current)?.key ?? null;
  const [presetKey, setPresetKey] = useState<string | null>(currentPreset ?? (current ? null : PRESET_AFFIRMATIONS[0].key));
  const [custom, setCustom] = useState(current && !currentPreset ? current : "");
  const save = trpc.jar.setAffirmation.useMutation({ onSuccess: (state) => { utils.jar.get.setData(undefined, state); toast.success("Sözün kaydedildi."); onDone(); }, onError: (error) => toast.error(error.message) });
  const customText = custom.replace(/\s+/g, " ").trim();
  const valid = presetKey !== null || (customText.length >= AFFIRMATION_MIN && customText.length <= AFFIRMATION_MAX);
  return (
    <Panel icon={<PenLine size={18} />} title={current ? "Sözümü değiştir" : "Kendine bir söz ver"} subtitle="Hazır sözlerden birini seç ya da kendi cümleni yaz. Olumlu, şimdiki zamanda ve sana ait olsun.">
      <div role="radiogroup" aria-label="Hazır sözler" className="grid gap-2 sm:grid-cols-2">
        {PRESET_AFFIRMATIONS.map((item) => (
          <button key={item.key} role="radio" aria-checked={presetKey === item.key} onClick={() => setPresetKey(item.key)} className={`rounded-xl border px-3 py-2.5 text-left text-[13px] leading-5 transition ${presetKey === item.key ? "border-brand bg-brand-soft/60 font-semibold text-ink" : "border-rule text-ink-2 hover:border-brand/40"}`}>{item.text}</button>
        ))}
      </div>
      <label htmlFor="jar-custom" className="form-label mt-4">ya da kendi sözün</label>
      <textarea id="jar-custom" value={custom} onChange={(event) => { setCustom(event.target.value); setPresetKey(null); }} onFocus={() => setPresetKey(null)} rows={2} maxLength={AFFIRMATION_MAX} className="form-input h-auto py-2" placeholder="Örn. Her gün biraz daha gelişiyor ve hedefime yaklaşıyorum." />
      <div className="mt-1 text-right text-[11px] text-ink-4">{customText.length}/{AFFIRMATION_MAX}</div>
      <div className="mt-3 flex gap-2">
        <button disabled={!valid || save.isPending} onClick={() => save.mutate(presetKey ? { presetKey } : { text: customText })} className={primaryButton}>{save.isPending ? <Loader2 size={15} className="animate-spin" /> : "Sözümü kaydet"}</button>
        {canCancel && <button onClick={onDone} className={secondaryButton}>Vazgeç</button>}
      </div>
    </Panel>
  );
}

/** Son 14 gün: tane düşen günler dolu nokta; boş günler nötr (kırmızı/eksik vurgusu yok). */
function RecentDays({ days }: { days: string[] }) {
  const set = new Set(days);
  const list = Array.from({ length: 14 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (13 - index)); return { key: toLocalDateKey(date), label: date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) }; });
  return (
    <div className="mt-4" aria-label="Son 14 gün">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-4">Son 14 akşam</div>
      <div className="mt-2 grid grid-cols-7 gap-1.5 sm:grid-cols-14">
        {list.map((day) => <span key={day.key} title={`${day.label}${set.has(day.key) ? " · tane düştü" : ""}`} className={`h-3 rounded-full ${set.has(day.key) ? "bg-[#d9c48f]" : "bg-paper"}`} />)}
      </div>
    </div>
  );
}

/** Cam kavanoz ve içindeki taneler (SVG). Yeni tane yukarıdan düşer; hareket azaltma tercihinde animasyon yok. */
function Jar({ count, highlight }: { count: number; highlight: number | null }) {
  const grains = useMemo(() => Array.from({ length: count }, (_, index) => ({ index, ...grainPosition(index) })), [count]);
  const [animate, setAnimate] = useState(highlight);
  useEffect(() => { setAnimate(highlight); const timer = window.setTimeout(() => setAnimate(null), 1600); return () => window.clearTimeout(timer); }, [highlight]);
  const left = 34, width = 132, bottom = 246, height = 168;
  return (
    <div className="mx-auto w-full max-w-[260px]">
      <style>{`@keyframes jar-grain-fall { 0% { transform: translateY(-190px) rotate(0deg); opacity: 0; } 20% { opacity: 1; } 80% { transform: translateY(4px); } 100% { transform: translateY(0); } }
        .jar-grain-new { animation: jar-grain-fall 1.2s cubic-bezier(.3,.7,.4,1) both; transform-box: fill-box; }
        @media (prefers-reduced-motion: reduce) { .jar-grain-new { animation: none; } }`}</style>
      <svg viewBox="0 0 200 270" role="img" aria-label={`Kavanozda ${count} pirinç tanesi`} className="h-auto w-full">
        <defs>
          <linearGradient id="jar-glass" x1="0" x2="1"><stop offset="0" stopColor="#e8f1f4" stopOpacity="0.9" /><stop offset="0.5" stopColor="#ffffff" stopOpacity="0.4" /><stop offset="1" stopColor="#dbe8ee" stopOpacity="0.9" /></linearGradient>
          <clipPath id="jar-inside"><path d="M38 78 Q30 84 30 100 L30 236 Q30 252 46 252 L154 252 Q170 252 170 236 L170 100 Q170 84 162 78 Z" /></clipPath>
        </defs>
        <rect x="58" y="24" width="84" height="22" rx="6" fill="#b98a5a" />
        <rect x="54" y="42" width="92" height="10" rx="4" fill="#a3764a" />
        <path d="M62 52 L62 66 Q34 72 30 100 L30 236 Q30 256 50 256 L150 256 Q170 256 170 236 L170 100 Q166 72 138 66 L138 52 Z" fill="url(#jar-glass)" stroke="#9fb6c0" strokeWidth="2.5" />
        <g clipPath="url(#jar-inside)">
          {grains.map((grain) => (
            <ellipse key={grain.index} className={animate === grain.index ? "jar-grain-new" : undefined} cx={left + grain.x * width} cy={bottom - grain.y * height} rx="4.4" ry="2.3" transform={`rotate(${grain.rotate} ${left + grain.x * width} ${bottom - grain.y * height})`} fill="#f4ecd6" stroke="#d6c493" strokeWidth="0.6" />
          ))}
        </g>
        <path d="M44 104 Q42 170 48 228" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="5" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}
