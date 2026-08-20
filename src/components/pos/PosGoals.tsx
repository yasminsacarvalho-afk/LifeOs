import { useState } from "react";
import { usePosGoals } from "@/hooks/use-pos-goals";
import {
  Target, Plus, Trash2, Edit2, Crosshair, Flag, CheckCircle2, Circle, AlertCircle, Calendar, Trophy, X
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function PosGoals() {
  const { goals, addGoal, updateGoal, deleteGoal, loading } = usePosGoals();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalData, setEditGoalData] = useState<any>(null);
  
  const [newGoal, setNewGoal] = useState({
    title: "",
    type: "mensal",
    reason: "",
    deadline: "",
    progress_percentage: 0,
    status: "ativa",
    target_value: 0,
    unit: "",
    description: "",
    icon: "Target",
    color: "rose"
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.title) return;
    const payload: any = { ...newGoal };
    if (!payload.target_value) delete payload.target_value;
    if (!payload.unit) delete payload.unit;
    await addGoal(payload);
    setIsCreating(false);
    setNewGoal({...newGoal, title: "", reason: "", deadline: "", progress_percentage: 0, target_value: 0, unit: "", description: "", icon: "Target", color: "rose"});
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoalId || !editGoalData) return;
    const payload: any = { ...editGoalData };
    if (!payload.deadline) delete payload.deadline;
    await updateGoal(editingGoalId, payload);
    setEditingGoalId(null);
  };

  const getTypeLabel = (type: string) => {
    switch(type?.toLowerCase()) {
      case 'anual': return 'Meta Anual';
      case 'mensal': return 'Meta Mensal';
      case 'diaria': return 'Meta Diária';
      case 'leitura': return 'Meta de Leitura';
      case 'habito': return 'Meta de Hábitos';
      case 'aquisição':
      case 'aquisicao':
      case 'aquisição (compras)':
        return 'Aquisição';
      default: return type || 'Objetivo Estratégico';
    }
  };

  return (
    <div className="p-4 md:p-10 max-w-[1600px] mx-auto flex flex-col gap-6 md:gap-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Target className="size-6 text-rose-500" /> Centro Estratégico de Metas
          </h2>
          <p className="text-[#A1A1AA] text-sm mt-1">Defina seus objetivos macro e conecte suas rotinas operacionais.</p>
        </div>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(79,70,229,0.2)] hover:bg-rose-500 transition-colors"
        >
          <Plus className="size-4" /> Nova Meta
        </button>
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 animate-in fade-in" onClick={() => setIsCreating(false)}>
          <div className="w-full md:max-w-4xl max-h-[90vh] bg-[#111113] border border-[rgba(255,255,255,0.06)] md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 md:zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="p-5 md:p-6 border-b border-[rgba(255,255,255,0.06)] flex justify-between items-center bg-[#09090B]/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <Trophy className="size-5 text-rose-500" /> Estruturar Nova Meta
               </h3>
               <button type="button" onClick={() => setIsCreating(false)} className="p-2 bg-[#1A1A1E] hover:bg-rose-500/20 text-[#A1A1AA] hover:text-rose-500 rounded-full transition-colors">
                 <X className="size-5" />
               </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 pb-safe">
              <form onSubmit={handleCreate}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Título da Meta</label>
                    <input required type="text" value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none" placeholder="Ex: Ler 24 livros no ano" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Categoria / Tipo</label>
                    <input 
                      type="text" 
                      list="goal-types"
                      value={newGoal.type} 
                      onChange={e => setNewGoal({...newGoal, type: e.target.value})} 
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none"
                      placeholder="Ex: Saúde, Financeiro, Anual..."
                    />
                    <datalist id="goal-types">
                      <option value="Estratégico (Anual)" />
                      <option value="Tático (Mensal)" />
                      <option value="Operacional (Diário)" />
                      <option value="Saúde & Corpo" />
                      <option value="Intelecto & Estudos" />
                      <option value="Finanças" />
                      <option value="Carreira" />
                      <option value="Networking" />
                      <option value="Aquisição (Compras)" />
                    </datalist>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Deadline (Prazo Fim)</label>
                    <input type="date" value={newGoal.deadline} onChange={e => setNewGoal({...newGoal, deadline: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none" />
                  </div>
                  <div className="md:col-span-4">
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Propósito (Por que isso é importante?)</label>
                    <input type="text" value={newGoal.reason} onChange={e => setNewGoal({...newGoal, reason: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none" placeholder="Qual o impacto real de alcançar essa meta?" />
                  </div>
                  <div className="md:col-span-4">
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Descrição Detalhada</label>
                    <textarea value={newGoal.description} onChange={e => setNewGoal({...newGoal, description: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none min-h-[80px]" placeholder="Mais detalhes sobre a execução da meta..."></textarea>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Alvo Numérico (Opcional)</label>
                    <input type="number" min="0" value={newGoal.target_value || ''} onChange={e => setNewGoal({...newGoal, target_value: Number(e.target.value)})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none" placeholder="Ex: 10000" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Unidade</label>
                    <input type="text" value={newGoal.unit || ''} onChange={e => setNewGoal({...newGoal, unit: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none" placeholder="Ex: R$, Km, Livros..." />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Ícone</label>
                    <input type="text" value={newGoal.icon || ''} onChange={e => setNewGoal({...newGoal, icon: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none" placeholder="Ex: Target, Activity..." />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Cor Tema</label>
                    <select value={newGoal.color || 'rose'} onChange={e => setNewGoal({...newGoal, color: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none">
                      <option value="rose">Rose (Padrão)</option>
                      <option value="emerald">Verde</option>
                      <option value="blue">Azul</option>
                      <option value="amber">Amarelo</option>
                      <option value="indigo">Índigo</option>
                      <option value="cyan">Ciano</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col-reverse md:flex-row justify-end gap-3 mt-8 pt-6 border-t border-[rgba(255,255,255,0.04)]">
                  <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-4 md:py-3 rounded-xl text-sm font-medium text-[#A1A1AA] hover:bg-[#1A1A1E]">Cancelar</button>
                  <button type="submit" className="px-6 py-4 md:py-3 rounded-xl text-sm font-bold bg-rose-500 text-white hover:bg-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.3)]">Cravar Meta</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {editingGoalId && editGoalData && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 animate-in fade-in" onClick={() => setEditingGoalId(null)}>
          <div className="w-full md:max-w-4xl max-h-[90vh] bg-[#111113] border border-[rgba(255,255,255,0.06)] md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 md:zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="p-5 md:p-6 border-b border-[rgba(255,255,255,0.06)] flex justify-between items-center bg-[#09090B]/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <Edit2 className="size-5 text-rose-500" /> Editando Meta
               </h3>
               <button type="button" onClick={() => setEditingGoalId(null)} className="p-2 bg-[#1A1A1E] hover:bg-rose-500/20 text-[#A1A1AA] hover:text-rose-500 rounded-full transition-colors">
                 <X className="size-5" />
               </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 pb-safe">
              <form onSubmit={handleUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Título</label>
                    <input type="text" value={editGoalData.title} onChange={e => setEditGoalData({...editGoalData, title: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Progresso (%)</label>
                    <input type="number" min="0" max="100" value={editGoalData.progress_percentage} onChange={e => setEditGoalData({...editGoalData, progress_percentage: Number(e.target.value)})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Status</label>
                    <select value={editGoalData.status} onChange={e => setEditGoalData({...editGoalData, status: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500">
                      <option value="ativa">Em Andamento</option>
                      <option value="concluida">Concluída</option>
                      <option value="pausada">Pausada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                  <div className="md:col-span-4">
                     <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Propósito (Razão)</label>
                     <input type="text" value={editGoalData.reason || ''} onChange={e => setEditGoalData({...editGoalData, reason: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500" />
                  </div>
                  <div className="md:col-span-4">
                     <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Descrição Detalhada</label>
                     <textarea value={editGoalData.description || ''} onChange={e => setEditGoalData({...editGoalData, description: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500 min-h-[80px]"></textarea>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Alvo</label>
                    <input type="number" min="0" value={editGoalData.target_value || ''} onChange={e => setEditGoalData({...editGoalData, target_value: Number(e.target.value)})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Unidade</label>
                    <input type="text" value={editGoalData.unit || ''} onChange={e => setEditGoalData({...editGoalData, unit: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Cor Tema</label>
                    <select value={editGoalData.color || 'rose'} onChange={e => setEditGoalData({...editGoalData, color: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500">
                      <option value="rose">Rose</option>
                      <option value="emerald">Verde</option>
                      <option value="blue">Azul</option>
                      <option value="amber">Amarelo</option>
                      <option value="indigo">Índigo</option>
                      <option value="cyan">Ciano</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col-reverse md:flex-row justify-end gap-3 mt-8 pt-6 border-t border-[rgba(255,255,255,0.04)]">
                  <button type="button" onClick={() => setEditingGoalId(null)} className="px-6 py-4 md:py-3 rounded-xl text-sm font-medium text-[#A1A1AA] hover:bg-[#1A1A1E]">Cancelar</button>
                  <button type="submit" className="px-6 py-4 md:py-3 rounded-xl text-sm font-bold bg-rose-500 text-white hover:bg-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.3)]">Salvar Alterações</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-10"><div className="size-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(goal => (
            <div key={goal.id} className={cn(
              "bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-3xl p-6 flex flex-col group transition-all relative overflow-hidden",
              goal.status === 'concluida' ? "border-emerald-500/30" : "hover:border-[rgba(255,255,255,0.1)]"
            )}>
              <div className="flex justify-between items-start mb-4">
                <span className={cn(
                  "text-[10px] uppercase font-bold px-2 py-0.5 rounded-md",
                  goal.status === 'concluida' ? "bg-emerald-500/10 text-emerald-500" : "bg-[#1A1A1E] text-[#A1A1AA]"
                )}>
                  {getTypeLabel(goal.type)}
                </span>
                
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingGoalId(goal.id); setEditGoalData(goal); }} className="text-[#71717A] hover:text-rose-400 p-1"><Edit2 className="size-4" /></button>
                  {goal.status !== 'concluida' && (
                     <button onClick={() => updateGoal(goal.id, { status: 'concluida', progress_percentage: 100 })} className="text-[#71717A] hover:text-emerald-500 p-1"><CheckCircle2 className="size-4" /></button>
                  )}
                  <button onClick={() => deleteGoal(goal.id)} className="text-[#71717A] hover:text-rose-500 p-1"><Trash2 className="size-4" /></button>
                </div>
              </div>

              <h3 className={cn("text-xl font-bold tracking-tight mb-2", goal.status === 'concluida' ? "text-[#A1A1AA] line-through" : "text-white")}>{goal.title}</h3>
              {goal.reason && <p className="text-sm text-[#71717A] mb-6 line-clamp-2">{goal.reason}</p>}
              
              <div className="mt-auto">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] mb-2">
                  <span>Progresso {goal.target_value ? `(${((goal.progress_percentage/100) * goal.target_value).toFixed(1)} / ${goal.target_value} ${goal.unit || ''})` : ''}</span>
                  <span className={goal.progress_percentage === 100 ? "text-emerald-500" : `text-${goal.color || 'rose'}-400`}>{goal.progress_percentage}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#1A1A1E] rounded-full overflow-hidden">
                  <div className={cn("h-full transition-all duration-1000", goal.progress_percentage === 100 ? "bg-emerald-500" : `bg-${goal.color || 'rose'}-500`)} style={{width: `${goal.progress_percentage}%`}}></div>
                </div>
                
                {goal.deadline && (
                   <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.04)] flex items-center gap-2 text-[#71717A] text-[11px] font-bold uppercase tracking-widest">
                     <Calendar className="size-3" /> Deadline: {format(parseISO(goal.deadline), 'dd MMM yyyy', {locale: ptBR})}
                   </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
