import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isSuperAdminEmail } from "@/lib/admin";
import { PLANS, normalizeTier, tierHasAutomations, type PlanTier } from "@/lib/plans";

export function usePlan() {
  const { profile, user } = useAuth();

  return useMemo(() => {
    const isSuper = isSuperAdminEmail(user?.email) || !!profile?.is_admin;
    const tier: PlanTier = isSuper ? "completo" : normalizeTier(profile?.plan_tier);
    return {
      tier,
      plan: PLANS[tier],
      hasAutomations: isSuper || tierHasAutomations(tier),
      isEssencial: !isSuper && tier === "essencial",
    };
  }, [profile?.plan_tier, profile?.is_admin, user?.email]);
}
