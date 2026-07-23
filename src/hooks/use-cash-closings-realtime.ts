import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type DbCashClosing = Tables<"cash_closings">;

export function useCashClosingsRealtime() {
  const [closings, setClosings] = useState<DbCashClosing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchClosings() {
      const { data, error } = await supabase
        .from("cash_closings")
        .select("*")
        .order("closing_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error || !data) {
        if (mounted) setLoading(false);
        return;
      }

      if (!mounted) return;

      setClosings(data);
      setLoading(false);
    }

    fetchClosings();

    const channelId = `closings-monitor-${Math.random()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cash_closings" },
        () => fetchClosings()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { closings, loading };
}
