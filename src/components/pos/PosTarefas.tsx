import { useState } from "react";
import { usePosTasks } from "@/hooks/use-pos-tasks";
import { 
  CheckCircle2, Plus, X, Trash2, Edit2, Clock, AlertCircle, PlayCircle, Target
} from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function PosTarefas() {
  const { tasks, addTask, updateTask, deleteTask } = usePosTasks();
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

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 md:p-8 flex flex-col gap-8 pb-32">
      
      {/* Header and KPIs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white mb-2">Central de Tarefas</h2>
          <p className="text-[#A1A1AA] text-sm">Gerencie suas entregas, projetos e prioridades operacionais.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors shadow-lg shadow-rose-500/20 shrink-0">
          <Plus className="size-4" /> Criar Tarefa
        </button>
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
      <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-white">Progresso Geral</span>
          <span className="text-sm font-bold text-rose-500">{percentConcluido}% concluído</span>
        </div>
        <div className="w-full h-3 bg-[#1A1A1E] rounded-full overflow-hidden flex">
          <div className="h-full bg-rose-500 transition-all duration-1000 ease-out" style={{ width: `${percentConcluido}%` }}></div>
          <div className="h-full bg-blue-500 transition-all duration-1000 ease-out" style={{ width: `${totalActive.length > 0 ? (emAndamento.length / totalActive.length)*100 : 0}%` }}></div>
          <div className="h-full bg-rose-500/30 transition-all duration-1000 ease-out" style={{ width: `${totalActive.length > 0 ? (atrasadas.length / totalActive.length)*100 : 0}%` }}></div>
        </div>
        <p className="text-xs text-[#71717A]">
          {atrasadas.length > 0 ? `Você tem ${atrasadas.length} tarefas precisando de atenção imediata.` : "Seu cronograma está em dia. Continue assim."}
        </p>
      </div>

      {/* Task List */}
      <div className="flex flex-col gap-3">
         <h3 className="text-lg font-medium text-white mb-2">Quadro Operacional</h3>
         {tasks.length === 0 ? (
           <div className="flex flex-col items-center justify-center text-center py-24 border border-dashed border-[#202020] rounded-2xl gap-4 bg-[#111113]/50">
             <CheckCircle2 className="size-10 text-[#202020]" />
             <div className="text-[#6F6F6F] text-sm">Nenhuma tarefa encontrada.</div>
             <button onClick={() => handleOpenModal()} className="mt-2 text-rose-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
               <Plus className="size-3" /> Criar primeira tarefa
             </button>
           </div>
         ) : (
           tasks.map(task => (
             <div key={task.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl hover:border-rose-500/30 transition-colors gap-4">
               <div className="flex items-start gap-4 w-full sm:w-auto">
                 <button onClick={() => updateTask(task.id, { status: task.status === 'concluida' ? 'pendente' : 'concluida' })} className="mt-1 text-[#4A4A4A] hover:text-emerald-500 transition-colors shrink-0">
                   <CheckCircle2 className={cn("size-6", task.status === 'concluida' && "text-emerald-500")} />
                 </button>
                 <div className="flex-1">
                   <h4 className={cn("text-base font-medium transition-colors", task.status === 'concluida' ? "line-through text-[#6F6F6F]" : "text-white")}>{task.title}</h4>
                   <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-[#6F6F6F] mt-2 tracking-wide">
                      {task.deadline && <span className={cn(getSafeDate(task.deadline)! < new Date() && !isToday(getSafeDate(task.deadline)!) && task.status !== 'concluida' ? "text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded" : "bg-[#1A1A1E] px-2 py-0.5 rounded")}>{format(getSafeDate(task.deadline)!, "dd MMM yyyy", {locale: ptBR})} {task.due_time && `às ${task.due_time.substring(0,5)}`}</span>}
                      {task.priority && <span className={cn("px-2 py-0.5 rounded uppercase font-bold", task.priority === 'alta' ? 'bg-amber-500/10 text-amber-500' : task.priority === 'critica' ? 'bg-rose-500/10 text-rose-500' : 'bg-[#1A1A1E]')}>{task.priority}</span>}
                      {task.category && <span className="bg-[#1A1A1E] px-2 py-0.5 rounded">{task.category}</span>}
                      {task.responsible && <span className="bg-[#1A1A1E] px-2 py-0.5 rounded">@{task.responsible}</span>}
                      <span className="uppercase font-bold tracking-widest">{task.status.replace('_', ' ')}</span>
                   </div>
                 </div>
               </div>
               <div className="flex items-center gap-2 justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                 <button onClick={() => handleOpenModal(task)} className="p-2.5 text-[#6F6F6F] hover:text-white bg-[#1A1A1E] hover:bg-[#27272A] rounded-lg transition-colors"><Edit2 className="size-4" /></button>
                 <button onClick={() => handleDelete(task.id)} className="p-2.5 text-[#6F6F6F] hover:text-rose-500 bg-[#1A1A1E] hover:bg-[#27272A] rounded-lg transition-colors"><Trash2 className="size-4" /></button>
               </div>
             </div>
           ))
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
                <input autoFocus value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full bg-transparent border-b border-[rgba(255,255,255,0.1)] pb-2 text-xl font-medium text-white focus:outline-none focus:border-rose-500 transition-colors placeholder:text-[#333]" placeholder="Título da tarefa..." />
              </div>
              
              <div>
                <label className="text-[10px] text-[#6F6F6F] uppercase tracking-widest font-bold mb-3 block">Detalhes (Opcional)</label>
                <textarea rows={2} value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-rose-500 transition-colors placeholder:text-[#444] resize-none" placeholder="Adicione notas ou instruções para esta tarefa..."></textarea>
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
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluida">Concluída</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#6F6F6F] uppercase tracking-widest font-bold mb-3 block">Prioridade</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value})} className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-rose-500 transition-colors">
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
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
