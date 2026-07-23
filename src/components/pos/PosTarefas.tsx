import { useState } from "react";
import { usePosTasks } from "@/hooks/use-pos-tasks";
import { 
  Plus, Trash2, CheckCircle2, Circle, Clock, Target, Sparkles, AlertTriangle, PlayCircle,
  LayoutList, KanbanSquare, Archive, MoreVertical, Flag, Briefcase, Calendar as CalendarIcon, FileText, Edit2, X
} from "lucide-react";
import { format, isToday, isTomorrow, isThisWeek, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const PRIORITY_COLORS = {
  'critica': 'text-rose-500 bg-rose-500/10 border-rose-500/20',
  'alta': 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  'media': 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  'baixa': 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
};

const STATUS_COLORS = {
  'pendente': 'text-[#A1A1AA] border-[#A1A1AA]/20',
  'em_andamento': 'text-amber-500 border-amber-500/20',
  'concluida': 'text-emerald-500 border-emerald-500/20 line-through opacity-70',
  'cancelada': 'text-rose-500 border-rose-500/20 opacity-50',
  'arquivada': 'text-[#71717A] border-[#71717A]/20 opacity-50'
};

export function PosTarefas() {
  const { tasks, loading, addTask, updateTask, deleteTask } = usePosTasks();
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filterTab, setFilterTab] = useState('todas');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskData, setEditTaskData] = useState<any>(null);
  
  const [newTask, setNewTask] = useState({
    title: "", description: "", category: "Trabalho", priority: "media", status: "pendente", 
    deadline: "", due_time: "", estimated_minutes: 30
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;
    const taskPayload: any = { ...newTask };
    if (!taskPayload.deadline) delete taskPayload.deadline;
    if (!taskPayload.due_time) delete taskPayload.due_time;
    await addTask(taskPayload);
    setIsCreating(false);
    setNewTask({ ...newTask, title: "", description: "", deadline: "", due_time: "" });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaskId || !editTaskData) return;
    const taskPayload: any = { ...editTaskData };
    if (!taskPayload.deadline) delete taskPayload.deadline;
    if (!taskPayload.due_time) delete taskPayload.due_time;
    await updateTask(editingTaskId, taskPayload);
    setEditingTaskId(null);
  };

  const getSafeDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    return parseISO(`${dateStr.split('T')[0]}T12:00:00`);
  };

  const getFilteredTasks = () => {
    let filtered = [...tasks];
    if (filterTab === 'hoje') {
      filtered = filtered.filter(t => {
        const d = getSafeDate(t.deadline);
        return d && isToday(d);
      });
    } else if (filterTab === 'atrasadas') {
      filtered = filtered.filter(t => {
        const d = getSafeDate(t.deadline);
        return d && d < new Date() && !isToday(d) && t.status !== 'concluida';
      });
    } else if (filterTab === 'concluidas') {
      filtered = filtered.filter(t => t.status === 'concluida');
    } else if (filterTab !== 'todas') {
      filtered = filtered.filter(t => t.status !== 'concluida' && t.status !== 'arquivada');
    }
    return filtered;
  };

  const displayedTasks = getFilteredTasks();

  const pendenteCount = tasks.filter(t=>t.status === 'pendente').length;
  const concluidaCount = tasks.filter(t=>t.status === 'concluida').length;
  const atrasadaCount = tasks.filter(t => {
      const d = getSafeDate(t.deadline);
      return d && d < new Date() && !isToday(d) && t.status !== 'concluida';
  }).length;

  const totalChart = pendenteCount + concluidaCount + atrasadaCount;

  const pieData = totalChart === 0 
    ? [{ name: 'Vazio', value: 1, color: '#1A1A1E' }]
    : [
      { name: 'Pendente', value: pendenteCount, color: '#3b82f6' },
      { name: 'Concluída', value: concluidaCount, color: '#10b981' },
      { name: 'Atrasada', value: atrasadaCount, color: '#f43f5e' }
    ].filter(d => d.value > 0);

  return (
    <div className="p-4 md:p-10 max-w-[1600px] mx-auto flex flex-col gap-6 md:gap-8 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
             Gestão de Tarefas 360º
          </h2>
          <p className="text-[#A1A1AA] text-sm mt-1">Organização, priorização e inteligência de execução.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl p-1">
            <button onClick={() => setViewMode('list')} className={cn("p-1.5 rounded-lg transition-colors", viewMode === 'list' ? 'bg-[#1A1A1E] text-white' : 'text-[#71717A] hover:text-[#A1A1AA]')}><LayoutList className="size-4" /></button>
            <button onClick={() => setViewMode('kanban')} className={cn("p-1.5 rounded-lg transition-colors", viewMode === 'kanban' ? 'bg-[#1A1A1E] text-white' : 'text-[#71717A] hover:text-[#A1A1AA]')}><KanbanSquare className="size-4" /></button>
          </div>
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-2 bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(225,29,72,0.2)] hover:bg-rose-600 transition-colors"
          >
            <Plus className="size-4" /> Nova Tarefa
          </button>
        </div>
      </div>

      {/* DASHBOARD EXECUTIVO & IA */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* KPI: Overview */}
        <div className="col-span-1 bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
          <h3 className="text-[#71717A] text-[11px] font-bold uppercase tracking-widest mb-4">Volume Operacional</h3>
          <div className="flex gap-4">
            <div>
              <div className="text-3xl font-black tracking-tighter text-white">{tasks.filter(t=>t.status !== 'concluida' && t.status !== 'arquivada').length}</div>
              <div className="text-[10px] uppercase font-bold text-[#A1A1AA]">Pendentes</div>
            </div>
            <div>
              <div className="text-3xl font-black tracking-tighter text-emerald-500">{tasks.filter(t=>t.status === 'concluida').length}</div>
              <div className="text-[10px] uppercase font-bold text-[#A1A1AA]">Concluídas</div>
            </div>
          </div>
          <div className="absolute -bottom-6 -right-6 opacity-40">
             <PieChart width={120} height={120}>
               <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" stroke="none">
                 {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
               </Pie>
             </PieChart>
          </div>
        </div>

        {/* AI Insight */}
        <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-[#111113] to-rose-900/10 border border-[rgba(255,255,255,0.06)] rounded-3xl p-6 relative overflow-hidden shadow-glow-accent-rose flex flex-col justify-between">
           <div className="flex items-center gap-2 mb-2">
             <Sparkles className="size-4 text-rose-400" />
             <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest">Análise de Gargalos (IA)</span>
           </div>
           <p className="text-sm text-white/90 leading-relaxed font-medium">
             Existem <strong className="text-rose-400">2 tarefas críticas atrasadas</strong> vinculadas ao projeto "Dashboard Financeiro". Você tem o hábito de adiar tarefas de alta complexidade. Sugestão: quebre a tarefa "Revisar DRE" em 3 subtarefas de 20 minutos.
           </p>
           <div className="mt-4 flex gap-2">
             <button className="text-[10px] uppercase font-bold bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-lg hover:bg-rose-500/30 transition-colors">
               Quebrar Tarefa Agora
             </button>
             <button className="text-[10px] uppercase font-bold bg-[#1A1A1E] text-[#A1A1AA] px-3 py-1.5 rounded-lg hover:bg-[#27272A] transition-colors">
               Enviar para Modo Foco
             </button>
           </div>
        </div>

        {/* Time Tracking KPI */}
        <div className="col-span-1 bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-3xl p-6 flex flex-col justify-center">
          <h3 className="text-[#71717A] text-[11px] font-bold uppercase tracking-widest mb-2">Tempo Estimado (Hoje)</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white tracking-tighter">4.5</span>
            <span className="text-sm text-[#A1A1AA] font-bold">Horas</span>
          </div>
          <div className="mt-4 text-xs font-medium text-amber-500 flex items-center gap-1">
            <AlertTriangle className="size-3" /> Carga limite atingida
          </div>
        </div>
      </div>

      {/* FORMULÁRIO DE CRIAÇÃO (MODAL) */}
      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 animate-in fade-in">
          <div className="w-full md:max-w-4xl max-h-[90vh] bg-[#111113] border border-[rgba(255,255,255,0.06)] md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 md:zoom-in-95">
            <div className="p-5 md:p-6 border-b border-[rgba(255,255,255,0.06)] flex justify-between items-center bg-[#09090B]/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <Sparkles className="size-5 text-rose-500" /> Engenharia de Tarefa
               </h3>
               <button type="button" onClick={() => setIsCreating(false)} className="p-2 bg-[#1A1A1E] hover:bg-rose-500/20 text-[#A1A1AA] hover:text-rose-500 rounded-full transition-colors">
                 <X className="size-5" />
               </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 pb-safe">
              <form onSubmit={handleCreate}>
          
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-6">
            <div className="md:col-span-4">
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">O que precisa ser feito?</label>
              <input 
                type="text" required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                placeholder="Título da tarefa..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Prioridade</label>
              <select 
                value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica (Imediata)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-6">
             <div className="md:col-span-4">
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Descrição ou Contexto</label>
              <textarea 
                value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors resize-none h-[50px]"
                placeholder="Detalhes, links úteis, passo a passo..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Categoria / Área</label>
              <select 
                value={newTask.category} onChange={e => setNewTask({...newTask, category: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
              >
                <option value="Trabalho">Trabalho</option>
                <option value="Pessoal">Pessoal</option>
                <option value="Estudos">Estudos</option>
                <option value="Burocracia">Burocracia</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-4 bg-[#1A1A1E]/50 rounded-xl border border-[rgba(255,255,255,0.02)]">
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 flex items-center gap-1"><CalendarIcon className="size-3"/> Data Limite (Deadline)</label>
              <input 
                type="date" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 flex items-center gap-1"><Clock className="size-3"/> Horário Exato</label>
              <input 
                type="time" value={newTask.due_time} onChange={e => setNewTask({...newTask, due_time: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 flex items-center gap-1"><Target className="size-3"/> Tempo Estimado (Minutos)</label>
              <input 
                type="number" min="5" step="5" value={newTask.estimated_minutes} onChange={e => setNewTask({...newTask, estimated_minutes: Number(e.target.value)})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

                <div className="flex flex-col-reverse md:flex-row justify-end gap-3 mt-8 pt-6 border-t border-[rgba(255,255,255,0.04)]">
                  <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-4 md:py-3 rounded-xl text-sm font-medium text-[#A1A1AA] hover:bg-[#1A1A1E]">Cancelar</button>
                  <button type="submit" className="px-6 py-4 md:py-3 rounded-xl text-sm font-bold bg-rose-500 text-white hover:bg-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.3)]">Engatilhar Tarefa</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* FORMULÁRIO DE EDIÇÃO (MODAL) */}
      {editingTaskId && editTaskData && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 animate-in fade-in">
          <div className="w-full md:max-w-4xl max-h-[90vh] bg-[#111113] border border-[rgba(255,255,255,0.06)] md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 md:zoom-in-95">
            <div className="p-5 md:p-6 border-b border-[rgba(255,255,255,0.06)] flex justify-between items-center bg-[#09090B]/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <Edit2 className="size-5 text-rose-500" /> Editando Tarefa
               </h3>
               <button type="button" onClick={() => setEditingTaskId(null)} className="p-2 bg-[#1A1A1E] hover:bg-rose-500/20 text-[#A1A1AA] hover:text-rose-500 rounded-full transition-colors">
                 <X className="size-5" />
               </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 pb-safe">
              <form onSubmit={handleUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-6">
                  <div className="md:col-span-4">
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Título</label>
                    <input type="text" value={editTaskData.title} onChange={e => setEditTaskData({...editTaskData, title: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Prioridade</label>
                    <select value={editTaskData.priority} onChange={e => setEditTaskData({...editTaskData, priority: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors">
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                      <option value="critica">Crítica</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-6">
                  <div className="md:col-span-4">
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Descrição ou Contexto</label>
                    <textarea value={editTaskData.description || ''} onChange={e => setEditTaskData({...editTaskData, description: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors h-[50px] resize-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Categoria / Área</label>
                    <input type="text" value={editTaskData.category || ''} onChange={e => setEditTaskData({...editTaskData, category: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-4 bg-[#1A1A1E]/50 rounded-xl border border-[rgba(255,255,255,0.02)]">
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 flex items-center gap-1"><CalendarIcon className="size-3"/> Data Limite</label>
                    <input type="date" value={editTaskData.deadline ? editTaskData.deadline.split('T')[0] : ''} onChange={e => setEditTaskData({...editTaskData, deadline: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 flex items-center gap-1"><Clock className="size-3"/> Tempo Est. (min)</label>
                    <input type="number" value={editTaskData.estimated_minutes || ''} onChange={e => setEditTaskData({...editTaskData, estimated_minutes: Number(e.target.value)})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors" />
                  </div>
                </div>
                <div className="flex flex-col-reverse md:flex-row justify-end gap-3 mt-8 pt-6 border-t border-[rgba(255,255,255,0.04)]">
                  <button type="button" onClick={() => setEditingTaskId(null)} className="px-6 py-4 md:py-3 rounded-xl text-sm font-medium text-[#A1A1AA] hover:bg-[#1A1A1E]">Cancelar</button>
                  <button type="submit" className="px-6 py-4 md:py-3 rounded-xl text-sm font-bold bg-rose-500 text-white hover:bg-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.3)]">Salvar Alterações</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* FILTER TABS */}
      <div className="mt-4 mb-6 flex items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <CalendarIcon className="size-5 text-[#A1A1AA]" /> 
          {filterTab === 'todas' ? 'Todas as Tarefas' : filterTab === 'hoje' ? 'Foco de Hoje' : filterTab === 'atrasadas' ? 'Tarefas Atrasadas' : 'Tarefas Concluídas'}
        </h3>
        
        <div className="flex flex-wrap items-center gap-2 bg-[#111113] p-1 rounded-xl border border-[rgba(255,255,255,0.06)]">
          {['todas', 'hoje', 'atrasadas', 'concluidas'].map(tab => (
            <button 
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
                filterTab === tab 
                  ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(225,29,72,0.3)]" 
                  : "text-[#A1A1AA] hover:text-white hover:bg-[#1A1A1E]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* TASK LIST VIEW */}
      {loading ? (
         <div className="flex justify-center p-10"><div className="size-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
      ) : viewMode === 'list' ? (
        <div className="flex flex-col gap-3">
          {displayedTasks.length === 0 ? (
            <div className="text-center p-12 bg-[#111113] border border-dashed border-[rgba(255,255,255,0.06)] rounded-3xl">
              <CheckCircle2 className="size-12 text-[#71717A] mx-auto mb-4" />
              <p className="text-[#A1A1AA]">Nenhuma tarefa nesta visualização. Caixa limpa.</p>
            </div>
          ) : (
            displayedTasks.map(task => {
              const getPriorityGradient = (priority: string) => {
                switch(priority) {
                  case 'critica': return 'from-rose-500/20 via-rose-500/5 to-transparent border-l-rose-500/60';
                  case 'alta': return 'from-amber-500/20 via-amber-500/5 to-transparent border-l-amber-500/60';
                  case 'media': return 'from-blue-500/20 via-blue-500/5 to-transparent border-l-blue-500/60';
                  case 'baixa': return 'from-emerald-500/20 via-emerald-500/5 to-transparent border-l-emerald-500/60';
                  default: return 'from-white/5 via-white/5 to-transparent border-l-white/20';
                }
              };

              return (
              <div key={task.id} className={cn(
                "bg-[#111113] border-y border-r border-[rgba(255,255,255,0.04)] border-l-[3px] rounded-2xl p-5 flex items-center justify-between group transition-all relative overflow-hidden bg-gradient-to-r hover:shadow-2xl hover:shadow-black/50 hover:border-r-[rgba(255,255,255,0.1)] hover:border-y-[rgba(255,255,255,0.1)]",
                getPriorityGradient(task.priority),
                task.status === 'concluida' && "opacity-50 grayscale hover:grayscale-0",
                task.status === 'arquivada' && "hidden"
              )}>
                {/* Glow Overlay */}
                <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                <div className="flex items-center gap-5 flex-1 relative z-10">
                  <button 
                    onClick={() => updateTask(task.id, { status: task.status === 'concluida' ? 'pendente' : 'concluida' })} 
                    className={cn(
                      "transition-all shrink-0 p-1 rounded-full",
                      task.status === 'concluida' ? "text-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "text-white/20 hover:text-white/80 hover:bg-white/5 border border-white/10 hover:border-white/30"
                    )}
                  >
                    {task.status === 'concluida' ? <CheckCircle2 className="size-6" /> : <Circle className="size-6" />}
                  </button>
                  <div className="flex-1">
                    <h3 className={cn("font-bold tracking-tight flex items-center gap-2 text-lg", task.status === 'concluida' ? "text-white/40 line-through" : "text-white")}>
                      {task.title}
                      {task.priority === 'critica' && <AlertTriangle className="size-4 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" />}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={cn("text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border tracking-widest shadow-sm", PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.media)}>
                        {task.priority}
                      </span>
                      {task.category && (
                        <span className="flex items-center gap-1 text-[9px] text-white/60 font-bold uppercase tracking-widest bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/5">
                          <Briefcase className="size-3" /> {task.category}
                        </span>
                      )}
                      {task.deadline && (
                         <span className={cn(
                           "flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md shadow-sm border border-transparent",
                           getSafeDate(task.deadline)! < new Date() && !isToday(getSafeDate(task.deadline)!) && task.status !== 'concluida' 
                              ? "text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]" 
                              : "text-white/60 bg-black/40 backdrop-blur-md border-white/5"
                         )}>
                           <CalendarIcon className="size-3" /> {format(getSafeDate(task.deadline)!, 'dd MMM', {locale: ptBR})}
                         </span>
                      )}
                      {task.estimated_minutes && (
                         <span className="flex items-center gap-1 text-[9px] text-white/60 font-bold uppercase tracking-widest bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/5">
                           <Clock className="size-3" /> {task.estimated_minutes}m
                         </span>
                      )}
                      {task.goal_id && (
                         <span className="flex items-center gap-1 text-[9px] text-indigo-400 font-bold uppercase tracking-widest bg-indigo-500/10 backdrop-blur-md px-2 py-0.5 rounded-md border border-indigo-500/20">
                           <Target className="size-3" /> Meta Vinculada
                         </span>
                      )}
                    </div>
                  </div>
                </div>
                


                {/* Actions Menu */}
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/40 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-xl">
                  <button onClick={() => { setEditingTaskId(task.id); setEditTaskData(task); }} className="p-1.5 text-[#71717A] hover:text-white rounded-lg hover:bg-white/10 transition-colors" title="Editar">
                    <Edit2 className="size-4" />
                  </button>
                  {task.status !== 'concluida' && (
                    <button onClick={() => updateTask(task.id, { is_focus_mode: !task.is_focus_mode })} className="p-1.5 text-[#71717A] hover:text-blue-400 rounded-lg hover:bg-white/10 transition-colors" title="Enviar para Modo Foco">
                      <PlayCircle className="size-4" />
                    </button>
                  )}
                  <button onClick={() => updateTask(task.id, { status: 'arquivada' })} className="p-1.5 text-[#71717A] hover:text-amber-500 rounded-lg hover:bg-white/10 transition-colors" title="Arquivar">
                    <Archive className="size-4" />
                  </button>
                  <button onClick={() => deleteTask(task.id)} className="p-1.5 text-[#71717A] hover:text-rose-500 rounded-lg hover:bg-white/10 transition-colors" title="Excluir">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            );
          })
          )}
        </div>
      ) : (
        /* KANBAN VIEW (Mock/Simplified) */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['pendente', 'em_andamento', 'concluida'].map(colStatus => {
            const colTasks = displayedTasks.filter(t => t.status === colStatus);
            return (
              <div key={colStatus} className="bg-[#111113] border border-[rgba(255,255,255,0.02)] rounded-3xl p-4 flex flex-col gap-3 min-h-[500px]">
                <div className="flex items-center justify-between mb-4 px-1 border-b border-[rgba(255,255,255,0.06)] pb-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] flex items-center gap-2">
                    {colStatus === 'pendente' && <Circle className="size-3 text-blue-500" />}
                    {colStatus === 'em_andamento' && <PlayCircle className="size-3 text-amber-500" />}
                    {colStatus === 'concluida' && <CheckCircle2 className="size-3 text-emerald-500" />}
                    {colStatus.replace('_', ' ')}
                  </h3>
                  <span className="text-[10px] font-bold text-white bg-white/10 px-2 py-0.5 rounded-md border border-white/5 shadow-inner">{colTasks.length}</span>
                </div>
                {colTasks.map(task => {
                  const getPriorityGradient = (priority: string) => {
                    switch(priority) {
                      case 'critica': return 'from-rose-500/20 via-rose-500/5 to-transparent border-t-rose-500/60';
                      case 'alta': return 'from-amber-500/20 via-amber-500/5 to-transparent border-t-amber-500/60';
                      case 'media': return 'from-blue-500/20 via-blue-500/5 to-transparent border-t-blue-500/60';
                      case 'baixa': return 'from-emerald-500/20 via-emerald-500/5 to-transparent border-t-emerald-500/60';
                      default: return 'from-white/5 via-white/5 to-transparent border-t-white/20';
                    }
                  };

                  return (
                    <div key={task.id} className={cn(
                      "bg-[#111113] border-x border-b border-[rgba(255,255,255,0.04)] border-t-[3px] rounded-2xl p-5 hover:border-x-[rgba(255,255,255,0.1)] hover:border-b-[rgba(255,255,255,0.1)] hover:shadow-2xl hover:shadow-black/50 cursor-grab relative overflow-hidden bg-gradient-to-b group transition-all",
                      getPriorityGradient(task.priority),
                      task.status === 'concluida' && "opacity-50 grayscale hover:grayscale-0"
                    )}>
                      {/* Glow Overlay */}
                      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                      <div className="flex justify-between items-start mb-3 relative z-10">
                        <span className={cn("text-[8px] uppercase font-bold px-1.5 py-0.5 rounded-md border shadow-sm tracking-widest", PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS])}>
                          {task.priority}
                        </span>
                      </div>
                      <h4 className={cn("text-base font-bold tracking-tight mb-3 leading-tight relative z-10", task.status==='concluida' ? "line-through text-white/40" : "text-white")}>{task.title}</h4>
                      
                      <div className="flex items-center gap-2 mt-auto flex-wrap relative z-10">
                        {task.deadline && (
                          <div className={cn(
                            "text-[9px] font-bold flex items-center gap-1 uppercase tracking-widest px-2 py-0.5 rounded-md border shadow-sm",
                            getSafeDate(task.deadline)! < new Date() && !isToday(getSafeDate(task.deadline)!) && task.status !== 'concluida' 
                              ? "text-rose-400 bg-rose-500/10 border-rose-500/20" 
                              : "text-white/60 bg-black/40 backdrop-blur-md border-white/5"
                          )}>
                            <CalendarIcon className="size-3"/> {format(getSafeDate(task.deadline)!, 'dd MMM', {locale: ptBR})}
                          </div>
                        )}
                        {task.category && (
                          <div className="text-[9px] font-bold text-white/60 bg-black/40 backdrop-blur-md flex items-center gap-1 uppercase tracking-widest px-2 py-0.5 rounded-md border border-white/5">
                            <Briefcase className="size-3"/> {task.category}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
