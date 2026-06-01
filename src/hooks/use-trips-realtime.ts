import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { dbTripToUi, type DbTrip, type UiTrip } from "@/lib/trip-helpers";

export function useTripsRealtime() {
  const [rows, setRows] = useState<DbTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    supabase
      .from("trips")
      .select("*")
      .gte("scheduled_departure", startOfDay.toISOString())
      .lte("scheduled_departure", endOfDay.toISOString())
      .order("scheduled_departure", { ascending: true })
      .then(({ data }) => {
        if (!mounted) return;
        setRows(data ?? []);
        setLoading(false);
      });

    const channel = supabase
      .channel("trips-monitor")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips" },
        (payload) => {
          setRows((prev) => {
            if (payload.eventType === "INSERT") return [...prev, payload.new as DbTrip];
            if (payload.eventType === "UPDATE")
              return prev.map((r) => (r.id === (payload.new as DbTrip).id ? (payload.new as DbTrip) : r));
            if (payload.eventType === "DELETE")
              return prev.filter((r) => r.id !== (payload.old as DbTrip).id);
            return prev;
          });
        },
      )
      .subscribe();

    const t = setInterval(() => setTick((n) => n + 1), 15000);

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      clearInterval(t);
    };
  }, []);

  const now = new Date();
  void tick;
  const trips: UiTrip[] = rows.map((r) => dbTripToUi(r, now));
  return { trips, loading };
}
