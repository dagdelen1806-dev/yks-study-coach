import { PageHeader, Panel } from "@/components/app/kit";
import { trpc } from "@/lib/trpc";
import { GARDEN_STAGES, type GardenTheme } from "@shared/effortGarden";
import { BookOpen, CalendarCheck, Check, Flower2, Loader2, Lock, Sprout, TreeDeciduous } from "lucide-react";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

const THEMES: Record<GardenTheme, { sky: [string, string]; ground: string; grass: string; leaf: string; leaf2: string; trunk: string; flowers: string[]; intro: string; growing: string }> = {
  playful: { sky: ["#bfe6ff", "#effaff"], ground: "#8fd16a", grass: "#6fbf4a", leaf: "#4fb84a", leaf2: "#7fd36b", trunk: "#9a6a3c", flowers: ["#ff7ab6", "#ffd23f", "#b07cff", "#ff9f43"], intro: "Kitap okudukça ağacın yapraklanıyor, paragraf çözdükçe çiçekler açıyor. Her çalışma günü bahçene su veriyor!", growing: "Bahçen büyüyor!" },
  youth: { sky: ["#d7ecf5", "#f6fbfd"], ground: "#9cc98a", grass: "#7fb06c", leaf: "#3f9a5c", leaf2: "#6bb37a", trunk: "#7d5a3c", flowers: ["#e86f8f", "#f2c14e", "#8c7ae6", "#f08a5d"], intro: "Okuduğun her sayfa ağacına yaprak, çözdüğün her paragraf bahçene çiçek olarak ekleniyor. Düzenli çalıştıkça bahçen gelişiyor.", growing: "Emeğin büyüyor." },
  calm: { sky: ["#e6eef0", "#f8fafa"], ground: "#b5c9a8", grass: "#9cb38d", leaf: "#5c8f6a", leaf2: "#86ad8f", trunk: "#6f5643", flowers: ["#c97b8f", "#d9b46a", "#8f86b8", "#c98d6b"], intro: "Okuma sayfaların yaprak, paragraf çalışmaların çiçek olarak bahçene yansır; düzenli çalışma günleri bahçeni büyütür.", growing: "Emeğin birikiyor." },
};

const rand = (seed: number) => { const value = Math.sin(seed * 91.17 + 12.3) * 10_000; return value - Math.floor(value); };

/**
 * Emek Bahçem: gerçek akademik çalışmanın görseli (veri mevcut kayıtlardan gelir). Aşama geri gitmez;
 * ara verince bahçe solmaz. Niyet Kavanozum'dan ayrı: kavanoz sözler, bahçe yapılan çalışma.
 */
export default function EffortGardenSection() {
  const garden = trpc.garden.get.useQuery();
  useEffect(() => { if (garden.data?.newlyReached) toast.success(`Bahçen yeni bir aşamaya ulaştı: ${garden.data.label}!`); }, [garden.data?.newlyReached]);
  if (garden.isLoading) return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="animate-spin text-brand" /></div>;
  if (!garden.data) return <p className="text-[13px] text-danger">Bahçe yüklenemedi. <button onClick={() => garden.refetch()} className="font-semibold underline">Tekrar dene</button></p>;
  const data = garden.data;
  const theme = THEMES[data.theme];
  const goal = data.dailyGoalMinutes ?? 120;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Kişisel" title="Emek Bahçem" description={<>{theme.intro} Ara verdiğinde bahçen solmaz; kazandıkların kalır. <span className="inline-flex items-center gap-1 font-semibold text-ink-2"><Lock size={12} /> Yalnızca sen görürsün.</span></>} />

      <section className="soft-card overflow-hidden p-0">
        <GardenScene stage={data.stage} leaves={data.leaves} flowers={data.flowers} fruits={data.fruits} theme={data.theme} />
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-wide text-ink-4">Aşama {data.stage} / 6</div>
            <div className="text-[20px] font-extrabold text-ink">{data.label}</div>
          </div>
          <div className="min-w-[220px] flex-1 sm:max-w-[360px]">
            {data.nextLabel ? (
              <>
                <div className="flex justify-between text-[12px] text-ink-3"><span>Sıradaki: <strong className="text-ink-2">{data.nextLabel}</strong></span><span>{data.points.total} / {data.nextThreshold} emek puanı</span></div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-paper" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(data.progressToNext * 100)} aria-label="Sıradaki aşamaya ilerleme"><div className="h-full rounded-full bg-success" style={{ width: `${Math.round(data.progressToNext * 100)}%` }} /></div>
              </>
            ) : <div className="text-[13px] font-semibold text-success">Bahçen tam gelişti; her emek ona yeni bir renk katıyor.</div>}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<BookOpen size={16} />} label="Okunan sayfa" value={data.inputs.readingPages.toLocaleString("tr-TR")} note={`${data.leaves} yaprak${data.fruits ? ` · ${data.fruits} meyve` : ""}`} />
        <Stat icon={<Flower2 size={16} />} label="Paragraf pratiği" value={data.inputs.paragraphSessions.toLocaleString("tr-TR")} note={`${data.inputs.paragraphQuestions} paragraf sorusu · ${data.flowers} çiçek`} />
        <Stat icon={<CalendarCheck size={16} />} label="Çalışma günü" value={data.studyDays.toLocaleString("tr-TR")} note={`Bu hafta ${data.activeDaysLast7} gün`} />
        <Stat icon={<TreeDeciduous size={16} />} label="Emek puanı" value={data.points.total.toLocaleString("tr-TR")} note={`çalışma ${data.points.study} · okuma ${data.points.reading} · paragraf ${data.points.paragraph}`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel icon={<Sprout size={18} />} title="Bahçen nasıl büyür?">
          <ul className="space-y-2 text-[13px] leading-5 text-ink-2">
            <li><strong>Gece okuması:</strong> her 10 sayfa bir yaprak; bitirdiğin her kitap ağaçta bir meyve.</li>
            <li><strong>Paragraf:</strong> her paragraf pratiği ve her 10 paragraf sorusu bir çiçek.</li>
            <li><strong>Düzenli çalışma:</strong> günlük hedefini ({goal} dk) tuttuğun her gün tam emek puanı; daha az çalıştığın gün de payını alır.</li>
            <li>Veriler Takvim'deki rutinlerinden ve tamamladığın oturumlardan gelir; ayrıca kayıt girmen gerekmez.</li>
            <li>Ara verdiğinde bahçen solmaz, ulaştığın aşama geri gitmez.</li>
          </ul>
        </Panel>
        <Panel icon={<TreeDeciduous size={18} />} title="Aşamalar">
          <ol className="space-y-1.5 text-[13px]">
            {GARDEN_STAGES.map((item, index) => {
              const done = data.stage >= item.stage;
              const when = data.stageReachedAt[String(item.stage)];
              return (
                <li key={item.stage} className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${data.stage === item.stage ? "bg-success-soft" : done ? "bg-paper" : ""}`}>
                  <span className={`flex items-center gap-2 ${done ? "font-semibold text-ink" : "text-ink-4"}`}>{done ? <Check size={14} className="text-success" /> : <span className="h-3.5 w-3.5 rounded-full border border-rule-strong" />}{item.label}</span>
                  <span className="text-[12px] text-ink-4">{when ? new Date(when).toLocaleDateString("tr-TR") : `${data.thresholds[index]} puan`}</span>
                </li>
              );
            })}
          </ol>
        </Panel>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return <div className="soft-card p-4"><div className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-3">{icon}{label}</div><div className="mt-1 text-[24px] font-extrabold text-ink">{value}</div><div className="text-[12px] text-ink-4">{note}</div></div>;
}

/** Bahçe sahnesi (SVG): aşamaya göre bitki/ağaç, okumaya göre yaprak, paragrafa göre çiçek, bitmiş kitaba göre meyve. */
function GardenScene({ stage, leaves, flowers, fruits, theme: themeKey }: { stage: number; leaves: number; flowers: number; fruits: number; theme: GardenTheme }) {
  const theme = THEMES[themeKey];
  const CX = 320; // geniş sahne (640×260): masaüstünde gökyüzü boş kalmasın, telefonda da sığsın
  const scale = [0.34, 0.48, 0.6, 0.82, 0.95, 1][stage - 1];
  // Ağaç sahneye sığar: en büyük aşamada taç tepesi ~20 px'te kalır.
  const trunkTop = 214 - 110 * scale;
  const canopyR = 18 + 58 * scale;
  const canopy = { x: CX, y: trunkTop - canopyR * 0.3 };
  const leafSpots = useMemo(() => Array.from({ length: leaves }, (_, index) => {
    const angle = rand(index) * Math.PI * 2;
    const radius = Math.sqrt(rand(index + 50)) * canopyR * 0.85;
    return { x: canopy.x + Math.cos(angle) * radius, y: canopy.y + Math.sin(angle) * radius * 0.8, rotate: Math.round(rand(index + 9) * 360) };
  }), [leaves, canopyR, canopy.x, canopy.y]);
  const flowerSpots = useMemo(() => Array.from({ length: flowers }, (_, index) => ({ x: 24 + rand(index + 200) * 592, y: 222 + rand(index + 300) * 26, color: theme.flowers[index % theme.flowers.length], size: 3.5 + rand(index + 400) * 2 })), [flowers, theme.flowers]);
  const fruitSpots = useMemo(() => Array.from({ length: stage >= 4 ? fruits : 0 }, (_, index) => { const angle = rand(index + 600) * Math.PI * 2; const radius = (0.3 + rand(index + 700) * 0.5) * canopyR; return { x: canopy.x + Math.cos(angle) * radius, y: canopy.y + Math.sin(angle) * radius * 0.7 }; }), [fruits, stage, canopyR, canopy.x, canopy.y]);
  return (
    <svg viewBox="0 0 640 260" role="img" aria-label={`Emek bahçem: aşama ${stage}, ${leaves} yaprak, ${flowers} çiçek`} className="block h-auto w-full">
      <defs><linearGradient id="garden-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={theme.sky[0]} /><stop offset="1" stopColor={theme.sky[1]} /></linearGradient></defs>
      <rect width="640" height="260" fill="url(#garden-sky)" />
      {themeKey === "playful" && <circle cx="570" cy="44" r="22" fill="#ffd95a" />}
      <path d="M0 214 Q160 196 320 210 T640 204 L640 260 L0 260 Z" fill={theme.ground} />
      <path d="M0 222 Q190 208 380 220 T640 214 L640 260 L0 260 Z" fill={theme.grass} opacity="0.6" />
      {stage >= 6 && (
        <g>
          <rect x="132" y="166" width="8" height="48" rx="3" fill={theme.trunk} /><circle cx="136" cy="156" r="30" fill={theme.leaf2} /><circle cx="152" cy="146" r="18" fill={theme.leaf} />
          <rect x="498" y="176" width="7" height="38" rx="3" fill={theme.trunk} /><circle cx="501" cy="168" r="24" fill={theme.leaf} />
          <ellipse cx="420" cy="208" rx="34" ry="13" fill={theme.leaf} /><ellipse cx="226" cy="210" rx="28" ry="11" fill={theme.leaf2} />
        </g>
      )}
      {stage <= 2 ? (
        <g>
          <path d={`M${CX} 214 Q${CX + 1} ${214 - 40 * scale * 2} ${CX} ${214 - 60 * scale * 2}`} stroke={theme.leaf} strokeWidth="4" fill="none" strokeLinecap="round" />
          <ellipse cx={CX - 14} cy={214 - 52 * scale * 2} rx="14" ry="7" transform={`rotate(-25 ${CX - 14} ${214 - 52 * scale * 2})`} fill={theme.leaf2} />
          <ellipse cx={CX + 14} cy={214 - 58 * scale * 2} rx="14" ry="7" transform={`rotate(25 ${CX + 14} ${214 - 58 * scale * 2})`} fill={theme.leaf} />
          {stage === 2 && <><ellipse cx={CX - 12} cy={214 - 30 * scale * 2} rx="11" ry="5.5" transform={`rotate(-30 ${CX - 12} ${214 - 30 * scale * 2})`} fill={theme.leaf} /><ellipse cx={CX + 12} cy={214 - 38 * scale * 2} rx="11" ry="5.5" transform={`rotate(30 ${CX + 12} ${214 - 38 * scale * 2})`} fill={theme.leaf2} /></>}
        </g>
      ) : (
        <g>
          <path d={`M${CX - 6 * scale} 214 L${CX - 3 * scale} ${trunkTop} L${CX + 3 * scale} ${trunkTop} L${CX + 6 * scale} 214 Z`} fill={theme.trunk} stroke={theme.trunk} strokeWidth={4 * scale + 2} strokeLinejoin="round" />
          <ellipse cx={canopy.x} cy={canopy.y} rx={canopyR} ry={canopyR * 0.8} fill={theme.leaf} opacity="0.9" />
          <ellipse cx={canopy.x - canopyR * 0.35} cy={canopy.y - canopyR * 0.2} rx={canopyR * 0.6} ry={canopyR * 0.5} fill={theme.leaf2} opacity="0.8" />
        </g>
      )}
      {stage >= 3 && leafSpots.map((spot, index) => <ellipse key={index} cx={spot.x} cy={spot.y} rx="4.5" ry="2.4" transform={`rotate(${spot.rotate} ${spot.x} ${spot.y})`} fill={index % 2 ? theme.leaf2 : "#2f7d47"} opacity="0.9" />)}
      {stage >= 5 && flowerSpots.slice(0, 12).map((spot, index) => { const angle = rand(index + 900) * Math.PI * 2; const radius = rand(index + 950) * canopyR * 0.75; return <circle key={`c${index}`} cx={canopy.x + Math.cos(angle) * radius} cy={canopy.y + Math.sin(angle) * radius * 0.7} r="3" fill={spot.color} />; })}
      {fruitSpots.map((spot, index) => <circle key={`f${index}`} cx={spot.x} cy={spot.y} r="4.5" fill="#e0533d" stroke="#b33a28" strokeWidth="0.8" />)}
      {flowerSpots.map((spot, index) => (
        <g key={`g${index}`}>
          <line x1={spot.x} y1={spot.y} x2={spot.x} y2={spot.y + 9} stroke={theme.leaf} strokeWidth="1.4" />
          {[0, 72, 144, 216, 288].map((angle) => <circle key={angle} cx={spot.x + Math.cos((angle * Math.PI) / 180) * spot.size * 0.8} cy={spot.y + Math.sin((angle * Math.PI) / 180) * spot.size * 0.8} r={spot.size * 0.55} fill={spot.color} />)}
          <circle cx={spot.x} cy={spot.y} r={spot.size * 0.4} fill="#fff3b0" />
        </g>
      ))}
    </svg>
  );
}
