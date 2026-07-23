import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type DbSale = Tables<"sales">;
export interface UiSale extends DbSale {
  partner_name?: string;
  seller_name?: string;
  trip_code?: string;
}

export function useSalesRealtime() {
  const [sales, setSales] = useState<UiSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchSales() {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          partner_companies(name),
          sellers(name),
          trips(code)
        `)
        .order("sale_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error || !data) {
        if (mounted) setLoading(false);
        return;
      }

      if (!mounted) return;

      const uiSales: UiSale[] = data.map((s: any) => ({
        ...s,
        partner_name: s.partner_companies?.name,
        seller_name: s.sellers?.name,
        trip_code: s.trips?.code,
      }));

      setSales(uiSales);
      setLoading(false);
    }

    fetchSales();

    const channelId = `sales-monitor-${Math.random()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales" },
        () => fetchSales()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { sales, loading };
}
