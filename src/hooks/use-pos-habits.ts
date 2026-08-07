import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export interface PosHabit {
  id: string;
  title: string;
  category: string | null;
  icon: string | null;
  color: string | null;
  description: string | null;
  objective: string | null;
  frequency: string | null;
  goal_type: string | null;
  goal_value: number | null;
  unit: string | null;
  book_id?: string | null;
  course_id?: string | null;
  event_id?: string | null;
  days_of_week: any | null;
  preferred_time: string | null;
  priority: string | null;
  current_streak: number;
  best_streak: number;
  status: string;
  created_at?: string;
}

export interface PosHabitLog {
  id: string;
  habit_id: string;
  log_date: string;
  status: string;
  value_achieved: number | null;
  notes: string | null;
}

export function usePosHabits() {
  const [habits, setHabits] = useState<PosHabit[]>([]);
  const [logs, setLogs] = useState<PosHabitLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHabitsData();
    
    const handleSync = () => {
      fetchHabitsData();
    };
    
    window.addEventListener('pos-habits-sync', handleSync);
    return () => window.removeEventListener('pos-habits-sync', handleSync);
  }, []);

  const fetchHabitsData = async () => {
    try {
      setLoading(true);
      const { data: habitsData, error: habitsError } = await supabase
        .from('pos_habits')
        .select('*')
        .order('created_at', { ascending: false });

      if (habitsError && habitsError.code !== '42P01') console.error("Error fetching habits:", habitsError);

      const { data: logsData, error: logsError } = await supabase
        .from('pos_habit_logs')
        .select('*');

      if (logsError && logsError.code !== '42P01') console.error("Error fetching habit logs:", logsError);

      if (habitsData) setHabits(habitsData);
      if (logsData) setLogs(logsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addHabit = async (habit: Partial<PosHabit>) => {
    try {
      const { data, error } = await supabase
        .from('pos_habits')
        .insert([{ ...habit, current_streak: 0, best_streak: 0, status: 'ativo' }])
        .select()
        .single();

      if (error) throw error;
      if (data) setHabits([data, ...habits]);
      toast.success("Hábito criado!");
      return data;
    } catch (error: any) {
      toast.error("Erro ao criar: " + error.message);
      return null;
    }
  };

  const updateHabit = async (id: string, updates: Partial<PosHabit>) => {
    try {
      const { data, error } = await supabase
        .from('pos_habits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (data) setHabits(habits.map(h => h.id === id ? data : h));
      toast.success("Hábito atualizado!");
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    }
  };

  const deleteHabit = async (id: string) => {
    try {
      const { error } = await supabase.from('pos_habits').delete().eq('id', id);
      if (error) throw error;
      setHabits(habits.filter(h => h.id !== id));
      toast.success("Hábito removido!");
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  const toggleHabitToday = async (habitId: string, customValue?: number, dateOverride?: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const dateStr = dateOverride || today;
    const existingLog = logs.find(log => log.habit_id === habitId && log.log_date === dateStr);
    const isToday = dateStr === today;

    try {
      if (existingLog) {
        // Remover check
        const { error } = await supabase.from('pos_habit_logs').delete().eq('id', existingLog.id);
        if (error) throw error;
        setLogs(logs.filter(log => log.id !== existingLog.id));
        
        // Update streak
        if (isToday) {
          const habit = habits.find(h => h.id === habitId);
          if (habit && habit.current_streak > 0) {
             await supabase.from('pos_habits').update({ current_streak: habit.current_streak - 1 }).eq('id', habitId);
             setHabits(habits.map(h => h.id === habitId ? { ...h, current_streak: h.current_streak - 1 } : h));
          }
        }
      } else {
        // Adicionar check
        const { data, error } = await supabase
          .from('pos_habit_logs')
          .insert([{ habit_id: habitId, log_date: dateStr, status: 'concluido', value_achieved: customValue || null }])
          .select()
          .single();

        if (error) throw error;
        if (data) setLogs([...logs, data]);

        // Update streak
        if (isToday) {
          const habit = habits.find(h => h.id === habitId);
          if (habit) {
             const newStreak = habit.current_streak + 1;
             const newBest = newStreak > habit.best_streak ? newStreak : habit.best_streak;
             await supabase.from('pos_habits').update({ current_streak: newStreak, best_streak: newBest }).eq('id', habitId);
             setHabits(habits.map(h => h.id === habitId ? { ...h, current_streak: newStreak, best_streak: newBest } : h));
          }
        }
      }
    } catch (error: any) {
      toast.error("Erro ao atualizar registro: " + error.message);
    }
  };

  const logHabitPartial = async (habitId: string, value: number, status: string = 'parcial', notes: string = '') => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const existingLog = logs.find(log => log.habit_id === habitId && log.log_date === today);

    try {
      if (existingLog) {
        const { data, error } = await supabase
          .from('pos_habit_logs')
          .update({ value_achieved: value, status, notes })
          .eq('id', existingLog.id)
          .select()
          .single();
        if (error) throw error;
        if (data) setLogs(logs.map(log => log.id === existingLog.id ? data : log));
      } else {
        const { data, error } = await supabase
          .from('pos_habit_logs')
          .insert([{ habit_id: habitId, log_date: today, status, value_achieved: value, notes }])
          .select()
          .single();
        if (error) throw error;
        if (data) setLogs([...logs, data]);
      }
      toast.success("Registro atualizado!");
    } catch (error: any) {
      toast.error("Erro no log: " + error.message);
    }
  };

  return { habits, logs, loading, addHabit, updateHabit, deleteHabit, toggleHabitToday, logHabitPartial };
}
