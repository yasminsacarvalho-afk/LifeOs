import React, { useState, useEffect } from 'react';
import { Target, Trophy, CheckSquare, BookOpen, GraduationCap, Activity, Gift, Star, Lock, Unlock, ArrowRight, X, PiggyBank } from 'lucide-react';
import { toast } from 'sonner';
import { usePosXP } from '@/hooks/use-pos-xp';

export function PosRewards() {
  const { 
    currentXP, totalXPEarned, xpGoal, xpConfig, 
    tasksXP, habitsXP, readingXP, studiesXP, financeXP,
    spendXP, refundXP
  } = usePosXP();

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [tempConfig, setTempConfig] = useState(xpConfig);
  const [tempGoal, setTempGoal] = useState(xpGoal);

  // Estado Local para Recompensas
  const [rewards, setRewards] = useState([
    { id: '1', title: 'Comprar um livro novo', cost: 1000, description: 'Você merece! Compre aquele livro que está na sua wishlist.', redeemed: false, image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400&auto=format&fit=crop' },
    { id: '2', title: 'Tarde de Folga (Sem Culpa)', cost: 3000, description: 'Tire uma tarde inteira para fazer absolutamente nada, sem pensar em trabalho.', redeemed: false, image: 'https://images.unsplash.com/photo-1540348737330-8041c2c3e1e9?q=80&w=400&auto=format&fit=crop' },
    { id: '3', title: 'Jantar em Restaurante Caro', cost: 5000, description: 'Vá naquele restaurante que você quer ir há meses.', redeemed: false, image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=400&auto=format&fit=crop' },
    { id: '4', title: 'Equipamento Novo (Tech)', cost: 10000, description: 'Um gadget novo, um monitor, ou algo para seu setup.', redeemed: false, image: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?q=80&w=400&auto=format&fit=crop' },
    { id: '5', title: 'Viagem de Fim de Semana', cost: 25000, description: 'Aquela escapada para a praia ou para as montanhas.', redeemed: false, image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=400&auto=format&fit=crop' },
  ]);

  useEffect(() => {
    const savedRewards = localStorage.getItem('lifeos_pos_rewards');
    if (savedRewards) setRewards(JSON.parse(savedRewards));
    
    // Update temp config when hook loads saved config
    setTempConfig(xpConfig);
    setTempGoal(xpGoal);
  }, [xpConfig.tasks, xpConfig.finance, xpGoal]);

  const handleRedeem = (rewardId: string) => {
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward) return;

    if (currentXP < reward.cost) {
      toast.error('Você não tem XP suficiente para esta recompensa.');
      return;
    }

    if (window.confirm(`Deseja realmente gastar ${reward.cost} XP nesta recompensa?`)) {
      spendXP(reward.cost);

      const newRewards = rewards.map(r => r.id === rewardId ? { ...r, redeemed: true } : r);
      setRewards(newRewards);
      localStorage.setItem('lifeos_pos_rewards', JSON.stringify(newRewards));

      toast.success('Recompensa resgatada com sucesso! Aproveite!');
    }
  };

  const handleResetReward = (rewardId: string) => {
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward) return;

    if (window.confirm(`Deseja devolver esta recompensa e recuperar o XP?`)) {
      refundXP(reward.cost);

      const newRewards = rewards.map(r => r.id === rewardId ? { ...r, redeemed: false } : r);
      setRewards(newRewards);
      localStorage.setItem('lifeos_pos_rewards', JSON.stringify(newRewards));

      toast.success('Recompensa devolvida. XP recuperado.');
    }
  };

  const handleSaveConfig = () => {
    localStorage.setItem('lifeos_pos_xp_config', JSON.stringify(tempConfig));
    localStorage.setItem('lifeos_pos_xp_goal', tempGoal.toString());
    window.location.reload(); // Force reload to update hook state since we're using localStorage manually here
  };

  const progressPercent = Math.min(100, Math.round((currentXP / xpGoal) * 100));

  return (
    <div className="relative p-4 md:p-10 max-w-[1600px] mx-auto flex flex-col gap-6 md:gap-8 pb-20 min-h-screen">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[800px] max-h-[800px] bg-amber-500/5 rounded-full blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[20%] left-[-5%] w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] bg-emerald-500/5 rounded-full blur-[100px] animate-[pulse_10s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-10 flex flex-col gap-6 md:gap-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 animate-in fade-in slide-in-from-left-8 duration-1000">
          <div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white flex items-center gap-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
               <div className="p-3 bg-gradient-to-br from-amber-500/20 to-emerald-500/20 rounded-2xl border border-[rgba(255,255,255,0.05)] shadow-[0_0_30px_rgba(245,158,11,0.15)] relative group">
                  <div className="absolute inset-0 bg-amber-500/20 rounded-2xl blur-md group-hover:bg-amber-500/40 transition-colors"></div>
                  <Trophy className="size-6 md:size-8 text-amber-400 relative z-10" /> 
               </div>
               Sistema de Recompensas
            </h2>
            <p className="text-[#A1A1AA] text-sm md:text-base mt-3 max-w-2xl font-medium tracking-wide">
              Seu esforço não é em vão. Todo hábito, tarefa, leitura e estudo gera pontos de experiência (XP). Acumule XP e troque por recompensas reais na sua vida.
            </p>
          </div>
          
          <button 
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-2 bg-[#1A1A1E] text-[#A1A1AA] hover:text-white border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.1)] px-4 py-3 md:py-2 rounded-xl transition-colors font-bold text-xs"
          >
            <Activity className="size-4" /> Configurar XP
          </button>
        </div>

        {/* Dashboard de XP */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#111113] border border-amber-500/20 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden group shadow-[0_0_30px_rgba(245,158,11,0.05)]">
             <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] rounded-full pointer-events-none"></div>
             <span className="text-[10px] uppercase font-bold text-amber-500 tracking-widest mb-2 flex items-center gap-2"><Star className="size-3" /> XP Disponível / Meta: {xpGoal.toLocaleString('pt-BR')}</span>
             <span className="text-6xl font-black text-white tracking-tighter drop-shadow-lg">{currentXP.toLocaleString('pt-BR')}</span>
             <div className="mt-4 w-full h-1 bg-[#1A1A1E] rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ width: `${progressPercent}%` }}></div>
             </div>
          </div>
          
          <div className="md:col-span-2 bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-3xl p-6">
             <h3 className="text-sm font-bold text-white mb-4">Fontes de Experiência</h3>
             <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-[#1A1A1E]/50 rounded-2xl p-4 flex flex-col gap-2">
                   <CheckSquare className="size-5 text-[#38bdf8]" />
                   <span className="text-2xl font-bold text-white">{tasksXP.toLocaleString('pt-BR')}</span>
                   <span className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-widest">Tarefas (+{xpConfig.tasks})</span>
                </div>
                <div className="bg-[#1A1A1E]/50 rounded-2xl p-4 flex flex-col gap-2">
                   <Activity className="size-5 text-rose-500" />
                   <span className="text-2xl font-bold text-white">{habitsXP.toLocaleString('pt-BR')}</span>
                   <span className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-widest">Hábitos (+{xpConfig.habits})</span>
                </div>
                <div className="bg-[#1A1A1E]/50 rounded-2xl p-4 flex flex-col gap-2">
                   <BookOpen className="size-5 text-indigo-400" />
                   <span className="text-2xl font-bold text-white">{readingXP.toLocaleString('pt-BR')}</span>
                   <span className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-widest">Leitura (+{xpConfig.readingPage}/pag)</span>
                </div>
                <div className="bg-[#1A1A1E]/50 rounded-2xl p-4 flex flex-col gap-2">
                   <GraduationCap className="size-5 text-emerald-500" />
                   <span className="text-2xl font-bold text-white">{studiesXP.toLocaleString('pt-BR')}</span>
                   <span className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-widest">Estudos (Variável)</span>
                </div>
                <div className="bg-[#1A1A1E]/50 rounded-2xl p-4 flex flex-col gap-2">
                   <PiggyBank className="size-5 text-emerald-400" />
                   <span className="text-2xl font-bold text-white">{financeXP.toLocaleString('pt-BR')}</span>
                   <span className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-widest">Finanças (+{xpConfig.finance || 10}/R$100)</span>
                </div>
             </div>
          </div>
        </div>

        {/* Loja de Recompensas */}
        <div>
           <div className="flex items-center gap-3 mb-6">
              <Gift className="size-5 text-rose-500" />
              <h3 className="text-xl font-bold text-white">Loja de Recompensas</h3>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rewards.map(reward => {
                 const isAffordable = currentXP >= reward.cost;
                 return (
                   <div key={reward.id} className={`bg-[#111113] border rounded-3xl overflow-hidden flex flex-col transition-all duration-300 ${reward.redeemed ? 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : isAffordable ? 'border-amber-500/20 hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'border-[rgba(255,255,255,0.04)] opacity-70 grayscale'}`}>
                      <div className="h-40 w-full relative">
                         <img src={reward.image} alt={reward.title} className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-gradient-to-t from-[#111113] to-transparent"></div>
                         <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10">
                            <Star className={`size-3 ${reward.redeemed ? 'text-emerald-400' : 'text-amber-400'}`} /> {reward.cost.toLocaleString('pt-BR')} XP
                         </div>
                      </div>
                      
                      <div className="p-6 flex-1 flex flex-col">
                         <h4 className="text-lg font-bold text-white mb-2 leading-tight">{reward.title}</h4>
                         <p className="text-sm text-[#A1A1AA] mb-6 flex-1">{reward.description}</p>
                         
                         {reward.redeemed ? (
                            <div className="flex items-center gap-2">
                               <button disabled className="flex-1 bg-emerald-500/10 text-emerald-500 font-bold py-3 rounded-xl border border-emerald-500/20 cursor-not-allowed">
                                  Resgatado!
                               </button>
                               <button onClick={() => handleResetReward(reward.id)} className="px-4 py-3 bg-[#1A1A1E] text-[#A1A1AA] hover:text-white rounded-xl border border-[rgba(255,255,255,0.05)] transition-colors" title="Devolver e recuperar XP">
                                  Desfazer
                               </button>
                            </div>
                         ) : isAffordable ? (
                            <button onClick={() => handleRedeem(reward.id)} className="w-full bg-amber-500 text-black font-bold py-3 rounded-xl hover:bg-amber-400 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2">
                               <Unlock className="size-4" /> Resgatar Recompensa
                            </button>
                         ) : (
                            <button disabled className="w-full bg-[#1A1A1E] text-[#71717A] font-bold py-3 rounded-xl border border-[rgba(255,255,255,0.05)] flex items-center justify-center gap-2 cursor-not-allowed">
                               <Lock className="size-4" /> Faltam {(reward.cost - currentXP).toLocaleString('pt-BR')} XP
                            </button>
                         )}
                      </div>
                   </div>
                 );
              })}

              {/* Botão de Adicionar Recompensa (Mock visual para futuras implementações) */}
              <div className="bg-[#111113]/50 border border-dashed border-[rgba(255,255,255,0.1)] rounded-3xl p-6 flex flex-col items-center justify-center gap-4 text-center hover:border-amber-500/30 hover:bg-[#1A1A1E]/50 transition-colors cursor-pointer min-h-[300px]">
                 <div className="size-16 rounded-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.05)] flex items-center justify-center text-[#A1A1AA]">
                    <Gift className="size-6" />
                 </div>
                 <div>
                    <h4 className="text-white font-bold mb-1">Criar Nova Recompensa</h4>
                    <p className="text-xs text-[#71717A]">Adicione seus próprios objetivos para gastar o seu XP acumulado.</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Config Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#09090B] border border-[#1C1C21] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#1C1C21] flex items-center justify-between shrink-0 bg-[#0A0A0C]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="size-4 text-[#38bdf8]" /> Configurações de XP
              </h3>
              <button onClick={() => setIsConfigOpen(false)} className="text-[#6F6F6F] hover:text-white transition-colors p-2 bg-[#1A1A1E] rounded-full">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              <div>
                 <label className="text-xs font-bold uppercase tracking-widest text-[#71717A] mb-1 block">Meta Principal de XP</label>
                 <input type="number" value={tempGoal} onChange={e => setTempGoal(Number(e.target.value))} className="w-full bg-[#111113] border border-[#1C1C21] text-white p-3 rounded-xl focus:border-[#38bdf8] outline-none transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#71717A] mb-1 block">XP por Tarefa</label>
                    <input type="number" value={tempConfig.tasks} onChange={e => setTempConfig({...tempConfig, tasks: Number(e.target.value)})} className="w-full bg-[#111113] border border-[#1C1C21] text-white p-3 rounded-xl focus:border-[#38bdf8] outline-none transition-colors" />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#71717A] mb-1 block">XP por Hábito</label>
                    <input type="number" value={tempConfig.habits} onChange={e => setTempConfig({...tempConfig, habits: Number(e.target.value)})} className="w-full bg-[#111113] border border-[#1C1C21] text-white p-3 rounded-xl focus:border-[#38bdf8] outline-none transition-colors" />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#71717A] mb-1 block">XP / Página</label>
                    <input type="number" value={tempConfig.readingPage} onChange={e => setTempConfig({...tempConfig, readingPage: Number(e.target.value)})} className="w-full bg-[#111113] border border-[#1C1C21] text-white p-3 rounded-xl focus:border-[#38bdf8] outline-none transition-colors" />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#71717A] mb-1 block">XP / Livro Lido</label>
                    <input type="number" value={tempConfig.readingBook} onChange={e => setTempConfig({...tempConfig, readingBook: Number(e.target.value)})} className="w-full bg-[#111113] border border-[#1C1C21] text-white p-3 rounded-xl focus:border-[#38bdf8] outline-none transition-colors" />
                 </div>
                 <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#71717A] mb-1 block flex items-center gap-1.5"><PiggyBank className="size-3 text-emerald-500" /> XP a cada R$ 100 Salvos (Caixinhas)</label>
                    <input type="number" value={tempConfig.finance || 0} onChange={e => setTempConfig({...tempConfig, finance: Number(e.target.value)})} className="w-full bg-[#111113] border border-[#1C1C21] text-white p-3 rounded-xl focus:border-emerald-500 outline-none transition-colors" />
                 </div>
              </div>
              <button onClick={handleSaveConfig} className="w-full bg-[#38bdf8] text-black font-bold py-3 rounded-xl hover:bg-[#38bdf8]/90 transition-colors mt-2 shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                 Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
