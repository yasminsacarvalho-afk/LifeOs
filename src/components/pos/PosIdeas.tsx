import { useState } from "react";
import { usePosIdeas } from "@/hooks/use-pos-ideas";
import { Plus, Trash2, Lightbulb, Zap, Rocket, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PosIdeas() {
  const { ideas, loading, addIdea, updateIdea, deleteIdea } = usePosIdeas();
  const [isCreating, setIsCreating] = useState(false);
  const [newIdea, setNewIdea] = useState({
    title: "", category: "negocios", priority: "media", potential: "alto", complexity: "media", status: "capturada"
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdea.title) return;
    await addIdea(newIdea as any);
    setIsCreating(false);
    setNewIdea({ ...newIdea, title: "" });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'media': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'baixa': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <div className="p-4 md:p-10 max-w-[1600px] mx-auto flex flex-col gap-6 md:gap-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Sistema de Ideias</h2>
          <p className="text-[#A1A1AA] text-sm mt-1">Capture insights, estruture o potencial e mapeie o nível de esforço.</p>
        </div>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 bg-yellow-500 text-yellow-950 px-4 py-2 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(234,179,8,0.2)] hover:bg-yellow-400 transition-colors"
        >
          <Lightbulb className="size-4" /> Capturar Ideia
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div className="md:col-span-5">
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Título da Ideia / Brainstorm</label>
              <input 
                type="text" required value={newIdea.title} onChange={e => setNewIdea({...newIdea, title: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg px-4 py-2.5 text-white focus:border-yellow-500 focus:outline-none transition-colors"
                placeholder="O que passou pela sua cabeça?"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Categoria</label>
              <select 
                value={newIdea.category} onChange={e => setNewIdea({...newIdea, category: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg px-4 py-2.5 text-white focus:border-yellow-500 focus:outline-none transition-colors"
              >
                <option value="negocios">Negócios</option>
                <option value="produtos">Produtos</option>
                <option value="conteudo">Conteúdo</option>
                <option value="estudos">Estudos</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Potencial</label>
              <select 
                value={newIdea.potential} onChange={e => setNewIdea({...newIdea, potential: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg px-4 py-2.5 text-white focus:border-yellow-500 focus:outline-none transition-colors"
              >
                <option value="baixo">Baixo (1x)</option>
                <option value="medio">Médio (10x)</option>
                <option value="alto">Alto (100x)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Complexidade</label>
              <select 
                value={newIdea.complexity} onChange={e => setNewIdea({...newIdea, complexity: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg px-4 py-2.5 text-white focus:border-yellow-500 focus:outline-none transition-colors"
              >
                <option value="baixa">Baixa (Dias)</option>
                <option value="media">Média (Semanas)</option>
                <option value="alta">Alta (Meses)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Prioridade</label>
              <select 
                value={newIdea.priority} onChange={e => setNewIdea({...newIdea, priority: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg px-4 py-2.5 text-white focus:border-yellow-500 focus:outline-none transition-colors"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#A1A1AA] hover:bg-[#1A1A1E]">Descartar</button>
            <button type="submit" className="px-4 py-2 rounded-lg text-sm font-bold bg-yellow-500 text-yellow-950 hover:bg-yellow-400">Capturar Ideia</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center p-10"><div className="size-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div></div>
      ) : ideas.length === 0 ? (
        <div className="text-center p-12 bg-[#111113] border border-dashed border-[rgba(255,255,255,0.06)] rounded-2xl">
          <Lightbulb className="size-12 text-[#71717A] mx-auto mb-4" />
          <p className="text-[#A1A1AA]">Sua caixa de ideias está vazia. O que você vai criar hoje?</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ideas.map(idea => (
            <div key={idea.id} className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 hover:border-[rgba(255,255,255,0.1)] transition-colors group flex flex-col relative overflow-hidden">
              {idea.potential === 'alto' && (
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                   <Rocket className="size-16 text-yellow-500" />
                 </div>
              )}
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <span className="text-[10px] uppercase font-bold text-[#A1A1AA] border border-[rgba(255,255,255,0.1)] px-2 py-0.5 rounded-md bg-[#1A1A1E]">
                  {idea.category}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => updateIdea(idea.id, { status: idea.status === 'concluida' ? 'capturada' : 'concluida' })} className="text-[#71717A] hover:text-emerald-500 transition-colors">
                    {idea.status === 'concluida' ? <CheckCircle2 className="size-4 text-emerald-500" /> : <CheckCircle2 className="size-4" />}
                  </button>
                  <button onClick={() => deleteIdea(idea.id)} className="opacity-0 group-hover:opacity-100 text-[#71717A] hover:text-rose-500 transition-all">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              
              <h3 className={cn("font-bold text-lg tracking-tight mb-6 relative z-10", idea.status === 'concluida' ? "text-[#71717A] line-through" : "text-white")}>
                {idea.title}
              </h3>

              <div className="mt-auto grid grid-cols-2 gap-3 relative z-10">
                <div className={cn("flex flex-col p-2 rounded-lg border", getPriorityColor(idea.priority || 'baixa'))}>
                   <span className="text-[9px] uppercase tracking-widest font-bold opacity-70 mb-1">Prioridade</span>
                   <span className="text-sm font-semibold capitalize">{idea.priority}</span>
                </div>
                <div className="flex flex-col p-2 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#1A1A1E]">
                   <span className="text-[9px] uppercase tracking-widest font-bold text-[#71717A] mb-1">Complexidade</span>
                   <span className="text-sm font-semibold text-[#A1A1AA] capitalize">{idea.complexity}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
