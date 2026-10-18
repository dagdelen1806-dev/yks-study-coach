import { FEATURE_USAGE_LIMITS, FREE_TIER_LIMITS, type FeatureKey } from "@shared/entitlements";

/**
 * Ücretsiz / Premium karşılaştırması — sayılar elle yazılmaz, sunucunun da uyguladığı
 * tek kaynaktan (shared/entitlements.ts) okunur. Yalnızca gerçekten kotalanan özellikler
 * listelenir; geri kalan her şey iki planda da açıktır.
 */
export const METERED_FEATURE_LABELS: Array<{ key: FeatureKey; label: string; hint: string }> = [
  { key: "AI_STUDY_PLAN", label: "AI haftalık çalışma planı", hint: "Profil, deneme ve ders programına göre 7 günlük plan" },
  { key: "NOTE_AI", label: "AI soru araçları", hint: "Adım adım çözüm, benzer soru, not araçları" },
  { key: "NOTE_OCR", label: "Fotoğraftan okuma", hint: "Soru fotoğrafı, not görseli, ders programı" },
  { key: "OCR_BOOK_IMPORT", label: "Kitabı fotoğrafla ekleme", hint: "Kapak ve içindekiler okuma" },
  { key: "OCR_EXAM_IMPORT", label: "Deneme sonucunu belgeden aktarma", hint: "PDF ya da ekran görüntüsü" },
  { key: "NOTE_VOICE", label: "Sesli not → metin", hint: "Sesini yazıya çevirme" },
];

const quota = (limit: { windowDays: number; maxUses: number } | undefined) => (limit ? `${limit.windowDays} günde ${limit.maxUses}` : "Sınırsız");

/** Premium kartındaki kısa liste: gerçek Premium kotaları. */
export const premiumHighlights = () => METERED_FEATURE_LABELS.slice(0, 4).map((feature) => `${feature.label}: ${quota(FEATURE_USAGE_LIMITS[feature.key])}`);

export default function PlanComparison({ current }: { current: "free" | "premium" }) {
  return (
    <section className="soft-card mx-auto w-full max-w-3xl overflow-hidden">
      <div className="p-5 pb-3">
        <h2 className="text-[15px] font-bold text-ink">Ücretsiz ve Premium karşılaştırması</h2>
        <p className="mt-1 text-[13px] text-ink-3">Yapay zekâ kullanan özellikler kotalıdır; kota, son 30 günde kullandığın sayıya göre işler.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-[13px]">
          <thead className="border-y border-rule bg-paper/70 text-[12px] text-ink-3">
            <tr>
              <th className="px-5 py-2.5 font-semibold">Özellik</th>
              <th className={`px-4 py-2.5 text-center font-semibold ${current === "free" ? "text-ink" : ""}`}>Ücretsiz{current === "free" && " (şu an)"}</th>
              <th className={`px-5 py-2.5 text-center font-semibold ${current === "premium" ? "text-brand-strong" : "text-brand"}`}>Premium{current === "premium" && " (şu an)"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {METERED_FEATURE_LABELS.map((feature) => (
              <tr key={feature.key}>
                <td className="px-5 py-3"><div className="font-semibold text-ink">{feature.label}</div><div className="text-[12px] text-ink-4">{feature.hint}</div></td>
                <td className="px-4 py-3 text-center text-ink-2">{FREE_TIER_LIMITS[feature.key] ? quota(FREE_TIER_LIMITS[feature.key]) : "—"}</td>
                <td className="px-5 py-3 text-center font-semibold text-brand-strong">{quota(FEATURE_USAGE_LIMITS[feature.key])}</td>
              </tr>
            ))}
            <tr className="bg-paper/40">
              <td className="px-5 py-3 text-ink-2" colSpan={3}>Konu haritası, denemeler ve analizleri, takvim, ders programı, kaynaklar, katalog ve defter her iki planda da açık.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
