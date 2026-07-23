import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PosIdea {
  id: string;
  title: string;
  category: string | null;
  priority: string | null;
  potential: string | null;
  complexity: string | null;
  next_action: string | null;
  status: string;
  created_at?: string;
}

export function usePosIdeas() {
  const [ideas, setIdeas] = useState<PosIdea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIdeas();
  }, []);

  const fetchIdeas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pos_ideas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && error.code !== '42P01') {
        console.error("Error fetching ideas:", error);
      } else if (data) {
        setIdeas(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addIdea = async (idea: Omit<PosIdea, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('pos_ideas')
        .insert([idea])
        .select()
        .single();

      if (error) throw error;
      if (data) setIdeas([data, ...ideas]);
      toast.success("Ideia capturada com sucesso!");
      return data;
    } catch (error: any) {
      toast.error("Erro ao capturar ideia: " + error.message);
      return null;
    }
  };

  const updateIdea = async (id: string, updates: Partial<PosIdea>) => {
    try {
      const { data, error } = await supabase
        .from('pos_ideas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setIdeas(ideas.map(i => i.id === id ? data : i));
      }
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    }
  };

  const deleteIdea = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pos_ideas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setIdeas(ideas.filter(i => i.id !== id));
      toast.success("Ideia descartada!");
    } catch (error: any) {
      toast.error("Erro ao descartar: " + error.message);
    }
  };

  return { ideas, loading, fetchIdeas, addIdea, updateIdea, deleteIdea };
}
