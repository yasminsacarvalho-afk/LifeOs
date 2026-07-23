import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { useDailyAnalysesRealtime } from "@/hooks/use-daily-analyses-realtime";
import { useTripsRealtime } from "@/hooks/use-trips-realtime";
import { useCityCodesRealtime } from "@/hooks/use-city-codes-realtime";
import { Target, TrendingUp, MapPin, Wand2, Calculator, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [{ title: "Simulador de Metas · Voyage Flow" }],
  }),
  component: SimulatorPage,
});

const formatCurrency = (val: number) => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function SimulatorPage() {
  const { analyses } = useDailyAnalysesRealtime();
  const { trips } = useTripsRealtime();
  const { cityCodes } = useCityCodesRealtime();

  const [simGoal, setSimGoal] = useState<string>("5000");
  const [simRate, setSimRate] = useState<string>("6");
  const [simDays, setSimDays] = useState<string>("30");
  const [simSelectedDestinations, setSimSelectedDestinations] = useState<string[]>([]);
  const [simFilterPeriod, setSimFilterPeriod] = useState<string>("30");

  const filteredAnalyses = useMemo(() => {
     if (simFilterPeriod === "all") return analyses;
     const days = parseInt(simFilterPeriod);
     const cutoff = new Date();
     cutoff.setDate(cutoff.getDate() - days);
     return analyses.filter(a => new Date(a.analysis_date) >= cutoff);
  }, [analyses, simFilterPeriod]);

  const destinationsStudy = useMemo(() => {
    const map = new Map<string, { city: string, code: Set<string>, qtd: number, valor: number, history: { date: string, qtd: number, valor: number, company: string }[] }>();
    
    filteredAnalyses.forEach(a => {
      if (Array.isArray(a.top_destinations)) {
        a.top_destinations.forEach((d: any) => {
          if (!d.nome) return;
          const rawName = d.nome.trim().replace(/\s*-\s*[A-Za-z]{2}\s*$/, "");
          
          let city = rawName;
          let code = "--";
          
          const searchUpper = rawName.toUpperCase();
          const noAccentSearch = searchUpper.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          
          const dictionaryMatch = cityCodes.find(c => {
             const cUpper = c.city_name.toUpperCase();
             const cNoAccent = cUpper.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
             return c.code.toUpperCase() === searchUpper || 
                    cUpper === searchUpper || 
                    cNoAccent === noAccentSearch ||
                    c.code.toUpperCase() === noAccentSearch;
          });
          
          if (dictionaryMatch) {
             city = dictionaryMatch.city_name;
             code = dictionaryMatch.code;
          } else {
            const match = trips.find(t => {
               const tNormCode = (t.destination_code || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
               const tNormCity = (t.destination || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
               return tNormCode === noAccentSearch || tNormCity === noAccentSearch ||
                      t.destination_code?.toUpperCase() === searchUpper || 
                      t.origin_code?.toUpperCase() === searchUpper || 
                      t.destination?.toUpperCase() === searchUpper || 
                      t.origin?.toUpperCase() === searchUpper;
            });
            
            if (match) {
               if (match.destination_code?.toUpperCase() === searchUpper) {
                 city = match.destination;
                 code = match.destination_code;
               } else if (match.origin_code?.toUpperCase() === searchUpper) {
                 city = match.origin;
                 code = match.origin_code;
               } else if (match.destination?.toUpperCase() === searchUpper) {
                 city = match.destination;
                 code = match.destination_code || "--";
               } else if (match.origin?.toUpperCase() === searchUpper) {
                 city = match.origin;
                 code = match.origin_code || "--";
               }
            }
          }
          
          const key = city.toUpperCase();
          if (!map.has(key)) {
            map.set(key, { city, code: new Set<string>(), qtd: 0, valor: 0, history: [] });
          }
          
          const qty = parseInt(d.quantidade) || 0;
          const valStr = d.valor ? String(d.valor).replace(/[^0-9,-]/g, '').replace(',', '.') : '0';
          const val = parseFloat(valStr) || 0;
          
          const current = map.get(key)!;
          if (code && code !== "--") current.code.add(code);
          current.qtd += qty;
          current.valor += val;
          
          if (qty > 0 || val > 0) {
            current.history.push({
              date: a.analysis_date,
              qtd: qty,
              valor: val,
              company: a.empresa
            });
          }
        });
      }
    });

    return Array.from(map.values()).map(v => {
      const companyCount = new Map<string, number>();
      v.history.forEach(h => {
        companyCount.set(h.company, (companyCount.get(h.company) || 0) + h.qtd);
      });
      let bestCompany = "--";
      let maxQtd = 0;
      companyCount.forEach((qtd, comp) => {
        if (qtd > maxQtd) {
          maxQtd = qtd;
          bestCompany = comp;
        }
      });

      return {
        city: v.city,
        code: v.code.size > 0 ? Array.from(v.code).join(" / ") : "--",
        qtd: v.qtd,
        valor: v.valor,
        bestCompany,
        history: v.history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      };
    }).sort((a, b) => b.qtd - a.qtd);
  }, [filteredAnalyses, trips, cityCodes]);

  const goal = Number(simGoal) || 0;
  const rate = (Number(simRate) || 0) / 100;
  const days = Number(simDays) || 30;
  const requiredMonthlySales = rate > 0 ? goal / rate : 0;
  const requiredDailySales = requiredMonthlySales / days;

  const validTickets = filteredAnalyses
    .map(a => parseFloat((a.ticket_medio || "").replace(/[^0-9,-]/g, '').replace(',', '.')))
    .filter(n => !isNaN(n) && n > 0);

  const totalDays = filteredAnalyses.length > 0 ? filteredAnalyses.length : 1;
  const totalCarsOperated = filteredAnalyses.reduce((acc, a) => acc + (Array.isArray(a.top_lines) ? a.top_lines.length : 0), 0);
  const avgCarsPerDay = totalCarsOperated > 0 ? Math.max(1, Math.round(totalCarsOperated / totalDays)) : (trips.length > 0 ? trips.length : 1);
  
  const requiredRevenuePerCar = avgCarsPerDay > 0 ? requiredDailySales / avgCarsPerDay : 0;

  return (
    <>
      <TopBar
        title="Simulador de Metas"
        subtitle="Ferramenta analítica avançada para planejamento de metas, comissões e rotas ideais."
        actions={
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground bg-card border border-border px-4 py-2 rounded-lg shadow-sm">
             <Calculator className="size-4" />
             Base de Dados: {filteredAnalyses.length} diários
          </div>
        }
      />
      <main className="px-8 py-8 space-y-8">
         {/* Painel Principal de Simulação */}
         <div className="flex flex-col xl:flex-row gap-8">
            {/* Esquerda: Parâmetros */}
            <div className="xl:w-1/3 flex flex-col gap-6">
               <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#8A05BE]/5 to-transparent pointer-events-none" />
                  
                  <div className="mb-6 flex items-center justify-between">
                     <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Target className="size-5 text-[#8A05BE]" /> Variáveis
                     </h2>
                     <div className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] uppercase font-bold text-muted-foreground">Config</div>
                  </div>

                  <div className="space-y-5">
                     <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">O que você quer colocar no bolso? (R$ Livre)</label>
                        <div className="relative">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-white/50">R$</span>
                           <input 
                             type="number" 
                             value={simGoal}
                             onChange={(e) => setSimGoal(e.target.value)}
                             className="w-full bg-black/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white font-mono font-bold focus:outline-none focus:border-[#8A05BE] transition-colors text-2xl"
                           />
                        </div>
                     </div>
                     
                     <div className="flex gap-4">
                        <div className="space-y-2 w-1/2">
                           <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Sua Comissão (%)</label>
                           <div className="relative">
                              <input 
                                type="number" 
                                value={simRate}
                                onChange={(e) => setSimRate(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white font-mono font-bold focus:outline-none focus:border-[#8A05BE] transition-colors text-lg"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono font-bold text-white/50">%</span>
                           </div>
                        </div>
                        <div className="space-y-2 w-1/2">
                           <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Prazo (Dias)</label>
                           <div className="relative">
                              <input 
                                type="number" 
                                value={simDays}
                                onChange={(e) => setSimDays(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white font-mono font-bold focus:outline-none focus:border-[#8A05BE] transition-colors text-lg"
                              />
                           </div>
                        </div>
                     </div>

                     <div className="space-y-2 pt-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Base de Dados Histórica</label>
                        <select 
                           value={simFilterPeriod}
                           onChange={(e) => setSimFilterPeriod(e.target.value)}
                           className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:border-[#8A05BE] transition-colors text-sm"
                        >
                           <option value="7">Últimos 7 dias</option>
                           <option value="15">Últimos 15 dias</option>
                           <option value="30">Últimos 30 dias</option>
                           <option value="90">Últimos 90 dias</option>
                           <option value="all">Todo o histórico</option>
                        </select>
                     </div>
                  </div>
               </div>

               {/* Seletor de Destinos */}
               <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-8 relative overflow-hidden flex-1 flex flex-col">
                  <div className="mb-6 flex items-center justify-between">
                     <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                        <MapPin className="size-5 text-[#8A05BE]" /> Destinos Alvo
                     </h2>
                     {simSelectedDestinations.length > 0 && (
                        <button onClick={() => setSimSelectedDestinations([])} className="text-[#8A05BE] hover:text-white transition-colors font-bold text-[10px] uppercase tracking-wider">Limpar Seleção</button>
                     )}
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[400px] custom-scrollbar pr-2 space-y-4">
                     {(() => {
                        const normalizeDest = (name: string) => {
                          if (!name) return "";
                          const cleanName = name.trim().replace(/\s*-\s*[A-Za-z]{2}\s*$/, "");
                          const upper = cleanName.toUpperCase();
                          const noAccent = upper.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                          const match = cityCodes.find(c => {
                             return c.city_name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === noAccent ||
                                    c.code.toUpperCase() === upper;
                          });
                          return match ? match.city_name : cleanName;
                        };

                        const uniqueMap = new Map<string, string>();
                        const addCity = (name: string | undefined | null) => {
                          if (!name) return;
                          const norm = normalizeDest(name);
                          if (!norm) return;
                          const key = norm.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s*-\s*[A-Z]{2}\s*$/, "").replace(/\s+/g, " ").trim();
                          if (!uniqueMap.has(key)) {
                            uniqueMap.set(key, norm);
                          } else {
                            const existing = uniqueMap.get(key)!;
                            if (existing === existing.toUpperCase() && norm !== norm.toUpperCase()) {
                              uniqueMap.set(key, norm);
                            }
                          }
                        };

                        cityCodes.forEach(c => addCity(c.city_name));
                        trips.forEach(t => addCity(t.destination));
                        destinationsStudy.forEach(d => addCity(d.city));

                        const allKnownDestinations = Array.from(uniqueMap.values()).sort();
                        const topDestinations = destinationsStudy.slice(0, 4).map(d => d.city);
                        const otherDestinations = allKnownDestinations.filter(c => !topDestinations.includes(c));

                        const renderCityBtn = (city: string, idx: number, isSuggested = false) => {
                          const d = destinationsStudy.find(ds => ds.city === city);
                          const tkt = d && d.qtd > 0 ? d.valor / d.qtd : 0;
                          const isSelected = simSelectedDestinations.includes(city);
                          
                          return (
                            <button
                              key={`${isSuggested ? 'sug' : 'oth'}-${idx}`}
                              type="button"
                              onClick={() => {
                                 if (isSelected) {
                                    setSimSelectedDestinations(simSelectedDestinations.filter(c => c !== city));
                                 } else {
                                    setSimSelectedDestinations([...simSelectedDestinations, city]);
                                 }
                              }}
                              className={cn(
                                "flex flex-col text-left px-3 py-2 rounded-xl border transition-all duration-300 relative overflow-hidden group min-w-[120px] flex-1 sm:flex-none",
                                isSelected 
                                  ? "bg-[#8A05BE]/20 border-[#8A05BE]/50 shadow-[0_0_15px_-3px_rgba(138,5,190,0.3)] scale-[0.98]"
                                  : isSuggested ? "bg-[#8A05BE]/5 border-[#8A05BE]/30 hover:border-[#8A05BE]/60 hover:bg-[#8A05BE]/10 shadow-[0_0_10px_rgba(138,5,190,0.1)]" : "bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5"
                              )}
                            >
                              {isSelected && (
                                <div className="absolute inset-0 bg-gradient-to-br from-[#8A05BE]/20 to-transparent pointer-events-none" />
                              )}
                              {isSuggested && !isSelected && (
                                 <div className="absolute top-1 right-1">
                                    <span className="flex size-2 relative">
                                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8A05BE] opacity-75"></span>
                                       <span className="relative inline-flex rounded-full size-2 bg-[#8A05BE]"></span>
                                    </span>
                                 </div>
                              )}
                              <span className={cn("text-xs font-bold z-10 transition-colors truncate w-full pr-3", isSelected ? "text-white" : isSuggested ? "text-[#E3A3FF] group-hover:text-white" : "text-white/70 group-hover:text-white")}>
                                {city}
                              </span>
                              <span className={cn("text-[9px] font-mono z-10 transition-colors mt-0.5", isSelected ? "text-[#E3A3FF]" : "text-muted-foreground")}>
                                {tkt > 0 ? formatCurrency(tkt) : 'Sem Dados'}
                              </span>
                            </button>
                          );
                        };

                        return (
                          <>
                            {topDestinations.length > 0 && (
                               <div className="space-y-2 bg-[#8A05BE]/5 p-3 rounded-xl border border-[#8A05BE]/20">
                                  <div className="text-[10px] uppercase font-bold text-[#E3A3FF] flex items-center gap-1.5"><Wand2 className="size-3" /> Sugestões da IA (Alta Demanda)</div>
                                  <div className="flex flex-wrap gap-2">
                                     {topDestinations.map((city, idx) => renderCityBtn(city, idx, true))}
                                  </div>
                               </div>
                            )}
                            <div className="space-y-2">
                               <div className="text-[10px] uppercase font-bold text-muted-foreground pl-1">Outros Destinos</div>
                               <div className="flex flex-wrap gap-2">
                                  {otherDestinations.map((city, idx) => renderCityBtn(city, idx, false))}
                               </div>
                            </div>
                          </>
                        );
                     })()}
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5 text-[10px] text-muted-foreground flex items-center gap-2">
                     <Info className="size-4 text-[#8A05BE]" />
                     Se nenhum for selecionado, a simulação usará o Top 3 destinos históricos automaticamente.
                  </div>
               </div>
            </div>

            {/* Direita: Dashboard de Resultados */}
            <div className="xl:w-2/3 flex flex-col gap-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:border-[#8A05BE]/50 transition-colors">
                     <div className="absolute inset-0 bg-gradient-to-br from-[#8A05BE]/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                     <div className="text-[11px] font-bold uppercase tracking-widest text-[#8A05BE] mb-2 relative z-10">Target Faturamento Global</div>
                     <div className="text-4xl font-black font-mono text-white tracking-tight relative z-10 mb-4">{formatCurrency(requiredMonthlySales)}</div>
                     <div className="text-xs text-muted-foreground relative z-10">
                        Total que a empresa precisa vender para você ganhar <strong className="text-white">R$ {goal.toFixed(2)}</strong> com <strong className="text-white">{rate*100}%</strong> de comissão.
                     </div>
                  </div>

                  <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:border-info/50 transition-colors">
                     <div className="absolute inset-0 bg-gradient-to-br from-info/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                     <div className="text-[11px] font-bold uppercase tracking-widest text-info mb-2 relative z-10">Target Diário (Pacing Ideal)</div>
                     <div className="text-4xl font-black font-mono text-white tracking-tight relative z-10 flex items-baseline gap-1 mb-4">
                        {formatCurrency(requiredDailySales)}<span className="text-sm text-white/40 font-normal">/dia</span>
                     </div>
                     <div className="text-xs text-muted-foreground relative z-10">
                        Velocidade de caixa diária exigida considerando um prazo de <strong className="text-white">{days} dias</strong> operacionais.
                     </div>
                  </div>
               </div>

               <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-8 flex-1 flex flex-col relative">
                  <div className="flex items-start justify-between mb-8">
                     <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                           <TrendingUp className="size-5 text-success" /> Mapa Tático de Operação
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">Planejamento de passageiros necessários por veículo com base na realidade histórica e ticket médio validado.</p>
                     </div>
                     <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-center">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Receita Ideal p/ Carro</div>
                        <div className="font-mono font-bold text-white text-lg">{formatCurrency(requiredRevenuePerCar)}</div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar pr-2 pb-4">
                     {(() => {
                        const destsToRender = simSelectedDestinations.length > 0 
                          ? simSelectedDestinations.map(city => {
                              const found = destinationsStudy.find(d => d.city === city);
                              return found || { city, code: "--", qtd: 0, valor: 0, history: [] };
                            })
                          : destinationsStudy.slice(0, 3);
                          
                        if (destsToRender.length === 0) {
                          return <div className="col-span-full text-sm text-muted-foreground italic flex items-center justify-center h-32 bg-white/5 rounded-xl border border-white/10">Aguardando dados da operação para simulação.</div>;
                        }

                        return destsToRender.map((dest, idx) => {
                          const fallbackTkt = validTickets.length > 0 ? validTickets.reduce((a, b) => a + b, 0) / validTickets.length : 150;
                          const tktMedio = dest.qtd > 0 ? dest.valor / dest.qtd : fallbackTkt;
                          const paxNeeded = tktMedio > 0 ? requiredRevenuePerCar / tktMedio : 0;
                          const targetPax = Math.ceil(paxNeeded);
                          
                          // Inteligência Histórica
                          const hasLowHistory = dest.history.length < 3;
                          const avgHistPax = dest.history.length > 0 ? dest.qtd / dest.history.length : 0;
                          const maxHistPax = dest.history.length > 0 ? Math.max(...dest.history.map(h => h.qtd)) : 0;
                          
                          let probStatus = "BAIXA VIABILIDADE";
                          let probColor = "text-danger";
                          let barColor = "bg-danger";
                          let barWidth = "w-[20%]";
                          let message = "O target exigido está muito acima do recorde histórico deste destino.";
                          
                          if (targetPax <= avgHistPax) {
                             probStatus = "ALTA VIABILIDADE";
                             probColor = "text-success";
                             barColor = "bg-success";
                             barWidth = "w-[90%]";
                             message = "Target abaixo da média diária histórica. Fácil de atingir.";
                          } else if (targetPax <= maxHistPax) {
                             probStatus = "MÉDIA VIABILIDADE";
                             probColor = "text-warning";
                             barColor = "bg-warning";
                             barWidth = "w-[50%]";
                             message = "Exigirá esforço extra, mas está dentro dos picos históricos.";
                          }

                          if (tktMedio === 0) return null;
                          
                          return (
                             <div key={idx} className="bg-[#151515] border border-white/5 rounded-3xl p-6 flex flex-col relative overflow-hidden transition-all shadow-sm">
                                <div className="flex justify-between items-start mb-6">
                                   <div className="pr-2">
                                      <div className="text-base font-bold text-white truncate max-w-[150px]" title={dest.city}>{dest.city}</div>
                                      <div className="text-[11px] text-muted-foreground mt-1 font-mono bg-white/5 px-2 py-1 rounded-md inline-block">TKT: {formatCurrency(tktMedio)}</div>
                                   </div>
                                </div>

                                <div className="bg-black/50 p-4 rounded-2xl border border-white/5 text-center mb-6 relative group">
                                   <div className="text-[10px] uppercase font-bold tracking-widest text-success/70 mb-2">Target por Carro</div>
                                   <div className="text-5xl font-black font-mono text-success leading-none">{targetPax}</div>
                                   <div className="text-xs font-medium text-success/50 uppercase tracking-widest mt-1">passageiros</div>
                                   
                                   {hasLowHistory && (
                                      <div className="absolute -top-3 -right-3 bg-warning text-black text-[8px] font-black tracking-widest uppercase px-2 py-1 rounded-bl-lg rounded-tr-lg shadow-xl z-10">
                                         S/ Histórico
                                      </div>
                                   )}
                                </div>
                                
                                <div className="mt-auto pt-4 border-t border-white/5">
                                   <div className="flex justify-between items-center mb-2">
                                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Viabilidade</span>
                                      <span className={`text-[10px] font-bold tracking-wider ${probColor}`}>{probStatus}</span>
                                   </div>
                                   <div className="w-full h-1.5 bg-black rounded-full overflow-hidden mb-3">
                                      <div className={`h-full ${barColor} ${barWidth} rounded-full transition-all duration-1000`} />
                                   </div>
                                   
                                   <div className="text-[10px] text-muted-foreground leading-relaxed">
                                      <p className="mb-2 italic border-l-2 border-white/10 pl-2">{message}</p>
                                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5">
                                         <div>
                                            <div className="uppercase tracking-widest text-[8px] opacity-50 mb-0.5">Média Diária</div>
                                            <div className="font-mono font-bold text-white">{avgHistPax.toFixed(1)} pax</div>
                                         </div>
                                         <div>
                                            <div className="uppercase tracking-widest text-[8px] opacity-50 mb-0.5">Pico Histórico</div>
                                            <div className="font-mono font-bold text-white">{maxHistPax} pax</div>
                                         </div>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          );
                        });
                     })()}
                  </div>
               </div>
            </div>
         </div>
      </main>
    </>
  );
}
