import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export interface PosTask {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string; // 'baixa', 'media', 'alta', 'critica'
  status: string; // 'pendente', 'em_andamento', 'concluida', 'cancelada', 'arquivada'
  deadline: string | null;
  due_time: string | null;
  project_id: string | null;
  goal_id: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  responsible: string | null;
  tags: string[] | null;
  checklist: any[] | null;
  dependencies: string[] | null;
  notes: string | null;
  is_focus_mode: boolean;
  delayed_count: number;
  created_at?: string;
  updated_at?: string;
}

export function usePosTasks() {
  const [tasks, setTasks] = useState<PosTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pos_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && error.code !== '42P01') console.error("Error fetching tasks:", error);
      if (data) {
        const now = new Date();
        const tasksToDelete: string[] = [];
        
        const activeTasks = data.filter(task => {
          if (task.status === 'concluida') {
             const refDate = new Date(task.updated_at || task.created_at || now.toISOString());
             const diffDays = (now.getTime() - refDate.getTime()) / (1000 * 3600 * 24);
             
             if (diffDays >= 5) {
                tasksToDelete.push(task.id);
                return false;
             }
          }
          return true;
        });

        // Trigger cleanup in background
        if (tasksToDelete.length > 0) {
          supabase.from('pos_tasks').delete().in('id', tasksToDelete).then(({ error }) => {
            if (error) console.error("Error auto-deleting old completed tasks:", error);
          });
        }

        setTasks(activeTasks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (task: Partial<PosTask>) => {
    try {
      const { data, error } = await supabase
        .from('pos_tasks')
        .insert([{ ...task, delayed_count: 0, status: task.status || 'pendente' }])
        .select()
        .single();

      if (error) throw error;
      if (data) setTasks([data, ...tasks]);
      toast.success("Tarefa criada com sucesso!");
      return data;
    } catch (error: any) {
      toast.error("Erro ao criar: " + error.message);
      return null;
    }
  };

  const updateTask = async (id: string, updates: Partial<PosTask>) => {
    try {
      const { data, error } = await supabase
        .from('pos_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setTasks(tasks.map(t => t.id === id ? data : t));
      }
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from('pos_tasks').delete().eq('id', id);
      if (error) throw error;
      setTasks(tasks.filter(t => t.id !== id));
      toast.success("Tarefa removida!");
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  return { tasks, loading, addTask, updateTask, deleteTask, fetchTasks };
}
