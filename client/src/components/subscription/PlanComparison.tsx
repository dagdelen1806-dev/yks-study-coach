import { PAID_TIERS, TIER_LABELS, usageLimitFor, type FeatureKey, type PlanTier, type UsageLimit } from "@shared/entitlements";

/**
 * Ücretsiz / Temel / Premium / Pro karşılaştırması — sayılar elle yazılmaz, sunucunun da uyguladığı
 * tek kaynaktan (shared/entitlements.ts) okunur. Kademeler arasındaki tek fark bu kotalardır;
 * geri kalan her şey tüm planlarda açıktır.
 */
export const METERED_FEATURE_LABELS: Array<{ key: FeatureKey; label: string; hint: string }> = [
  { key: "AI_STUDY_PLAN", label: "AI haftalık çalışma planı", hint: "Profil, deneme ve ders programına göre 7 günlük plan" },
  { key: "NOTE_AI", label: "AI soru araçları", hint: "Adım adım çözüm, benzer soru, not araçları" },
  { key: "NOTE_OCR", label: "Fotoğraftan okuma", hint: "Soru fotoğrafı, not görseli, ders programı" },
  { key: "OCR_BOOK_IMPORT", label: "Kitabı fotoğrafla ekleme", hint: "Kapak ve içindekiler okuma" },
  { key: "OCR_EXAM_IMPORT", label: "Deneme sonucunu belgeden aktarma", hint: "PDF ya da ekran görüntüsü" },
  { key: "NOTE_VOICE", label: "Sesli not → metin", hint: "Sesini yazıya çevirme" },
];

export const quotaLabel = (limit: UsageLimit | undefined) => (limit ? `ayda ${limit.maxUses}` : "Sınırsız");

/** Bir kademenin kartındaki kısa liste: o kademenin gerçek kotaları. */
export const tierHighlights = (tier: PlanTier) => METERED_FEATURE_LABELS.map((feature) => `${feature.label}: ${quotaLabel(usageLimitFor(tier, feature.key))}`);

const COLUMNS: PlanTier[] = ["free", ...PAID_TIERS];

export default function PlanComparison({ current }: { current: PlanTier }) {
  return (
    <section className="soft-card mx-auto w-full max-w-4xl overflow-hidden">
      <div className="p-5 pb-3">
        <h2 className="text-[15px] font-bold text-ink">Planları karşılaştır</h2>
        <p className="mt-1 text-[13px] text-ink-3">Yapay zekâ kullanan özellikler kotalıdır; kota, son 30 günde kullandığın sayıya göre işler. Planlar arasındaki tek fark bu kotalardır.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-[13px]">
          <thead className="border-y border-rule bg-paper/70 text-[12px] text-ink-3">
            <tr>
              <th className="px-5 py-2.5 font-semibold">Özellik</th>
              {COLUMNS.map((tier) => <th key={tier} className={`px-3 py-2.5 text-center font-semibold ${tier === current ? "text-brand-strong" : ""}`}>{TIER_LABELS[tier]}{tier === current && " (şu an)"}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {METERED_FEATURE_LABELS.map((feature) => (
              <tr key={feature.key}>
                <td className="px-5 py-3"><div className="font-semibold text-ink">{feature.label}</div><div className="text-[12px] text-ink-4">{feature.hint}</div></td>
                {COLUMNS.map((tier) => {
                  const limit = usageLimitFor(tier, feature.key);
                  const available = tier !== "free" || Boolean(limit);
                  return <td key={tier} className={`px-3 py-3 text-center ${tier === current ? "font-semibold text-brand-strong" : "text-ink-2"}`}>{available ? quotaLabel(limit) : "—"}</td>;
                })}
              </tr>
            ))}
            <tr className="bg-paper/40">
              <td className="px-5 py-3 text-ink-2" colSpan={COLUMNS.length + 1}>Konu haritası, denemeler ve analizleri, takvim, ders programı, kaynaklar, katalog, defter ve odak modu tüm planlarda açık.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
