import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PosEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  type: string;
  status: string;
  created_at?: string;
}

export function usePosAgenda() {
  const [events, setEvents] = useState<PosEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pos_events')
        .select('*')
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        // Ignorar o erro se a tabela não existir ainda para não poluir o console do usuario
        if (error.code !== '42P01') console.error("Error fetching events:", error);
      } else if (data) {
        setEvents(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addEvent = async (event: Omit<PosEvent, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('pos_events')
        .insert([event])
        .select()
        .single();

      if (error) throw error;
      if (data) setEvents([...events, data]);
      toast.success("Compromisso agendado!");
      return data;
    } catch (error: any) {
      toast.error("Erro ao adicionar: " + error.message);
      return null;
    }
  };

  const updateEvent = async (id: string, updates: Partial<PosEvent>) => {
    try {
      const { data, error } = await supabase
        .from('pos_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setEvents(events.map(e => e.id === id ? data : e));
        toast.success("Agenda atualizada!");
      }
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pos_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setEvents(events.filter(e => e.id !== id));
      toast.success("Compromisso removido!");
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  return { events, loading, fetchEvents, addEvent, updateEvent, deleteEvent };
}
