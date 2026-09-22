import { Lock, Sparkles } from "lucide-react";
import { useEntitlement } from "@/hooks/useEntitlement";
import { Button } from "@/components/ui/button";
import type { FeatureKey } from "@shared/entitlements";

const FEATURE_LABELS: Record<FeatureKey, string> = {
  AI_STUDY_PLAN: "AI Çalışma Planı",
  OCR_EXAM_IMPORT: "Belgeden Deneme Aktarımı",
  ADVANCED_ANALYTICS: "Gelişmiş Analizler",
  PLAN_ADHERENCE: "Plan Uyum Merkezi",
  RESOURCE_RECOMMENDATIONS: "Kaynak Önerileri",
  ADVANCED_REPORTS: "Gelişmiş Raporlar",
  FOCUS_AURA_PREMIUM: "Premium Pusula Odak",
  MOCK_EXAM_ANALYTICS: "Deneme Analitiği",
};

/**
 * Bir özelliğin premium gerektirdiğini gösteren, tekrar kullanılabilir kart
 * (spec §27). Yalnızca UX — gerçek erişim kontrolü her zaman backend'de
 * (bkz. useEntitlement.ts başlık yorumu).
 */
export function PremiumGate({ feature, onUpgrade, children }: { feature: FeatureKey; onUpgrade: () => void; children?: React.ReactNode }) {
  const entitlement = useEntitlement();
  if (entitlement.isPremium) return <>{children}</>;

  return (
    <div className="rounded-2xl border border-[#3b5ccc]/15 bg-[#f4f6ff] p-6 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#3b5ccc]/10 text-[#3b5ccc]"><Lock size={18} /></div>
      <h3 className="mt-4 text-[15px] font-semibold text-[#1f2333]">{FEATURE_LABELS[feature]} Premium'da</h3>
      <p className="mt-2 max-w-sm mx-auto text-[12px] leading-5 text-[#6b6c76]">
        {entitlement.isTrial ? `Deneme süren ${entitlement.trialEndsAt ? new Date(entitlement.trialEndsAt).toLocaleDateString("tr-TR") : ""} tarihinde bitiyor.` : "Bu özellik Premium abonelikte açılır — 10 gün ücretsiz denemeyle hemen başlayabilirsin."}
      </p>
      <Button onClick={onUpgrade} className="mt-4 h-10 rounded-xl bg-[#3b5ccc] px-5 text-[12px] font-semibold text-white hover:bg-[#304db7]">
        <Sparkles className="mr-2" size={14} /> Premium'a Geç
      </Button>
    </div>
  );
}
