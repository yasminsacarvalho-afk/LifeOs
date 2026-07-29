import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PosGoal {
  id: string;
  title: string;
  type: string; // 'diaria', 'mensal', 'anual', 'leitura', 'habito'
  reason: string | null;
  deadline: string | null;
  progress_percentage: number;
  milestones: string | null;
  status: string;
  target_value?: number | null;
  unit?: string | null;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  created_at?: string;
}

export function usePosGoals() {
  const [goals, setGoals] = useState<PosGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pos_goals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code !== '42P01') console.error("Error fetching goals:", error);
      } else if (data) {
        setGoals(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addGoal = async (goal: Omit<PosGoal, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('pos_goals')
        .insert([goal])
        .select()
        .single();

      if (error) throw error;
      if (data) setGoals([data, ...goals]);
      toast.success("Meta criada com sucesso!");
      return data;
    } catch (error: any) {
      toast.error("Erro ao criar meta: " + error.message);
      return null;
    }
  };

  const updateGoal = async (id: string, updates: Partial<PosGoal>) => {
    try {
      const { data, error } = await supabase
        .from('pos_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setGoals(goals.map(g => g.id === id ? data : g));
        toast.success("Meta atualizada!");
      }
    } catch (error: any) {
      toast.error("Erro ao atualizar meta: " + error.message);
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pos_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setGoals(goals.filter(g => g.id !== id));
      toast.success("Meta excluída!");
    } catch (error: any) {
      toast.error("Erro ao excluir meta: " + error.message);
    }
  };

  return { goals, loading, fetchGoals, addGoal, updateGoal, deleteGoal };
}
