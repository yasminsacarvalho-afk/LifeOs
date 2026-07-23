import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CrmLead = {
  id: string;
  created_at: string;
  client_name: string;
  status: string; // 'nao_atendido', 'em_atendimento', 'aguardando', 'venda', 'revenda', 'lead'
  expected_value: number;
  estimated_commission: number | null;
  notes: string | null;
  phone: string | null;
  email: string | null;
  target_company_id: string | null;
  updated_at: string;
};

export function useCrmRealtime() {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchLeads() {
      try {
        const { data, error } = await supabase
          .from("crm_leads")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (mounted && data) {
          setLeads(data);
        }
      } catch (error: any) {
        // Ignora erro se a tabela não existir ainda para não quebrar a UI
        if (error.code === '42P01') {
          console.warn("Tabela crm_leads não existe. Crie-a no Supabase.");
        } else {
          console.error("Erro ao carregar leads:", error);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchLeads();

    const channel = supabase
      .channel("crm_leads_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crm_leads" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setLeads((prev) => [payload.new as CrmLead, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setLeads((prev) =>
              prev.map((l) => (l.id === payload.new.id ? (payload.new as CrmLead) : l))
            );
          } else if (payload.eventType === "DELETE") {
            setLeads((prev) => prev.filter((l) => l.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { leads, loading };
}
