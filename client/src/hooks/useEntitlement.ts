import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

/**
 * Tek entitlement kaynağı (spec §28) — her component kendi kendine
 * `trpc.subscription.getCurrent` çağırmak yerine bunu kullanır; React
 * Query/tRPC zaten aynı query anahtarını cache'lediği için birden fazla
 * `useEntitlement()` çağrısı ekstra network isteği YARATMAZ.
 *
 * ÖNEMLİ: burada dönen `isPremium` yalnızca UX gating için — asıl erişim
 * kararı her zaman sunucuda (entitlementProcedure/metredFeatureProcedure)
 * verilir. Bu hook'un döndürdüğü değere göre bir uç noktayı "engellemek"
 * güvenlik değil, yalnızca kullanıcı deneyimidir.
 */
export function useEntitlement() {
  const { user } = useAuth();
  const query = trpc.subscription.getCurrent.useQuery(undefined, { enabled: Boolean(user), retry: false, staleTime: 30_000 });

  return {
    ...(query.data ?? {
      tier: "free" as const,
      planCode: "FREE",
      status: "active" as const,
      isPremium: false,
      isTrial: false,
      trialEndsAt: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      gracePeriodEndsAt: null,
      entitlements: [] as string[],
    }),
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
