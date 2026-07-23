import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTransactionsRealtime() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchTransactions() {
      const { data, error } = await supabase
        .from("financial_records")
        .select("*")
        .order("date", { ascending: false });

      if (error || !data) {
        if (mounted) setLoading(false);
        return;
      }

      if (!mounted) return;

      setTransactions(data);
      setLoading(false);
    }

    fetchTransactions();

    const channel = supabase
      .channel("schema-db-changes-transactions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "financial_records" },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { transactions, loading };
}
