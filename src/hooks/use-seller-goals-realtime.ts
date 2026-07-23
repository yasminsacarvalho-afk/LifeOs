import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type DbSellerGoal = Tables<"seller_goals">;

export function useSellerGoalsRealtime() {
  const [goals, setGoals] = useState<DbSellerGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchGoals() {
      const { data, error } = await supabase
        .from("seller_goals")
        .select("*")
        .order("target_amount", { ascending: true });

      if (error || !data) {
        if (mounted) setLoading(false);
        return;
      }

      if (mounted) {
        setGoals(data);
        setLoading(false);
      }
    }

    fetchGoals();

    const channelId = `goals-monitor-${Math.random()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "seller_goals" },
        () => fetchGoals()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { goals, loading };
}
