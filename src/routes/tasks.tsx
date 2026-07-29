import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash, Search, Filter, Calendar as CalendarIcon, LayoutList, CalendarDays, Check } from "lucide-react";
import { useTasksRealtime, type TaskStatus, type Task } from "@/hooks/use-tasks-realtime";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
});

const PageContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen w-full bg-[#0B0B0D] text-white">
    <div className="mx-auto w-full max-w-[1700px] p-6 space-y-6">
      {children}
    </div>
  </div>
);

const HeroCard = ({ onNewTask }: { onNewTask: () => void }) => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#18181B] border border-[rgba(255,255,255,0.05)] rounded-[26px] p-7 gap-4 transition-transform duration-200 hover:-translate-y-[2px]">
    <div>
      <h1 className="text-[34px] font-bold text-white tracking-tight leading-tight">Gerenciador de Tarefas</h1>
      <p className="text-[17px] font-normal text-[#A1A1AA] mt-1">Acompanhe seus afazeres, lembretes e projetos paralelos.</p>
    </div>
    <button 
      onClick={onNewTask}
      className="flex items-center gap-2 h-12 px-[26px] bg-[#2A2A2D] hover:bg-[#343437] border border-[rgba(255,255,255,0.08)] rounded-[14px] text-[15px] font-semibold text-white transition-all duration-150"
    >
      <Plus className="size-5" /> Nova Tarefa
    </button>
  </div>
);

const SectionCard = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-[#18181B] border border-[rgba(255,255,255,0.05)] rounded-[28px] p-6 transition-transform duration-200 hover:-translate-y-[2px]">
    {children}
  </div>
);

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="bg-[rgba(16,185,129,0.15)] text-[#34D399] rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap">
    {children}
  </span>
);

const SegmentedControl = ({ active, onChange }: { active: 'list'|'calendar', onChange: (v: 'list'|'calendar') => void }) => (
  <div className="flex bg-[#0B0B0D] p-1 rounded-2xl border border-[rgba(255,255,255,0.03)] w-fit">
    <button onClick={() => onChange('list')} className={cn("flex items-center gap-2 px-[18px] py-3 rounded-[12px] text-[15px] font-semibold transition-all duration-150", active === 'list' ? "bg-[#2A2A2D] text-white" : "text-[#A1A1AA] hover:text-white")}>
      <LayoutList className="size-5" /> Lista
    </button>
    <button onClick={() => onChange('calendar')} className={cn("flex items-center gap-2 px-[18px] py-3 rounded-[12px] text-[15px] font-semibold transition-all duration-150", active === 'calendar' ? "bg-[#2A2A2D] text-white" : "text-[#A1A1AA] hover:text-white")}>
      <CalendarDays className="size-5" /> Calendário
    </button>
  </div>
);

const Toolbar = () => (
  <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 py-6 border-b border-[rgba(255,255,255,0.05)]">
    {/* Left */}
    <button className="flex items-center gap-2 h-11 px-4 bg-[#2A2A2D] hover:bg-[#343437] rounded-xl text-sm font-medium text-white transition-colors duration-150 shrink-0">
      <CalendarIcon className="size-4 text-[#A1A1AA]" /> 01/07/2026 até 31/07/2026
    </button>

    {/* Right */}
    <div className="flex items-center gap-3 w-full xl:w-auto">
      <div className="relative w-full xl:w-[600px] h-11 bg-[#2A2A2D] rounded-xl focus-within:ring-1 focus-within:ring-[#3B82F6] transition-all duration-150">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#A1A1AA]" />
        <input 
          type="text" 
          placeholder="Buscar tarefas..." 
          className="w-full h-full bg-transparent pl-11 pr-4 text-sm text-white placeholder:text-[#A1A1AA] outline-none rounded-xl"
        />
      </div>
      <button className="flex items-center justify-center size-11 shrink-0 bg-[#2A2A2D] hover:bg-[#343437] rounded-xl text-white transition-colors duration-150">
        <Filter className="size-5" />
      </button>
    </div>
  </div>
);

const TaskCard = ({ task, onToggle, onRemove }: { task: Task, onToggle: () => void, onRemove: () => void }) => {
  const isDone = task.status === 'done' || (task.type === 'habit' && task.completed_today);
  
  // Choose priority color based on random or ID just for visual testing as specified
  const priorityColor = task.type === 'habit' ? '#8B5CF6' : (task.status === 'testing' ? '#FACC15' : '#22C55E');

  return (
    <div className="flex items-center justify-between bg-[#343437] rounded-[16px] px-5 h-[72px] border border-[rgba(255,255,255,0.05)] transition-transform duration-200 hover:-translate-y-[2px] hover:border-[rgba(255,255,255,0.1)] group relative overflow-hidden">
      {/* Indicador lateral */}
      <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-1 h-[60%] rounded-r-full transition-colors duration-300")} style={{ backgroundColor: isDone ? '#A1A1AA' : priorityColor }} />
      
      {/* Left Content */}
      <div className="flex items-center gap-4 pl-2">
        <button 
          onClick={onToggle}
          className={cn("flex items-center justify-center size-[22px] rounded-md border transition-all duration-150 hover:scale-110", isDone ? "bg-[#3B82F6] border-[#3B82F6]" : "border-[#A1A1AA] bg-transparent")}
        >
          {isDone && <Check className="size-3.5 text-white" />}
        </button>
        <div className="flex flex-col justify-center">
          <span className={cn("text-[18px] font-semibold leading-tight transition-colors duration-200", isDone ? "text-[#A1A1AA] line-through" : "text-white")}>{task.title}</span>
          <div className="flex items-center gap-1.5 mt-1">
            <CalendarIcon className="size-3.5 text-[#A1A1AA]" />
            <span className="text-[14px] font-normal text-[#A1A1AA]">Sem prazo</span>
          </div>
        </div>
      </div>

      {/* Right Content */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button className="flex items-center justify-center size-[36px] rounded-[10px] hover:bg-[rgba(255,255,255,0.08)] text-[#A1A1AA] hover:text-white transition-colors duration-150">
          <Pencil className="size-[18px]" />
        </button>
        <button 
          onClick={onRemove}
          className="flex items-center justify-center size-[36px] rounded-[10px] hover:bg-[rgba(255,255,255,0.08)] text-[#A1A1AA] hover:text-[#EF4444] transition-colors duration-150"
        >
          <Trash className="size-[18px]" />
        </button>
      </div>
    </div>
  );
};

function TasksPage() {
  const { tasks, addTask, updateTaskStatus, toggleHabit, removeTask } = useTasksRealtime();
  const [view, setView] = useState<'list'|'calendar'>('list');

  const pendingTasks = tasks.filter(t => (t.type === 'task' && t.status !== 'done') || (t.type === 'habit' && !t.completed_today));
  const completedTasks = tasks.filter(t => (t.type === 'task' && t.status === 'done') || (t.type === 'habit' && t.completed_today));

  const handleNewTask = () => {
    const title = window.prompt("Nova Tarefa/Hábito:");
    if (title) addTask(title, 'task'); // Defaulting to task for simple prompt
  };

  return (
    <PageContainer>
      <HeroCard onNewTask={handleNewTask} />
      
      <SectionCard>
        {/* Header */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 pb-6 border-b border-[rgba(255,255,255,0.05)]">
          <div className="flex flex-col">
            <div className="flex items-center gap-4">
              <h2 className="text-[30px] font-bold text-white tracking-tight">Minhas Tarefas</h2>
              <Badge>{pendingTasks.length} {pendingTasks.length === 1 ? 'Tarefa' : 'Tarefas'}</Badge>
            </div>
            <p className="text-[15px] text-[#A1A1AA] mt-1">Foque nas prioridades!</p>
          </div>
          <SegmentedControl active={view} onChange={setView} />
        </div>

        <Toolbar />

        {/* Task Lists */}
        {pendingTasks.length > 0 && (
          <div className="mt-6">
            <h3 className="text-[16px] font-semibold text-[#A1A1AA] mb-4 pl-1">Pendentes</h3>
            <div className="flex flex-col gap-3">
              {pendingTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onToggle={() => {
                    if (task.type === 'habit') {
                      toggleHabit(task.id, task.completed_today);
                    } else {
                      updateTaskStatus(task.id, 'done');
                    }
                  }} 
                  onRemove={() => removeTask(task.id)}
                />
              ))}
            </div>
          </div>
        )}

        {completedTasks.length > 0 && (
          <div className="mt-8">
            <h3 className="text-[16px] font-semibold text-[#A1A1AA] mb-4 pl-1">Concluídas</h3>
            <div className="flex flex-col gap-3 opacity-60 hover:opacity-100 transition-opacity duration-300">
              {completedTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onToggle={() => {
                    if (task.type === 'habit') {
                      toggleHabit(task.id, task.completed_today);
                    } else {
                      updateTaskStatus(task.id, 'todo');
                    }
                  }} 
                  onRemove={() => removeTask(task.id)}
                />
              ))}
            </div>
          </div>
        )}

        {tasks.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-[#A1A1AA] text-lg font-medium">Nenhuma tarefa encontrada.</p>
            <p className="text-[#A1A1AA] text-sm mt-2">Clique em "Nova Tarefa" para começar.</p>
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}
