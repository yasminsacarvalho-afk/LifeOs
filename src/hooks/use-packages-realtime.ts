import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type DbPackage = Tables<"packages">;
export interface UiPackage extends DbPackage {
  partner_name?: string;
  trip_code?: string;
  delivery_person_name?: string;
}

export function usePackagesRealtime() {
  const [packages, setPackages] = useState<UiPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchPackages() {
      const { data, error } = await supabase
        .from("packages")
        .select(`
          *,
          partner_companies(name),
          trips(code),
          company_contacts:company_contacts!packages_delivery_person_id_fkey(name)
        `)
        .order("created_at", { ascending: false });

      if (error || !data) {
        if (mounted) setLoading(false);
        return;
      }

      if (!mounted) return;

      const uiPackages: UiPackage[] = data.map((p: any) => ({
        ...p,
        partner_name: p.partner_companies?.name,
        trip_code: p.trips?.code,
        delivery_person_name: p.company_contacts?.name,
      }));

      setPackages(uiPackages);
      setLoading(false);
    }

    fetchPackages();

    const channelId = `packages-monitor-${Math.random()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "packages" },
        () => fetchPackages()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { packages, loading };
}
