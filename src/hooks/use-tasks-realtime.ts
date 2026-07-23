import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TaskStatus = "todo" | "in-progress" | "testing" | "done";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  type: "task" | "habit";
  completed_today: boolean;
  created_at?: string;
}

export function useTasksRealtime() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();

    const channel = (supabase as any)
      .channel("public:tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          console.log("Realtime task update", payload);
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchTasks() {
    const { data, error } = await (supabase as any)
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching tasks:", error);
    } else {
      setTasks(data as Task[]);
    }
    setLoading(false);
  }

  async function addTask(title: string, type: "task" | "habit") {
    const optimisticTask: Task = {
      id: "temp-" + Date.now(),
      title,
      type,
      status: "todo",
      completed_today: false,
      created_at: new Date().toISOString(),
    };
    setTasks((prev) => [...prev, optimisticTask]);

    const { error } = await (supabase as any).from("tasks").insert({
      title,
      type,
      status: "todo",
      completed_today: false,
    });
    if (error) {
      console.error("Error adding task:", error);
      fetchTasks();
      throw error;
    }
  }

  async function updateTaskStatus(id: string, status: TaskStatus) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    const { error } = await (supabase as any)
      .from("tasks")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("Error updating task status:", error);
      fetchTasks();
      throw error;
    }
  }

  async function toggleHabit(id: string, currentCompleted: boolean) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed_today: !currentCompleted } : t)));
    const { error } = await (supabase as any)
      .from("tasks")
      .update({ completed_today: !currentCompleted, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("Error toggling habit:", error);
      fetchTasks();
      throw error;
    }
  }

  async function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    const { error } = await (supabase as any).from("tasks").delete().eq("id", id);
    if (error) {
      console.error("Error removing task:", error);
      fetchTasks();
      throw error;
    }
  }

  return { 
    tasks, 
    loading, 
    addTask, 
    updateTaskStatus, 
    toggleHabit, 
    removeTask 
  };
}
