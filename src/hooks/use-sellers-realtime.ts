import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type DbSeller = Tables<"sellers">;

export function useSellersRealtime() {
  const [sellers, setSellers] = useState<DbSeller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchSellers() {
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .order("name", { ascending: true });

      if (error || !data) {
        if (mounted) setLoading(false);
        return;
      }

      if (mounted) {
        setSellers(data);
        setLoading(false);
      }
    }

    fetchSellers();

    const channelId = `sellers-monitor-${Math.random()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sellers" },
        () => fetchSellers()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { sellers, loading };
}
