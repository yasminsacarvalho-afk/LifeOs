import { useState } from "react";
import { usePosGoals } from "@/hooks/use-pos-goals";
import {
  ShoppingCart, Plus, Trash2, Edit2, Link as LinkIcon, ThumbsUp, ThumbsDown, CreditCard, Store, CheckCircle2, Target, X, PlusCircle, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Supplier {
  id: string;
  name: string;
  link: string;
  pros: string[];
  cons: string[];
}

interface AcquisitionDetails {
  suppliers: Supplier[];
  paymentMethods: string;
  imageUrl?: string;
}

export function PosAcquisitions() {
  const { goals, addGoal, updateGoal, deleteGoal, loading } = usePosGoals();
  const acquisitions = goals.filter(g => g.type.toLowerCase() === 'aquisicao' || g.type.toLowerCase() === 'aquisição' || g.type.toLowerCase() === 'aquisição (compras)');
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const defaultDetails: AcquisitionDetails = {
    suppliers: [],
    paymentMethods: "",
    imageUrl: ""
  };
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    target_value: 0,
    progress_percentage: 0,
    status: "ativa",
    details: { ...defaultDetails }
  });

  const [newSupplier, setNewSupplier] = useState<Supplier>({ id: "", name: "", link: "", pros: [], cons: [] });
  const [newPro, setNewPro] = useState("");
  const [newCon, setNewCon] = useState("");

  const getDetails = (milestones: string | null): AcquisitionDetails => {
    try {
      if (!milestones) return defaultDetails;
      const parsed = JSON.parse(milestones);
      // Migrate old data if necessary
      if (!parsed.suppliers) {
        parsed.suppliers = [];
        if (parsed.links && parsed.links.length > 0) {
          parsed.suppliers.push({
            id: Date.now().toString(),
            name: "Opção Padrão",
            link: parsed.links[0],
            pros: parsed.pros || [],
            cons: parsed.cons || []
          });
        }
      }
      return { ...defaultDetails, ...parsed };
    } catch {
      return defaultDetails;
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;
    
    await addGoal({
      title: formData.title,
      type: "Aquisição",
      description: formData.description,
      target_value: formData.target_value,
      progress_percentage: formData.progress_percentage,
      status: formData.status,
      milestones: JSON.stringify(formData.details),
      icon: "ShoppingCart",
      color: "emerald",
      reason: "",
      deadline: null,
      unit: "R$"
    });
    
    setIsCreating(false);
    setFormData({ title: "", description: "", target_value: 0, progress_percentage: 0, status: "ativa", details: { ...defaultDetails } });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    
    await updateGoal(editingId, {
      title: formData.title,
      description: formData.description,
      target_value: formData.target_value,
      progress_percentage: formData.progress_percentage,
      status: formData.status,
      milestones: JSON.stringify(formData.details)
    });
    
    setEditingId(null);
  };

  const handleAddSupplier = () => {
    if (!newSupplier.name) return;
    setFormData(prev => ({
      ...prev,
      details: {
        ...prev.details,
        suppliers: [...prev.details.suppliers, { ...newSupplier, id: Date.now().toString() }]
      }
    }));
    setNewSupplier({ id: "", name: "", link: "", pros: [], cons: [] });
  };

  const removeSupplier = (id: string) => {
    setFormData(prev => ({
      ...prev,
      details: {
        ...prev.details,
        suppliers: prev.details.suppliers.filter(s => s.id !== id)
      }
    }));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="p-4 md:p-10 max-w-[1600px] mx-auto flex flex-col gap-6 md:gap-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShoppingCart className="size-6 text-emerald-500" /> Painel de Compras (Wishlist)
          </h2>
          <p className="text-[#A1A1AA] text-sm mt-1">Gerencie suas aquisições, compare fornecedores e organize o orçamento.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ title: "", description: "", target_value: 0, progress_percentage: 0, status: "ativa", details: { ...defaultDetails } });
            setIsCreating(true);
          }}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:bg-emerald-500 transition-colors"
        >
          <Plus className="size-4" /> Novo Desejo
        </button>
      </div>

      {(isCreating || editingId) && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 animate-in fade-in">
          <div className="w-full md:max-w-5xl max-h-[90vh] bg-[#111113] border border-[rgba(255,255,255,0.06)] md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 md:zoom-in-95">
            <div className="p-5 md:p-6 border-b border-[rgba(255,255,255,0.06)] flex justify-between items-center bg-[#09090B]/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 {editingId ? <Edit2 className="size-5 text-emerald-500" /> : <PlusCircle className="size-5 text-emerald-500" />} 
                 {editingId ? "Editando Item" : "Novo Item na Wishlist"}
               </h3>
               <button type="button" onClick={() => { setIsCreating(false); setEditingId(null); }} className="p-2 bg-[#1A1A1E] hover:bg-emerald-500/20 text-[#A1A1AA] hover:text-emerald-500 rounded-full transition-colors">
                 <X className="size-5" />
               </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 pb-safe">
              <form id="acquisitions-form" onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-8">
                
                {/* Seção 1: Dados Gerais do Item */}
                <div className="bg-[#1A1A1E]/30 p-6 rounded-2xl border border-[rgba(255,255,255,0.04)] space-y-6">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[rgba(255,255,255,0.06)] pb-3">
                    <Target className="size-4 text-emerald-500" /> Dados Principais do Item
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">O que você quer comprar?</label>
                        <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none" placeholder="Ex: iPhone 15 Pro 256GB" />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Especificações Necessárias (Resumo)</label>
                        <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none min-h-[100px]" placeholder="Ex: Precisa ser titânio natural, lacrado e com nota fiscal."></textarea>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Valor Disposto a Pagar (R$)</label>
                          <input type="number" value={formData.target_value} onChange={e => setFormData({...formData, target_value: Number(e.target.value)})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none" />
                        </div>
                        <div>
                          <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Já Guardado (%)</label>
                          <input type="number" min="0" max="100" value={formData.progress_percentage} onChange={e => setFormData({...formData, progress_percentage: Number(e.target.value)})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block flex items-center gap-1"><CreditCard className="size-3"/> Formas de Pagamento (Idéias)</label>
                        <input type="text" value={formData.details.paymentMethods} onChange={e => setFormData({...formData, details: {...formData.details, paymentMethods: e.target.value}})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none" placeholder="Ex: Cartão 12x sem juros" />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block flex items-center gap-1"><LinkIcon className="size-3"/> Link da Imagem do Produto (Opcional)</label>
                        <input type="text" value={formData.details.imageUrl || ""} onChange={e => setFormData({...formData, details: {...formData.details, imageUrl: e.target.value}})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none" placeholder="Ex: https://..." />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seção 2: Fornecedores e Links */}
                <div className="bg-[#1A1A1E]/30 p-6 rounded-2xl border border-[rgba(255,255,255,0.04)] space-y-6">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[rgba(255,255,255,0.06)] pb-3">
                    <Store className="size-4 text-emerald-500" /> Locais de Compra & Fornecedores (Comparação)
                  </h4>
                  
                  {/* Adicionar Fornecedor */}
                  <div className="bg-[#111113] p-4 rounded-xl border border-[rgba(255,255,255,0.06)] space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Nome do Fornecedor / Loja</label>
                        <input type="text" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none" placeholder="Ex: MercadoLivre - Loja Oficial" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Link do Produto</label>
                        <input type="text" value={newSupplier.link} onChange={e => setNewSupplier({...newSupplier, link: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none" placeholder="https://..." />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Pros Input */}
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold mb-1 block flex items-center gap-1"><ThumbsUp className="size-3"/> Adicionar Prós (nesta loja)</label>
                        <div className="flex gap-2">
                          <input type="text" value={newPro} onChange={e => setNewPro(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); if(newPro) { setNewSupplier(prev => ({...prev, pros: [...prev.pros, newPro]})); setNewPro(""); } } }} className="flex-1 bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" placeholder="Ex: Frete Grátis..." />
                          <button type="button" onClick={() => { if(newPro) { setNewSupplier(prev => ({...prev, pros: [...prev.pros, newPro]})); setNewPro(""); } }} className="px-3 py-2 bg-emerald-500/20 text-emerald-500 rounded-lg text-sm font-bold">+</button>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {newSupplier.pros.map((p, idx) => (
                            <li key={idx} className="flex justify-between items-center text-xs bg-emerald-500/5 px-2 py-1.5 rounded border border-emerald-500/10 text-emerald-400">
                              <span>{p}</span><button type="button" onClick={() => setNewSupplier(prev => ({...prev, pros: prev.pros.filter((_, i) => i !== idx)}))}><X className="size-3"/></button>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {/* Cons Input */}
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-rose-500 font-bold mb-1 block flex items-center gap-1"><ThumbsDown className="size-3"/> Adicionar Contras (nesta loja)</label>
                        <div className="flex gap-2">
                          <input type="text" value={newCon} onChange={e => setNewCon(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); if(newCon) { setNewSupplier(prev => ({...prev, cons: [...prev.cons, newCon]})); setNewCon(""); } } }} className="flex-1 bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" placeholder="Ex: Vendedor sem reputação..." />
                          <button type="button" onClick={() => { if(newCon) { setNewSupplier(prev => ({...prev, cons: [...prev.cons, newCon]})); setNewCon(""); } }} className="px-3 py-2 bg-rose-500/20 text-rose-500 rounded-lg text-sm font-bold">+</button>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {newSupplier.cons.map((c, idx) => (
                            <li key={idx} className="flex justify-between items-center text-xs bg-rose-500/5 px-2 py-1.5 rounded border border-rose-500/10 text-rose-400">
                              <span>{c}</span><button type="button" onClick={() => setNewSupplier(prev => ({...prev, cons: prev.cons.filter((_, i) => i !== idx)}))}><X className="size-3"/></button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    <button type="button" onClick={handleAddSupplier} disabled={!newSupplier.name} className="w-full mt-2 py-2.5 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                      <Plus className="size-4" /> Cadastrar Loja para Comparação
                    </button>
                  </div>
                  
                  {/* Lista de Fornecedores Cadastrados */}
                  {formData.details.suppliers.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                      {formData.details.suppliers.map((sup) => (
                        <div key={sup.id} className="bg-[#111113] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 flex flex-col relative group">
                          <button type="button" onClick={() => removeSupplier(sup.id)} className="absolute top-3 right-3 text-[#71717A] hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="size-4" /></button>
                          
                          <h5 className="font-bold text-white text-sm mb-1">{sup.name}</h5>
                          {sup.link && (
                             <a href={sup.link} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 mb-3">
                               <ExternalLink className="size-3" /> Acessar Link
                             </a>
                          )}
                          
                          <div className="grid grid-cols-2 gap-3 mt-auto">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1"><ThumbsUp className="size-3"/> Prós</span>
                              {sup.pros.length > 0 ? sup.pros.map((p, i) => (
                                <div key={i} className="text-[10px] text-[#A1A1AA] flex items-start gap-1"><span className="text-emerald-500 mt-0.5">•</span> <span>{p}</span></div>
                              )) : <div className="text-[10px] text-[#71717A] italic">Nenhum</div>}
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1"><ThumbsDown className="size-3"/> Contras</span>
                              {sup.cons.length > 0 ? sup.cons.map((c, i) => (
                                <div key={i} className="text-[10px] text-[#A1A1AA] flex items-start gap-1"><span className="text-rose-500 mt-0.5">•</span> <span>{c}</span></div>
                              )) : <div className="text-[10px] text-[#71717A] italic">Nenhum</div>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>

              </form>
            </div>
            
            {/* Form Actions Footer */}
            <div className="p-4 md:p-6 bg-[#09090B]/90 border-t border-[rgba(255,255,255,0.06)] shrink-0 flex flex-col-reverse md:flex-row justify-end gap-3 z-10">
               <button type="button" onClick={() => { setIsCreating(false); setEditingId(null); }} className="px-6 py-3 rounded-xl text-sm font-medium text-[#A1A1AA] hover:bg-[#1A1A1E]">Cancelar</button>
               <button type="submit" form="acquisitions-form" className="px-6 py-3 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                 {editingId ? "Salvar Alterações" : "Gravar na Wishlist"}
               </button>
            </div>

          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-10"><div className="size-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>
      ) : acquisitions.length === 0 ? (
        <div className="text-center p-16 bg-[#111113] border border-dashed border-[rgba(255,255,255,0.06)] rounded-3xl">
          <ShoppingCart className="size-16 text-[#3F3F46] mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Sua Wishlist está vazia</h3>
          <p className="text-[#A1A1AA] max-w-sm mx-auto">Comece a listar as aquisições que você deseja planejar. Coloque metas, acompanhe valores e avalie prós e contras.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {acquisitions.map(item => {
            const details = getDetails(item.milestones);
            const savedValue = (item.target_value || 0) * (item.progress_percentage / 100);
            
            return (
              <div key={item.id} className={cn(
                "bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-3xl p-6 flex flex-col relative overflow-hidden group transition-all",
                item.status === 'concluida' ? "border-emerald-500/30" : "hover:border-[rgba(255,255,255,0.1)]"
              )}>
                {item.status === 'concluida' && (
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <CheckCircle2 className="size-32 text-emerald-500" />
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <span className={cn(
                    "text-[10px] uppercase font-bold px-3 py-1 rounded-full",
                    item.status === 'concluida' ? "bg-emerald-500/20 text-emerald-400" : "bg-[#1A1A1E] text-emerald-500"
                  )}>
                    {item.status === 'concluida' ? "Comprado" : "Na Fila"}
                  </span>
                  
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => {
                      setEditingId(item.id);
                      setFormData({
                        title: item.title,
                        description: item.description || "",
                        target_value: item.target_value || 0,
                        progress_percentage: item.progress_percentage || 0,
                        status: item.status,
                        details
                      });
                    }} className="text-[#71717A] hover:text-emerald-400 p-1"><Edit2 className="size-4" /></button>
                    
                    {item.status !== 'concluida' && (
                       <button onClick={() => updateGoal(item.id, { status: 'concluida', progress_percentage: 100 })} className="text-[#71717A] hover:text-emerald-500 p-1"><CheckCircle2 className="size-4" /></button>
                    )}
                    
                    <button onClick={() => deleteGoal(item.id)} className="text-[#71717A] hover:text-rose-500 p-1"><Trash2 className="size-4" /></button>
                  </div>
                </div>

                <div className="flex gap-4 mb-4 relative z-10 items-center">
                  {details.imageUrl && (
                    <img src={details.imageUrl} alt={item.title} className="w-16 h-16 object-cover rounded-xl border border-[rgba(255,255,255,0.1)]" />
                  )}
                  <h3 className="text-xl font-bold tracking-tight text-white">{item.title}</h3>
                </div>
                
                <div className="bg-[#1A1A1E]/50 rounded-xl p-4 border border-[rgba(255,255,255,0.02)] mb-6 relative z-10">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-[#71717A] mb-1">Especificações Necessárias</div>
                  <p className="text-sm text-[#D4D4D8] whitespace-pre-wrap leading-relaxed">
                    {item.description || "Nenhuma especificação cadastrada."}
                  </p>
                </div>
                
                {/* Comparativo de Fornecedores */}
                <div className="mb-6 relative z-10">
                  <h4 className="text-[11px] uppercase tracking-widest font-bold text-[#A1A1AA] mb-3 flex items-center gap-2">
                    <Store className="size-3" /> Opções de Compra ({details.suppliers.length})
                  </h4>
                  <div className="space-y-3">
                    {details.suppliers.length === 0 ? (
                       <div className="text-sm text-[#71717A] italic">Nenhuma opção de compra cadastrada.</div>
                    ) : details.suppliers.map((sup) => (
                      <div key={sup.id} className="bg-black/20 border border-[rgba(255,255,255,0.04)] rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-sm text-white">{sup.name}</span>
                          {sup.link && (
                            <a href={sup.link} target="_blank" rel="noreferrer" className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded hover:bg-emerald-500/20 transition-colors">
                              Acessar Loja
                            </a>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                             <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 mb-1"><ThumbsUp className="size-3"/> Prós</span>
                             {sup.pros.length > 0 ? (
                               <ul className="text-[11px] text-[#A1A1AA] space-y-0.5">
                                 {sup.pros.map((p, i) => <li key={i} className="flex items-start gap-1"><span className="text-emerald-500 mt-[2px]">•</span> <span>{p}</span></li>)}
                               </ul>
                             ) : <span className="text-[10px] text-[#71717A]">Nenhum</span>}
                          </div>
                          <div>
                             <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1 mb-1"><ThumbsDown className="size-3"/> Contras</span>
                             {sup.cons.length > 0 ? (
                               <ul className="text-[11px] text-[#A1A1AA] space-y-0.5">
                                 {sup.cons.map((c, i) => <li key={i} className="flex items-start gap-1"><span className="text-rose-500 mt-[2px]">•</span> <span>{c}</span></li>)}
                               </ul>
                             ) : <span className="text-[10px] text-[#71717A]">Nenhum</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-auto space-y-4 pt-4 border-t border-[rgba(255,255,255,0.04)] relative z-10">
                  {/* Progresso de Pagamento */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest text-[#A1A1AA] mb-2">
                      <span>Progresso: {formatCurrency(savedValue)}</span>
                      <span className="text-emerald-500">{item.progress_percentage}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#1A1A1E] rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-1000" style={{width: `${item.progress_percentage}%`}}></div>
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-[#71717A]">
                      <span>Meta: {formatCurrency(item.target_value || 0)}</span>
                      <span>Falta: {formatCurrency((item.target_value || 0) - savedValue)}</span>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  {details.paymentMethods && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium bg-[#1A1A1E] text-[#A1A1AA] px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.05)]">
                        <CreditCard className="size-3.5 text-emerald-500" /> Planos de Pagamento: {details.paymentMethods}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
