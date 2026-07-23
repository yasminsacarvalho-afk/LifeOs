import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CityCode {
  id: string;
  city_name: string;
  code: string;
  company_id: string | null;
}

export function useCityCodesRealtime() {
  const [cityCodes, setCityCodes] = useState<CityCode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("city_codes").select("*");
      if (error) throw error;
      setCityCodes(data || []);
    } catch (error) {
      console.error("Error fetching city codes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();

    const channelId = `city_codes_changes_${Math.random()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "city_codes" },
        () => {
          fetchCodes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { cityCodes, loading, refetch: fetchCodes };
}
