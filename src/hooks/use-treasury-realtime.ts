import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TreasuryAllocation {
  id: string;
  name: string;
  amount: number;
  purpose: string;
}

export interface TreasuryAccount {
  id: string;
  bank_name: string;
  account_purpose: string;
  account_context: 'business' | 'personal';
  theme: string;
  current_balance: number;
  account_type?: string;
  invoice_amount?: number;
  invoice_date?: string;
  allocations: TreasuryAllocation[];
  notes?: string;
  created_at: string;
}

export function useTreasuryRealtime() {
  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("treasury_accounts")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Treasury accounts table might not exist yet:", error.message);
      setAccounts([]);
    } else {
      setAccounts((data as TreasuryAccount[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();

    const channel = supabase
      .channel("schema-db-changes-treasury")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "treasury_accounts",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setAccounts((prev) => [...prev, payload.new as TreasuryAccount]);
          } else if (payload.eventType === "UPDATE") {
            setAccounts((prev) =>
              prev.map((acc) =>
                acc.id === payload.new.id ? (payload.new as TreasuryAccount) : acc
              )
            );
          } else if (payload.eventType === "DELETE") {
            setAccounts((prev) => prev.filter((acc) => acc.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { accounts, loading, refetch: fetchAccounts };
}
