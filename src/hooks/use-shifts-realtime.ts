import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type DbShift = Tables<"shifts">;

export interface UiShift extends DbShift {
  seller_name?: string;
  covered_by_name?: string;
}

export function useShiftsRealtime(startDate: string, endDate: string) {
  const [shifts, setShifts] = useState<UiShift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchShifts() {
      if (!startDate || !endDate) return;

      const { data, error } = await supabase
        .from("shifts")
        .select(`
          *,
          sellers!shifts_seller_id_fkey(name),
          covered:sellers!shifts_covered_by_id_fkey(name)
        `)
        .gte("shift_date", startDate)
        .lte("shift_date", endDate)
        .order("shift_date", { ascending: true });

      if (error || !data) {
        if (mounted) setLoading(false);
        return;
      }

      if (mounted) {
        const uiShifts = data.map((s: any) => ({
          ...s,
          seller_name: s.sellers?.name,
          covered_by_name: s.covered?.name,
        }));
        setShifts(uiShifts);
        setLoading(false);
      }
    }

    fetchShifts();

    const channelId = `shifts-monitor-${Math.random()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shifts" },
        () => fetchShifts()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [startDate, endDate]);

  return { shifts, loading };
}
