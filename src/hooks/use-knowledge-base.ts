import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface KnowledgeItem {
  id: string;
  category: "login" | "information" | "process";
  title: string;
  content: string;
  created_at?: string;
}

export function useKnowledgeBaseRealtime() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();

    const channel = (supabase as any)
      .channel("public:knowledge_base")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "knowledge_base" },
        (payload) => {
          console.log("Realtime knowledge update", payload);
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchItems() {
    const { data, error } = await (supabase as any)
      .from("knowledge_base")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching knowledge base:", error);
    } else {
      setItems(data as KnowledgeItem[]);
    }
    setLoading(false);
  }

  return { items, loading, refresh: fetchItems };
}
