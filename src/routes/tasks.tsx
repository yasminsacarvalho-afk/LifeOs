import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { cn } from "@/lib/utils";
import { CheckSquare, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { useTasksRealtime, type TaskStatus, type Task } from "@/hooks/use-tasks-realtime";

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const { tasks, loading, addTask, updateTaskStatus, toggleHabit, removeTask } = useTasksRealtime();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState<"task" | "habit">("task");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addTask(newTaskTitle.trim(), newTaskType);
      setNewTaskTitle("");
    } catch (error) {
      console.error("Failed to add task", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const habits = tasks.filter((t) => t.type === "habit");
  const todoTasks = tasks.filter((t) => t.type === "task" && t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.type === "task" && t.status === "in-progress");
  const testingTasks = tasks.filter((t) => t.type === "task" && t.status === "testing");
  const doneTasks = tasks.filter((t) => t.type === "task" && t.status === "done");

  const TaskCard = ({ task }: { task: Task }) => (
    <div className="group relative flex flex-col gap-2 rounded-xl border border-border/50 bg-background/50 p-3 shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight text-foreground/90">{task.title}</p>
        <button
          onClick={() => removeTask(task.id)}
          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {["todo", "in-progress", "testing", "done"].map((status) => (
          <button
            key={status}
            onClick={() => updateTaskStatus(task.id, status as TaskStatus)}
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
              task.status === status
                ? "bg-primary/20 text-primary"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {status === "todo" && "A Fazer"}
            {status === "in-progress" && "Fazendo"}
            {status === "testing" && "Testando"}
            {status === "done" && "Feito"}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <TopBar
        title="Tarefas & Hábitos"
        subtitle="Gerencie seu fluxo de trabalho, coisas a resolver e testar."
      />
      <main className="mx-auto flex max-w-[1600px] flex-col gap-6 p-4 xl:flex-row md:p-8">
        
        {/* Formulário e Hábitos (Sidebar Esquerda) */}
        <div className="flex w-full flex-col gap-6 xl:w-80 shrink-0">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Nova Entrada
            </h2>
            <form onSubmit={handleAddTask} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="O que precisa ser feito?"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewTaskType("task")}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors",
                    newTaskType === "task"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  Tarefa
                </button>
                <button
                  type="button"
                  onClick={() => setNewTaskType("habit")}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors",
                    newTaskType === "habit"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  Hábito
                </button>
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !newTaskTitle.trim()}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              >
                <Plus className="size-4" />
                Adicionar
              </button>
            </form>
          </div>

          <div className="flex-1 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-primary">
              Hábitos Diários
            </h2>
            <div className="flex flex-col gap-2">
              {loading ? (
                <div className="flex justify-center p-4">
                  <span className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : habits.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhum hábito cadastrado.</p>
              ) : (
                habits.map((habit) => (
                  <div
                    key={habit.id}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/50 p-3 transition-colors hover:border-primary/30"
                  >
                    <button
                      onClick={() => toggleHabit(habit.id, habit.completed_today)}
                      className={cn(
                        "flex items-center gap-3 text-left flex-1",
                        habit.completed_today ? "text-muted-foreground line-through" : "text-foreground"
                      )}
                    >
                      {habit.completed_today ? (
                        <CheckCircle2 className="size-5 text-primary shrink-0" />
                      ) : (
                        <Circle className="size-5 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-sm font-medium">{habit.title}</span>
                    </button>
                    <button
                      onClick={() => removeTask(habit.id)}
                      className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quadro Kanban (Área Principal) */}
        <div className="flex-1 rounded-2xl border border-border bg-card p-4 md:p-5 shadow-sm">
          {loading ? (
            <div className="flex h-full min-h-[300px] items-center justify-center">
              <span className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
              
              {/* Coluna A Fazer */}
              <div className="flex flex-1 flex-col rounded-xl bg-muted/20 p-3">
                <div className="mb-3 flex items-center gap-2">
                  <div className="size-2 rounded-full bg-slate-500" />
                  <h3 className="text-sm font-bold text-foreground">A Fazer ({todoTasks.length})</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {todoTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>

              {/* Coluna Fazendo */}
              <div className="flex flex-1 flex-col rounded-xl bg-primary/5 p-3">
                <div className="mb-3 flex items-center gap-2">
                  <div className="size-2 rounded-full bg-primary" />
                  <h3 className="text-sm font-bold text-foreground">Fazendo ({inProgressTasks.length})</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {inProgressTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>

              {/* Coluna Testando */}
              <div className="flex flex-1 flex-col rounded-xl bg-warning/5 p-3">
                <div className="mb-3 flex items-center gap-2">
                  <div className="size-2 rounded-full bg-warning" />
                  <h3 className="text-sm font-bold text-foreground">Testando ({testingTasks.length})</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {testingTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>

              {/* Coluna Feito */}
              <div className="flex flex-1 flex-col rounded-xl bg-success/5 p-3">
                <div className="mb-3 flex items-center gap-2">
                  <div className="size-2 rounded-full bg-success" />
                  <h3 className="text-sm font-bold text-foreground">Concluído ({doneTasks.length})</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {doneTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </>
  );
}
