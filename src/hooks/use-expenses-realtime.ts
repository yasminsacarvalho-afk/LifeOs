import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type DbExpense = Tables<"expenses">;

export function useExpensesRealtime() {
  const [expenses, setExpenses] = useState<DbExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchExpenses() {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false });

      if (error || !data) {
        if (mounted) setLoading(false);
        return;
      }

      if (mounted) {
        setExpenses(data);
        setLoading(false);
      }
    }

    fetchExpenses();

    const channelId = `expenses-monitor-${Math.random()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => fetchExpenses()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { expenses, loading };
}
