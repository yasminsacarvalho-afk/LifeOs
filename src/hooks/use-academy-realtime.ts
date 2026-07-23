import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AcademyItem {
  id: string;
  type: "course" | "book" | "topic";
  category: string;
  title: string;
  description: string | null;
  author: string | null;
  duration: string | null;
  modules: number;
  progress: number;
  drive_link: string | null;
  tags: string[];
  priority: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
}

export function useAcademyRealtime() {
  const [items, setItems] = useState<AcademyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("academy_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // Fallback for when the table doesn't exist yet
        console.warn("Academy items table might not exist yet:", error.message);
        setItems([]);
        return;
      }

      setItems((data as AcademyItem[]) || []);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel("schema-db-changes-academy")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "academy_items",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setItems((prev) => [payload.new as AcademyItem, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setItems((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? (payload.new as AcademyItem) : item
              )
            );
          } else if (payload.eventType === "DELETE") {
            setItems((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { items, loading, error, refetch: fetchItems };
}
