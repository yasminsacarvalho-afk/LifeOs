import { useState } from "react";
import { usePosTasks } from "@/hooks/use-pos-tasks";
import { 
  CheckCircle2, Plus, X, Trash2, Edit2, Clock, AlertCircle, PlayCircle, Target, Grid, LayoutList, Columns, Filter
} from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { VoiceRecordButton } from "@/components/ui/VoiceRecordButton";

export function PosTarefas() {
  const { tasks, addTask, updateTask, deleteTask } = usePosTasks();
  const [filter, setFilter] = useState<'todas' | 'hoje'>('todas');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'kanban'>('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskForm, setTaskForm] = useState({ 
    title: '', 
    description: '',
    category: '', 
    deadline: '', 
    due_time: '',
    status: 'pendente',
    priority: 'media',
    responsible: ''
  });
  
  // Handlers para o CRUD
  const handleOpenModal = (task: any = null) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title || '',
        description: task.description || '',
        category: task.category || '',
        deadline: task.deadline ? task.deadline.split('T')[0] : '',
        due_time: task.due_time ? task.due_time.substring(0, 5) : '',
        status: task.status || 'pendente',
        priority: task.priority || 'media',
        responsible: task.responsible || ''
      });
    } else {
      setEditingTask(null);
      setTaskForm({ 
        title: '', 
        description: '',
        category: '', 
        deadline: '', 
        due_time: '',
        status: 'pendente',
        priority: 'media',
        responsible: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!taskForm.title) return;
    
    const payload = {
      title: taskForm.title,
      description: taskForm.description || null,
      category: taskForm.category || null,
      deadline: taskForm.deadline ? `${taskForm.deadline}T12:00:00` : null,
      due_time: taskForm.due_time ? `${taskForm.due_time}:00` : null,
      status: taskForm.status,
      priority: taskForm.priority,
      responsible: taskForm.responsible || null
    };

    if (editingTask) {
      await updateTask(editingTask.id, payload);
    } else {
      await addTask(payload);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja remover esta tarefa?")) {
      await deleteTask(id);
    }
  };

  // Real data calculations
  const getSafeDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    return parseISO(`${dateStr.split('T')[0]}T12:00:00`);
  };

  const atrasadas = tasks.filter(t => {
    const d = getSafeDate(t.deadline);
    return d && d < new Date() && !isToday(d) && t.status !== 'concluida';
  });
  
  const concluidas = tasks.filter(t => t.status === 'concluida');
  const emAndamento = tasks.filter(t => t.status === 'em_andamento');
  const pendentes = tasks.filter(t => t.status === 'pendente' && !atrasadas.includes(t));
  
  const totalActive = tasks.filter(t => t.status !== 'arquivada');
  const percentConcluido = totalActive.length > 0 ? Math.round((concluidas.length / totalActive.length) * 100) : 0;

  const displayTasks = tasks.filter(t => {
    // Filter Hoje / Todas
    const d = getSafeDate(t.deadline);
    if (filter === 'hoje' && (!d || !isToday(d))) return false;
    
    // Filter Status
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    
    // Filter Priority
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    
    return true;
  });

  const renderTaskCard = (task: any, isGrid: boolean = false) => (
    <div key={task.id} className={cn(
      "group flex relative bg-gradient-to-br from-[#111113] to-[#09090B] border border-[rgba(255,255,255,0.03)] hover:border-rose-500/30 rounded-2xl hover:shadow-[0_8px_30px_rgb(225,29,72,0.05)] transition-all duration-500 overflow-hidden gap-4",
      isGrid ? "flex-col p-6" : "flex-col sm:flex-row sm:items-center justify-between p-5"
    )}>
      {/* Elegance subtle gradient glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/0 to-rose-500/0 group-hover:to-rose-500/5 transition-colors duration-700 pointer-events-none" />
      
      <div className={cn("flex items-start gap-4 relative z-10", isGrid ? "w-full" : "w-full sm:w-auto")}>
        <button onClick={() => updateTask(task.id, { status: task.status === 'concluida' ? 'pendente' : 'concluida' })} className="mt-1 text-[#333] hover:text-emerald-500 transition-all duration-300 transform group-hover:scale-105 shrink-0">
          <CheckCircle2 className={cn("size-6 transition-all duration-500", task.status === 'concluida' && "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]")} />
        </button>
        <div className="flex-1">
          <h4 className={cn("text-base font-medium transition-colors", task.status === 'concluida' ? "line-through text-[#6F6F6F]" : "text-white")}>{task.title}</h4>
          {task.description && (
             <p className="text-xs text-[#A1A1AA] mt-2 whitespace-pre-wrap line-clamp-4 leading-relaxed">{task.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase font-bold text-[#6F6F6F] mt-3 tracking-widest relative z-10">
             {task.deadline && <span className={cn(getSafeDate(task.deadline)! < new Date() && !isToday(getSafeDate(task.deadline)!) && task.status !== 'concluida' ? "text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md" : "bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-[#A1A1AA] px-2 py-0.5 rounded-md")}>{format(getSafeDate(task.deadline)!, "dd MMM", {locale: ptBR})} {task.due_time && `às ${task.due_time.substring(0,5)}`}</span>}
             {task.priority && <span className={cn("px-2 py-0.5 rounded-md border", task.priority === 'alta' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : task.priority === 'critica' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-[rgba(255,255,255,0.03)] text-[#A1A1AA] border-[rgba(255,255,255,0.05)]')}>{task.priority}</span>}
             {task.category && <span className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-[#A1A1AA] px-2 py-0.5 rounded-md">{task.category}</span>}
             {task.responsible && <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-md">@{task.responsible}</span>}
          </div>
        </div>
      </div>
      <div className={cn("flex items-center gap-2 transition-all duration-300 relative z-10", isGrid ? "justify-end w-full mt-2" : "justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100")}>
        <button onClick={() => handleOpenModal(task)} className="p-2 text-[#6F6F6F] hover:text-white bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.06)] rounded-lg transition-colors backdrop-blur-md"><Edit2 className="size-4" /></button>
        <button onClick={() => handleDelete(task.id)} className="p-2 text-[#6F6F6F] hover:text-rose-500 bg-[rgba(255,255,255,0.02)] hover:bg-rose-500/10 rounded-lg transition-colors backdrop-blur-md"><Trash2 className="size-4" /></button>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 md:p-8 flex flex-col gap-8 pb-32">
      
      {/* Header and KPIs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white mb-2">Central de Tarefas</h2>
          <p className="text-[#A1A1AA] text-sm">Gerencie suas entregas, projetos e prioridades operacionais.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl p-1">
            <button 
              onClick={() => setFilter('todas')}
              className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-colors uppercase tracking-widest", filter === 'todas' ? "bg-[rgba(255,255,255,0.08)] text-white" : "text-[#71717A] hover:text-[#A1A1AA]")}
            >
              Todas
            </button>
            <button 
              onClick={() => setFilter('hoje')}
              className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-colors uppercase tracking-widest", filter === 'hoje' ? "bg-[rgba(255,255,255,0.08)] text-white" : "text-[#71717A] hover:text-[#A1A1AA]")}
            >
              Hoje
            </button>
          </div>
          <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors shadow-lg shadow-rose-500/20 shrink-0">
            <Plus className="size-4" /> Criar Tarefa
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pendentes", value: pendentes.length, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
          { label: "Em Andamento", value: emAndamento.length, icon: PlayCircle, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
          { label: "Atrasadas", value: atrasadas.length, icon: AlertCircle, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
          { label: "Concluídas", value: concluidas.length, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
        ].map((kpi, i) => (
          <div key={i} className={cn("rounded-2xl p-5 border flex flex-col justify-between bg-[#111113] hover:bg-[#151518] transition-colors", kpi.border)}>
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-2 rounded-lg", kpi.bg, kpi.color)}>
                <kpi.icon className="size-5" />
              </div>
              <span className="text-3xl font-semibold tracking-tight text-white">{kpi.value}</span>
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#A1A1AA]">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Progress Section */}
      <div className={cn(
        "bg-[#111113] border rounded-3xl p-6 md:p-8 flex flex-col gap-6 relative overflow-hidden transition-all duration-500",
        atrasadas.length > 0 ? "border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.05)]" : "border-[rgba(255,255,255,0.06)]"
      )}>
        {/* Glow Se Atrasadas */}
        {atrasadas.length > 0 && (
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[60px] rounded-full pointer-events-none"></div>
        )}
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Target className="size-5 text-rose-500" /> Visão Geral do Progresso
            </h3>
            <p className="text-sm text-[#A1A1AA] mt-1">Acompanhamento quantitativo do seu pipeline de entregas.</p>
          </div>
          <div className="text-left md:text-right">
             <span className="text-4xl font-black text-white tracking-tighter">{percentConcluido}%</span>
             <span className="text-[10px] uppercase tracking-widest font-bold text-[#6F6F6F] block">Concluído</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-4 relative z-10">
          {/* Legendas */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-[11px] font-bold uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              <span className="text-[#A1A1AA]">Concluídas ({concluidas.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
              <span className="text-[#A1A1AA]">Em Andamento ({emAndamento.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
              <span className="text-[#A1A1AA]">Pendentes ({pendentes.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("size-2.5 rounded-full", atrasadas.length > 0 ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" : "bg-[#1A1A1E]")}></span>
              <span className={atrasadas.length > 0 ? "text-rose-400" : "text-[#6F6F6F]"}>Atrasadas ({atrasadas.length})</span>
            </div>
          </div>

          {/* Barra Segmentada */}
          <div className="w-full h-3 md:h-4 bg-[#1A1A1E] rounded-full overflow-hidden flex shadow-inner">
            <div className="h-full bg-emerald-500 transition-all duration-1000 ease-out" style={{ width: `${percentConcluido}%` }} title={`Concluídas: ${percentConcluido}%`}></div>
            <div className="h-full bg-blue-500 transition-all duration-1000 ease-out" style={{ width: `${totalActive.length > 0 ? (emAndamento.length / totalActive.length)*100 : 0}%` }} title={`Em Andamento: ${totalActive.length > 0 ? Math.round((emAndamento.length / totalActive.length)*100) : 0}%`}></div>
            <div className="h-full bg-amber-500 transition-all duration-1000 ease-out" style={{ width: `${totalActive.length > 0 ? (pendentes.length / totalActive.length)*100 : 0}%` }} title={`Pendentes: ${totalActive.length > 0 ? Math.round((pendentes.length / totalActive.length)*100) : 0}%`}></div>
            <div className="h-full bg-rose-500 transition-all duration-1000 ease-out" style={{ width: `${totalActive.length > 0 ? (atrasadas.length / totalActive.length)*100 : 0}%` }} title={`Atrasadas: ${totalActive.length > 0 ? Math.round((atrasadas.length / totalActive.length)*100) : 0}%`}></div>
          </div>
        </div>

        {/* Caixa de Mensagem / Alerta */}
        <div className={cn(
          "flex items-start gap-4 p-5 rounded-2xl border relative z-10 transition-colors mt-2",
          atrasadas.length > 0 ? "bg-rose-500/10 border-rose-500/20" : "bg-emerald-500/10 border-emerald-500/20"
        )}>
          {atrasadas.length > 0 ? (
            <div className="p-2 bg-rose-500/20 rounded-xl shrink-0"><AlertCircle className="size-5 text-rose-500" /></div>
          ) : (
            <div className="p-2 bg-emerald-500/20 rounded-xl shrink-0"><CheckCircle2 className="size-5 text-emerald-500" /></div>
          )}
          <div>
            <h4 className={cn("text-base font-bold tracking-tight mb-1", atrasadas.length > 0 ? "text-rose-500" : "text-emerald-500")}>
              {atrasadas.length > 0 ? "Opa, precisamos de um empurrãozinho!" : "Tudo nos conformes, muito bem!"}
            </h4>
            <p className={cn("text-sm leading-relaxed", atrasadas.length > 0 ? "text-rose-200/70" : "text-emerald-200/70")}>
              {atrasadas.length > 0 
                ? `Parece que ${atrasadas.length === 1 ? '1 tarefa acabou' : `${atrasadas.length} tarefas acabaram`} passando um pouquinho do prazo. Fique tranquilo! Você pode reprogramar a data ou resolver rapidinho agora para tirar isso da frente.`
                : "Seu pipeline está limpo de atrasos. Excelente trabalho mantendo tudo organizado e em dia!"}
            </p>
          </div>
        </div>
      </div>

      {/* Task List Header with Filters and Views */}
      <div className="flex flex-col gap-4">
         <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
           <h3 className="text-lg font-medium text-white flex items-center gap-2">
             Quadro Operacional
           </h3>
           <div className="flex flex-wrap items-center gap-3">
             <div className="flex items-center gap-2 bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-2 py-1">
                <Filter className="size-4 text-[#6F6F6F] ml-1" />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-transparent text-xs font-medium text-[#A1A1AA] focus:outline-none focus:text-white py-1">
                  <option value="all" className="bg-[#111113] text-white">Status: Todos</option>
                  <option value="pendente" className="bg-[#111113] text-white">Pendente</option>
                  <option value="em_andamento" className="bg-[#111113] text-white">Em Andamento</option>
                  <option value="concluida" className="bg-[#111113] text-white">Concluída</option>
                </select>
                <div className="w-px h-4 bg-[rgba(255,255,255,0.1)] mx-1"></div>
                <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="bg-transparent text-xs font-medium text-[#A1A1AA] focus:outline-none focus:text-white py-1">
                  <option value="all" className="bg-[#111113] text-white">Prioridade: Todas</option>
                  <option value="baixa" className="bg-[#111113] text-white">Baixa</option>
                  <option value="media" className="bg-[#111113] text-white">Média</option>
                  <option value="alta" className="bg-[#111113] text-white">Alta</option>
                  <option value="critica" className="bg-[#111113] text-white">Crítica</option>
                </select>
             </div>

             <div className="flex bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl p-1">
                <button onClick={() => setViewMode('list')} className={cn("p-1.5 rounded-lg transition-colors", viewMode === 'list' ? "bg-[rgba(255,255,255,0.08)] text-white" : "text-[#71717A] hover:text-white")} title="Visualização em Lista">
                  <LayoutList className="size-4" />
                </button>
                <button onClick={() => setViewMode('grid')} className={cn("p-1.5 rounded-lg transition-colors", viewMode === 'grid' ? "bg-[rgba(255,255,255,0.08)] text-white" : "text-[#71717A] hover:text-white")} title="Visualização em Grid">
                  <Grid className="size-4" />
                </button>
                <button onClick={() => setViewMode('kanban')} className={cn("p-1.5 rounded-lg transition-colors", viewMode === 'kanban' ? "bg-[rgba(255,255,255,0.08)] text-white" : "text-[#71717A] hover:text-white")} title="Visualização Kanban">
                  <Columns className="size-4" />
                </button>
             </div>
           </div>
         </div>

         {displayTasks.length === 0 ? (
           <div className="flex flex-col items-center justify-center text-center py-24 border border-dashed border-[#202020] rounded-2xl gap-4 bg-[#111113]/50">
             <CheckCircle2 className="size-10 text-[#202020]" />
             <div className="text-[#6F6F6F] text-sm">
               {filter === 'hoje' ? "Nenhuma tarefa para hoje. Você está livre!" : "Nenhuma tarefa encontrada para os filtros selecionados."}
             </div>
             <button onClick={() => handleOpenModal()} className="mt-2 text-rose-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
               <Plus className="size-3" /> Criar nova tarefa
             </button>
           </div>
         ) : viewMode === 'list' ? (
           <div className="flex flex-col gap-3">
             {displayTasks.map(task => renderTaskCard(task, false))}
           </div>
         ) : viewMode === 'grid' ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {displayTasks.map(task => renderTaskCard(task, true))}
           </div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto pb-4">
             {['pendente', 'em_andamento', 'concluida'].map(status => (
               <div key={status} className="flex flex-col gap-3 min-w-[300px]">
                 <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] pb-2 mb-2">
                   <h4 className="text-sm font-bold text-[#A1A1AA] uppercase tracking-widest flex items-center gap-2">
                     {status === 'pendente' && <Clock className="size-4 text-amber-500" />}
                     {status === 'em_andamento' && <PlayCircle className="size-4 text-blue-500" />}
                     {status === 'concluida' && <CheckCircle2 className="size-4 text-emerald-500" />}
                     {status.replace('_', ' ')}
                   </h4>
                   <span className="bg-[#111113] border border-[rgba(255,255,255,0.06)] text-xs text-[#6F6F6F] px-2 py-0.5 rounded-full">
                     {displayTasks.filter(t => t.status === status).length}
                   </span>
                 </div>
                 <div className="flex flex-col gap-3">
                   {displayTasks.filter(t => t.status === status).map(task => renderTaskCard(task, true))}
                 </div>
               </div>
             ))}
           </div>
         )}
      </div>

      {/* MODAL DE TAREFA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#09090B] border border-[rgba(255,255,255,0.1)] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 md:px-8 py-5 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between shrink-0 bg-[#111113]">
               <h3 className="text-xs font-bold text-white uppercase tracking-[0.15em]">{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-[#6F6F6F] hover:text-white transition-colors"><X className="size-5" /></button>
            </div>
            <div className="p-6 md:p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
              <div>
                <label className="text-[10px] text-[#6F6F6F] uppercase tracking-widest font-bold mb-3 block">O que precisa ser feito?</label>
                <div className="flex gap-2 items-center border-b border-[rgba(255,255,255,0.1)] pb-2 focus-within:border-rose-500 transition-colors">
                  <input autoFocus value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full bg-transparent text-xl font-medium text-white focus:outline-none placeholder:text-[#333]" placeholder="Título da tarefa..." />
                  <VoiceRecordButton onTranscript={(t) => setTaskForm(prev => ({...prev, title: prev.title ? `${prev.title} ${t}` : t}))} />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] text-[#6F6F6F] uppercase tracking-widest font-bold mb-3 block">Detalhes (Opcional)</label>
                <div className="relative">
                  <textarea rows={3} value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 pr-12 text-sm font-medium text-white focus:outline-none focus:border-rose-500 transition-colors placeholder:text-[#444] resize-none" placeholder="Adicione notas ou instruções para esta tarefa..."></textarea>
                  <div className="absolute top-2 right-2">
                    <VoiceRecordButton onTranscript={(t) => setTaskForm(prev => ({...prev, description: prev.description ? `${prev.description}\n${t}` : t}))} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] text-[#6F6F6F] uppercase tracking-widest font-bold mb-3 block">Data Limite</label>
                  <input type="date" value={taskForm.deadline} onChange={e => setTaskForm({...taskForm, deadline: e.target.value})} className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-rose-500 transition-colors [color-scheme:dark]" />
                </div>
                <div>
                  <label className="text-[10px] text-[#6F6F6F] uppercase tracking-widest font-bold mb-3 block">Lembrete (Hora)</label>
                  <input type="time" value={taskForm.due_time} onChange={e => setTaskForm({...taskForm, due_time: e.target.value})} className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-rose-500 transition-colors [color-scheme:dark]" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] text-[#6F6F6F] uppercase tracking-widest font-bold mb-3 block">Status</label>
                  <select value={taskForm.status} onChange={e => setTaskForm({...taskForm, status: e.target.value})} className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-rose-500 transition-colors">
                    <option value="pendente" className="bg-[#111113] text-white">Pendente</option>
                    <option value="em_andamento" className="bg-[#111113] text-white">Em Andamento</option>
                    <option value="concluida" className="bg-[#111113] text-white">Concluída</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#6F6F6F] uppercase tracking-widest font-bold mb-3 block">Prioridade</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value})} className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-rose-500 transition-colors">
                    <option value="baixa" className="bg-[#111113] text-white">Baixa</option>
                    <option value="media" className="bg-[#111113] text-white">Média</option>
                    <option value="alta" className="bg-[#111113] text-white">Alta</option>
                    <option value="critica" className="bg-[#111113] text-white">Crítica</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] text-[#6F6F6F] uppercase tracking-widest font-bold mb-3 block">Categoria</label>
                  <input value={taskForm.category} onChange={e => setTaskForm({...taskForm, category: e.target.value})} className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-rose-500 transition-colors placeholder:text-[#444]" placeholder="Ex: Projeto XPTO" />
                </div>
                <div>
                  <label className="text-[10px] text-[#6F6F6F] uppercase tracking-widest font-bold mb-3 block">Responsável</label>
                  <input value={taskForm.responsible} onChange={e => setTaskForm({...taskForm, responsible: e.target.value})} className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-rose-500 transition-colors placeholder:text-[#444]" placeholder="Nome do membro da equipe" />
                </div>
              </div>
            </div>
            <div className="px-6 md:px-8 py-5 bg-[#111113] border-t border-[rgba(255,255,255,0.06)] flex items-center justify-end gap-4 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="text-[11px] font-bold text-[#6F6F6F] hover:text-white uppercase tracking-widest px-4 py-2 transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={!taskForm.title} className="text-[11px] font-bold tracking-widest bg-rose-500 text-white uppercase px-6 py-2.5 rounded-lg hover:bg-rose-600 transition-colors disabled:opacity-50 flex items-center gap-2">
                Salvar Tarefa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
