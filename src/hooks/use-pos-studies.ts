import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PosStudyCourse {
  id: string;
  title: string;
  status: string;
  category: string | null;
  knowledge_area: string | null;
  platform: string | null;
  instructor: string | null;
  description: string | null;
  level: string | null;
  start_date: string | null;
  deadline: string | null;
  total_hours: number | null;
  completed_hours: number;
  certificate_url: string | null;
  course_url: string | null;
  xp_awarded: number;
  created_at?: string;
}

export interface PosStudySession {
  id: string;
  course_id: string;
  session_date: string;
  start_time: string | null;
  duration_minutes: number;
  module_name: string | null;
  class_name: string | null;
  content_studied: string | null;
  summary: string | null;
  difficulty: string | null;
  exercises_done: boolean;
  personal_rating: number | null;
  next_subject: string | null;
  xp_earned: number;
  created_at?: string;
}

export function usePosStudies() {
  const [courses, setCourses] = useState<PosStudyCourse[]>([]);
  const [sessions, setSessions] = useState<PosStudySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudiesData();
  }, []);

  const fetchStudiesData = async () => {
    try {
      setLoading(true);
      const { data: coursesData, error: coursesError } = await supabase
        .from('pos_studies')
        .select('*')
        .order('created_at', { ascending: false });

      if (coursesError && coursesError.code !== '42P01') console.error("Error fetching courses:", coursesError);

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('pos_study_sessions')
        .select('*')
        .order('session_date', { ascending: false });

      if (sessionsError && sessionsError.code !== '42P01') console.error("Error fetching sessions:", sessionsError);

      if (coursesData) setCourses(coursesData);
      if (sessionsData) setSessions(sessionsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addCourse = async (course: Partial<PosStudyCourse>) => {
    try {
      const { data, error } = await supabase
        .from('pos_studies')
        .insert([{ ...course, completed_hours: 0, xp_awarded: 0, status: 'em_andamento' }])
        .select()
        .single();

      if (error) throw error;
      if (data) setCourses([data, ...courses]);
      toast.success("Curso cadastrado com sucesso!");
      return data;
    } catch (error: any) {
      toast.error("Erro ao cadastrar curso: " + error.message);
      return null;
    }
  };

  const updateCourse = async (id: string, updates: Partial<PosStudyCourse>) => {
    try {
      const { data, error } = await supabase
        .from('pos_studies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (data) setCourses(courses.map(c => c.id === id ? data : c));
      toast.success("Curso atualizado!");
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    }
  };

  const deleteCourse = async (id: string) => {
    try {
      const { error } = await supabase.from('pos_studies').delete().eq('id', id);
      if (error) throw error;
      setCourses(courses.filter(c => c.id !== id));
      toast.success("Curso removido!");
    } catch (error: any) {
      toast.error("Erro ao remover curso: " + error.message);
    }
  };

  const addSession = async (session: Partial<PosStudySession>) => {
    try {
      const xp = (session.duration_minutes || 0) * 2; // Gamification rule: 2 XP per minute
      const { data, error } = await supabase
        .from('pos_study_sessions')
        .insert([{ ...session, xp_earned: xp }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setSessions([data, ...sessions]);
        
        // Update course hours
        const course = courses.find(c => c.id === session.course_id);
        if (course) {
           const addedHours = Number((session.duration_minutes! / 60).toFixed(2));
           const newHours = (Number(course.completed_hours) || 0) + addedHours;
           const newStatus = (course.total_hours && newHours >= course.total_hours) ? 'concluido' : course.status;
           
           await updateCourse(course.id, { completed_hours: newHours, status: newStatus });
        }
        toast.success(`Sessão salva! +${xp} XP ganhos! 🔥`);
      }
      return data;
    } catch (error: any) {
      toast.error("Erro ao salvar sessão: " + error.message);
      return null;
    }
  };

  return { courses, sessions, loading, addCourse, updateCourse, deleteCourse, addSession };
}
