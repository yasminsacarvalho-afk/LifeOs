import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type DbDriver = Tables<"drivers">;
export type DbDriverEvaluation = Tables<"driver_evaluations">;

export function useDriversRealtime() {
  const [drivers, setDrivers] = useState<DbDriver[]>([]);
  const [evaluations, setEvaluations] = useState<DbDriverEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [driversRes, evalsRes] = await Promise.all([
          supabase.from("drivers").select("*").order("name"),
          supabase.from("driver_evaluations").select("*").order("created_at", { ascending: false })
        ]);

        if (driversRes.data) setDrivers(driversRes.data);
        if (evalsRes.data) setEvaluations(evalsRes.data);
      } catch (e) {
        console.error("Error fetching drivers:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    const drvSub = supabase
      .channel(`drivers_changes_${Math.random()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setDrivers((prev) => [...prev, payload.new as DbDriver]);
        } else if (payload.eventType === "UPDATE") {
          setDrivers((prev) =>
            prev.map((d) => (d.id === payload.new.id ? (payload.new as DbDriver) : d))
          );
        } else if (payload.eventType === "DELETE") {
          setDrivers((prev) => prev.filter((d) => d.id !== payload.old.id));
        }
      })
      .subscribe();

    const evalsSub = supabase
      .channel(`evals_changes_${Math.random()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_evaluations" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setEvaluations((prev) => [payload.new as DbDriverEvaluation, ...prev]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(drvSub);
      supabase.removeChannel(evalsSub);
    };
  }, []);

  return { drivers, evaluations, loading };
}
