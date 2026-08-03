import React, { useState, useEffect } from 'react';
import { Gamepad2, Film, Plus, Unlock, Lock, Star, X, Check, Search } from 'lucide-react';
import { toast } from 'sonner';
import { usePosXP } from '@/hooks/use-pos-xp';

export interface EntertainmentItem {
  id: string;
  type: 'game' | 'movie';
  title: string;
  imageUrl: string;
  cost: number;
  status: 'locked' | 'unlocked' | 'finished';
  createdAt: string;
}

export function PosEntertainment() {
  const { currentXP, spendXP } = usePosXP();
  const [items, setItems] = useState<EntertainmentItem[]>([]);
  const [activeTab, setActiveTab] = useState<'game' | 'movie'>('game');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newImage, setNewImage] = useState('');
  const [newCost, setNewCost] = useState(1000);

  useEffect(() => {
    const saved = localStorage.getItem('voyage_pos_entertainment');
    if (saved) setItems(JSON.parse(saved));
  }, []);

  const saveItems = (newItems: EntertainmentItem[]) => {
    setItems(newItems);
    localStorage.setItem('voyage_pos_entertainment', JSON.stringify(newItems));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const newItem: EntertainmentItem = {
      id: Date.now().toString(),
      type: activeTab,
      title: newTitle,
      imageUrl: newImage || (activeTab === 'game' 
        ? 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=400&auto=format&fit=crop'
        : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=400&auto=format&fit=crop'),
      cost: newCost,
      status: 'locked',
      createdAt: new Date().toISOString()
    };

    saveItems([newItem, ...items]);
    setIsAddOpen(false);
    setNewTitle('');
    setNewImage('');
    setNewCost(1000);
    toast.success(`${activeTab === 'game' ? 'Jogo' : 'Filme'} adicionado à sua Wishlist!`);
  };

  const handleUnlock = (id: string, cost: number) => {
    if (currentXP < cost) {
      toast.error('XP Insuficiente!');
      return;
    }

    if (window.confirm(`Deseja gastar ${cost} XP para desbloquear este título?`)) {
      spendXP(cost);
      saveItems(items.map(i => i.id === id ? { ...i, status: 'unlocked' } : i));
      toast.success('Desbloqueado com sucesso! Aproveite.');
    }
  };

  const handleFinish = (id: string) => {
    saveItems(items.map(i => i.id === id ? { ...i, status: 'finished' } : i));
    toast.success('Parabéns por concluir!');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir?')) {
      saveItems(items.filter(i => i.id !== id));
    }
  };

  const filteredItems = items.filter(i => 
    i.type === activeTab && 
    i.title.toLowerCase().includes(search.toLowerCase())
  );

  const lockedItems = filteredItems.filter(i => i.status === 'locked');
  const unlockedItems = filteredItems.filter(i => i.status === 'unlocked');
  const finishedItems = filteredItems.filter(i => i.status === 'finished');

  return (
    <div className="relative p-4 md:p-10 max-w-[1400px] mx-auto flex flex-col gap-6 md:gap-8 pb-20 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 animate-in fade-in slide-in-from-left-8 duration-1000 relative z-10">
        <div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white flex items-center gap-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
             <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl border border-[rgba(255,255,255,0.05)] shadow-[0_0_30px_rgba(99,102,241,0.15)] relative group">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-md group-hover:bg-indigo-500/40 transition-colors"></div>
                <Gamepad2 className="size-6 md:size-8 text-indigo-400 relative z-10" /> 
             </div>
             Entretenimento
          </h2>
          <p className="text-[#A1A1AA] text-sm md:text-base mt-3 max-w-2xl font-medium tracking-wide">
            Registre os jogos e filmes que deseja consumir. Desbloqueie o acesso gastando seu XP acumulado!
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="bg-[#111113] border border-amber-500/30 px-6 py-3 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.1)] flex items-center gap-3">
            <Star className="size-5 text-amber-500" />
            <div>
              <div className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-widest leading-none mb-1">XP Disponível</div>
              <div className="text-xl font-black text-white leading-none">{currentXP.toLocaleString('pt-BR')}</div>
            </div>
          </div>
          <button 
            onClick={() => setIsAddOpen(true)}
            className="w-full flex justify-center items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-3 rounded-xl transition-colors font-bold text-xs shadow-[0_0_15px_rgba(99,102,241,0.3)]"
          >
            <Plus className="size-4" /> Adicionar à Wishlist
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 relative z-10">
        <button
          onClick={() => setActiveTab('game')}
          className={`pb-4 flex items-center gap-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'game' ? 'border-indigo-500 text-white' : 'border-transparent text-muted-foreground hover:text-white'}`}
        >
          <Gamepad2 className="size-4" /> Jogos
        </button>
        <button
          onClick={() => setActiveTab('movie')}
          className={`pb-4 flex items-center gap-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'movie' ? 'border-purple-500 text-white' : 'border-transparent text-muted-foreground hover:text-white'}`}
        >
          <Film className="size-4" /> Filmes & Séries
        </button>
      </div>

      <div className="relative z-10 flex flex-col gap-10">
        
        {/* Desbloqueados / Jogando */}
        {unlockedItems.length > 0 && (
          <section>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Unlock className="size-5 text-emerald-500" /> Disponíveis para Consumo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {unlockedItems.map(item => (
                <div key={item.id} className="bg-[#111113] border border-emerald-500/30 rounded-3xl overflow-hidden flex flex-col shadow-[0_0_20px_rgba(16,185,129,0.1)] group">
                  <div className="h-40 relative">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111113] to-transparent"></div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h4 className="text-lg font-bold text-white mb-4 flex-1">{item.title}</h4>
                    <button onClick={() => handleFinish(item.id)} className="w-full bg-emerald-500 text-black font-bold py-2.5 rounded-xl hover:bg-emerald-400 transition-colors flex justify-center items-center gap-2">
                      <Check className="size-4" /> Marcar Concluído
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Wishlist Bloqueada */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="size-5 text-amber-500" /> Wishlist (Requer XP)
            </h3>
            <div className="relative w-64">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
          
          {lockedItems.length === 0 ? (
            <div className="p-10 border border-dashed border-white/10 rounded-3xl text-center flex flex-col items-center justify-center bg-black/20">
              <div className="size-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                {activeTab === 'game' ? <Gamepad2 className="size-8 text-muted-foreground" /> : <Film className="size-8 text-muted-foreground" />}
              </div>
              <p className="text-muted-foreground">Nenhum título na sua wishlist.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {lockedItems.map(item => (
                <div key={item.id} className="bg-[#111113] border border-white/10 rounded-3xl overflow-hidden flex flex-col hover:border-indigo-500/30 transition-all group relative">
                  <button onClick={() => handleDelete(item.id)} className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <Trash2 className="size-4" />
                  </button>
                  <div className="h-40 relative">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 transition-all" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111113] to-transparent"></div>
                    <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md text-amber-500 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-amber-500/20">
                      <Star className="size-3" /> {item.cost.toLocaleString('pt-BR')} XP
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h4 className="text-lg font-bold text-white mb-4 flex-1">{item.title}</h4>
                    {currentXP >= item.cost ? (
                      <button onClick={() => handleUnlock(item.id, item.cost)} className="w-full bg-indigo-500/20 text-indigo-400 font-bold py-2.5 rounded-xl border border-indigo-500/30 hover:bg-indigo-500 hover:text-white transition-colors flex justify-center items-center gap-2">
                        <Unlock className="size-4" /> Desbloquear
                      </button>
                    ) : (
                      <button disabled className="w-full bg-white/5 text-muted-foreground font-bold py-2.5 rounded-xl border border-white/10 flex justify-center items-center gap-2 cursor-not-allowed">
                        <Lock className="size-4" /> Faltam {item.cost - currentXP} XP
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Finalizados */}
        {finishedItems.length > 0 && (
          <section className="mt-8">
            <h3 className="text-lg font-bold text-muted-foreground mb-4 flex items-center gap-2">
              <Check className="size-5" /> Já Concluídos
            </h3>
            <div className="flex flex-wrap gap-4">
              {finishedItems.map(item => (
                <div key={item.id} className="bg-[#111113] border border-white/5 rounded-2xl p-3 flex items-center gap-3 pr-6 opacity-60 hover:opacity-100 transition-opacity">
                  <div className="size-12 rounded-xl overflow-hidden relative">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                    <span className="text-[10px] text-emerald-500 uppercase font-bold tracking-widest">Finalizado</span>
                  </div>
                  <button onClick={() => handleDelete(item.id)} className="ml-2 text-muted-foreground hover:text-red-500"><Trash2 className="size-4" /></button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#09090B] border border-[#1C1C21] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#1C1C21] flex items-center justify-between shrink-0 bg-[#0A0A0C]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {activeTab === 'game' ? <Gamepad2 className="size-4 text-indigo-400" /> : <Film className="size-4 text-purple-400" />}
                Adicionar {activeTab === 'game' ? 'Jogo' : 'Filme/Série'}
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-[#6F6F6F] hover:text-white transition-colors p-2 bg-[#1A1A1E] rounded-full">
                <X className="size-4" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 flex flex-col gap-5">
              <div>
                 <label className="text-xs font-bold uppercase tracking-widest text-[#71717A] mb-1 block">Título</label>
                 <input required type="text" placeholder={`Ex: ${activeTab === 'game' ? 'The Witcher 3' : 'O Senhor dos Anéis'}`} value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-[#111113] border border-[#1C1C21] text-white p-3 rounded-xl focus:border-indigo-500 outline-none transition-colors" />
              </div>
              <div>
                 <label className="text-xs font-bold uppercase tracking-widest text-[#71717A] mb-1 block">URL da Imagem (Capa)</label>
                 <input type="url" placeholder="https://..." value={newImage} onChange={e => setNewImage(e.target.value)} className="w-full bg-[#111113] border border-[#1C1C21] text-white p-3 rounded-xl focus:border-indigo-500 outline-none transition-colors" />
              </div>
              <div>
                 <label className="text-xs font-bold uppercase tracking-widest text-[#71717A] mb-1 block">Custo em XP para Desbloquear</label>
                 <input required type="number" value={newCost} onChange={e => setNewCost(Number(e.target.value))} className="w-full bg-[#111113] border border-[#1C1C21] text-white p-3 rounded-xl focus:border-amber-500 outline-none transition-colors text-amber-500 font-bold" />
              </div>
              <button type="submit" className={`w-full text-white font-bold py-3 rounded-xl transition-colors mt-2 ${activeTab === 'game' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-purple-600 hover:bg-purple-500'}`}>
                 Adicionar à Wishlist
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
