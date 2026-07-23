import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type DbPartner = Tables<"partner_companies">;
export type DbTrip = Tables<"trips">;
export type DbMonthlyGoal = Tables<"monthly_goals">;

export interface PartnerWithTrips extends DbPartner {
  trips: DbTrip[];
  monthly_goals: DbMonthlyGoal[];
}

export function usePartnersRealtime() {
  const [partners, setPartners] = useState<PartnerWithTrips[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchPartners() {
      // Fetch both partners and their related trips
      const { data: pData, error: pError } = await supabase
        .from("partner_companies")
        .select("*")
        .order("name");

      if (pError || !pData) return;

      const { data: tData, error: tError } = await supabase
        .from("trips")
        .select("*");

      if (tError || !tData) return;
      
      const { data: mgData, error: mgError } = await supabase
        .from("monthly_goals")
        .select("*")
        .not("company_id", "is", null);

      if (mgError || !mgData) return;

      if (!mounted) return;

      const merged = pData.map(p => ({
        ...p,
        trips: tData.filter(t => t.company_id === p.id),
        monthly_goals: mgData.filter(m => m.company_id === p.id)
      }));

      setPartners(merged);
      setLoading(false);
    }

    fetchPartners();

    // Subscribe to partners and trips changes
    const channelId = `partners-trips-monitor-${Math.random()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "partner_companies" },
        () => fetchPartners()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips" },
        () => fetchPartners()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "monthly_goals" },
        () => fetchPartners()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { partners, loading };
}
