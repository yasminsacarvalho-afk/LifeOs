import { useState, useEffect } from "react";
import { X, Save, TrendingUp, DollarSign, Loader2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnersRealtime } from "@/hooks/use-partners-realtime";
import { useTripsRealtime } from "@/hooks/use-trips-realtime";
import { useCityCodesRealtime } from "@/hooks/use-city-codes-realtime";
import { cn } from "@/lib/utils";

interface TopService {
  nome: string;
  quantidade: string;
  valor: string;
}

interface AnaliseDiariaFormModalProps {
  analise?: any | null;
  open: boolean;
  onClose: () => void;
  defaultDate?: string;
  onSuccess?: () => void;
}

export function AnaliseDiariaFormModal({ analise, open, onClose, defaultDate, onSuccess }: AnaliseDiariaFormModalProps) {
  const { partners } = usePartnersRealtime();
  const { trips } = useTripsRealtime();
  const { cityCodes } = useCityCodesRealtime();
  
  const [analiseDate, setAnaliseDate] = useState(defaultDate || new Date().toISOString().split("T")[0]);
  const [analiseTopLines, setAnaliseTopLines] = useState<TopService[]>([]);
  const [analiseTopDestinations, setAnaliseTopDestinations] = useState<TopService[]>([]);
  const [analiseTopCity, setAnaliseTopCity] = useState(""); // Keeping for legacy/compatibility
  const [analiseClima, setAnaliseClima] = useState("");
  const [analiseNotes, setAnaliseNotes] = useState("");
  
  const [analiseTaxas, setAnaliseTaxas] = useState("");
  const [analiseHorario, setAnaliseHorario] = useState("");
  const [analisePagamento, setAnalisePagamento] = useState("");
  const [analiseTicketMedio, setAnaliseTicketMedio] = useState("");
  const [analiseEmpresa, setAnaliseEmpresa] = useState("");
  
  const [analiseReceitaOrigem, setAnaliseReceitaOrigem] = useState("");
  const [analiseReceitaDestino, setAnaliseReceitaDestino] = useState("");
  const [analiseReceitaRota, setAnaliseReceitaRota] = useState("");
  const [analiseReceitaHorario, setAnaliseReceitaHorario] = useState("");
  
  const [analiseTotalVendas, setAnaliseTotalVendas] = useState("");
  const [analiseVolumeVendas, setAnaliseVolumeVendas] = useState("");
  
  const [currentLineNome, setCurrentLineNome] = useState("");
  const [currentLineQtd, setCurrentLineQtd] = useState("");
  const [currentLineValor, setCurrentLineValor] = useState("");

  const [currentDestNome, setCurrentDestNome] = useState("");
  const [currentDestQtd, setCurrentDestQtd] = useState("");
  const [currentDestValor, setCurrentDestValor] = useState("");
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (analise) {
        setAnaliseDate(analise.analysis_date);
        
        let loadedLines: TopService[] = [];
        if (Array.isArray(analise.top_lines)) {
           loadedLines = analise.top_lines.map((l: any) => 
             typeof l === 'string' ? { nome: l, quantidade: "", valor: "" } : l
           );
        }
        setAnaliseTopLines(loadedLines);
        
        let loadedDest: TopService[] = [];
        if (Array.isArray(analise.top_destinations)) {
           loadedDest = analise.top_destinations.map((l: any) => 
             typeof l === 'string' ? { nome: l, quantidade: "", valor: "" } : l
           );
        }
        setAnaliseTopDestinations(loadedDest);

        setAnaliseTopCity(analise.top_city || "");
        setAnaliseClima(analise.clima || "");
        setAnaliseNotes(analise.notes || "");
        setAnaliseTaxas(analise.taxas || "");
        setAnaliseHorario(analise.horario || "");
        setAnalisePagamento(analise.pagamento || "");
        setAnaliseTicketMedio(analise.ticket_medio || "");
        setAnaliseEmpresa(analise.empresa || "");
        setAnaliseReceitaOrigem(analise.receita_origem || "");
        setAnaliseReceitaDestino(analise.receita_destino || "");
        setAnaliseReceitaRota(analise.receita_rota || "");
        setAnaliseReceitaHorario(analise.receita_horario || "");
        setAnaliseTotalVendas(analise.total_vendas || "");
        setAnaliseVolumeVendas(analise.volume_vendas || "");
      } else {
        setAnaliseDate(defaultDate || new Date().toISOString().split("T")[0]);
        setAnaliseTopLines([]);
        setAnaliseTopDestinations([]);
        setAnaliseTopCity("");
        setAnaliseClima("");
        setAnaliseNotes("");
        setAnaliseTaxas("");
        setAnaliseHorario("");
        setAnalisePagamento("");
        setAnaliseTicketMedio("");
        setAnaliseEmpresa("");
        setAnaliseReceitaOrigem("");
        setAnaliseReceitaDestino("");
        setAnaliseReceitaRota("");
        setAnaliseReceitaHorario("");
        setAnaliseTotalVendas("");
        setAnaliseVolumeVendas("");
      }
    }
  }, [open, analise, defaultDate]);

  if (!open) return null;

  const handleSave = async () => {
    if (!analiseEmpresa) {
       alert("Selecione a empresa/foco da operação.");
       return;
    }
    
    setIsSaving(true);
    try {
      const payload = {
        analysis_date: analiseDate,
        top_lines: analiseTopLines,
        top_destinations: analiseTopDestinations,
        top_city: analiseTopCity,
        clima: analiseClima,
        notes: analiseNotes,
        taxas: analiseTaxas,
        horario: analiseHorario,
        pagamento: analisePagamento,
        ticket_medio: analiseTicketMedio,
        empresa: analiseEmpresa,
        receita_origem: analiseReceitaOrigem,
        receita_destino: analiseReceitaDestino,
        receita_rota: analiseReceitaRota,
        receita_horario: analiseReceitaHorario,
        total_vendas: analiseTotalVendas,
        volume_vendas: analiseVolumeVendas,
        updated_at: new Date().toISOString()
      };
      
      let error = null;
      if (analise && analise.id) {
        const result = await supabase.from('daily_analyses').update(payload).eq('id', analise.id);
        error = result.error;
      } else {
        const result = await supabase.from('daily_analyses').insert([payload]);
        error = result.error;
      }
      
      if (error) {
        throw new Error(error.message || "Erro desconhecido ao salvar.");
      }
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao salvar no banco: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoFillTrips = async () => {
    try {
      const dateObj = new Date(analiseDate + "T12:00:00Z");
      const dayOfWeek = dateObj.getDay();

      const { data: trips } = await supabase.from('trips').select('*');
      if (!trips) return;

      const validTrips = trips.filter(t => !t.hide_from_dashboard && (!t.operating_days || t.operating_days.includes(dayOfWeek)));
      
      let filteredTrips = validTrips;
      if (analiseEmpresa && analiseEmpresa !== "Geral") {
         const partner = partners.find(p => p.name === analiseEmpresa);
         if (partner) {
           filteredTrips = validTrips.filter(t => t.company_id === partner.id);
         }
      }

      // Sort by departure time
      filteredTrips.sort((a, b) => {
        const timeA = new Date(a.scheduled_departure || 0);
        const timeB = new Date(b.scheduled_departure || 0);
        const minsA = timeA.getHours() * 60 + timeA.getMinutes();
        const minsB = timeB.getHours() * 60 + timeB.getMinutes();
        return minsA - minsB;
      });

      const newLines = filteredTrips.map(t => {
         let time = "--:--";
         if (t.scheduled_departure) {
            const d = new Date(t.scheduled_departure);
            time = d.toLocaleTimeString("pt-BR", { hour12: false, hour: "2-digit", minute: "2-digit" });
         }
         return {
            nome: `${t.origin} x ${t.destination} ${time}`,
            quantidade: "",
            valor: ""
         };
      });

      const destinationsSet = new Set<string>();
      filteredTrips.forEach(t => {
         if (t.destination) destinationsSet.add(t.destination);
      });
      
      const newDests = Array.from(destinationsSet).map(name => ({
         nome: name,
         quantidade: "",
         valor: ""
      }));

      setAnaliseTopLines(newLines);
      setAnaliseTopDestinations(newDests);
    } catch (e) {
      console.error(e);
      alert("Erro ao auto-preencher viagens.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl xl:max-w-7xl w-[95vw] max-h-[90vh] flex flex-col rounded-3xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <h2 className="text-2xl font-bold tracking-tight">
            {analise ? "Editar Análise" : "Nova Análise"} de Operação
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {/* Top section: Date & Empresa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/20 p-5 rounded-2xl border border-white/5">
             <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 block">Data da Operação *</label>
                <input 
                  type="date"
                  value={analiseDate}
                  onChange={(e) => setAnaliseDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors"
                />
             </div>
             <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 block">Operação / Empresa (Foco) *</label>
                <select
                  value={analiseEmpresa}
                  onChange={(e) => setAnaliseEmpresa(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors"
                >
                  <option value="">Selecione...</option>
                  <option value="Geral">Visão Geral (Todas)</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
               <h3 className="font-bold text-lg flex items-center gap-2 border-b border-border/50 pb-3">
                 <TrendingUp className="size-5 text-primary" /> Vendas (Pico)
                 <button 
                   onClick={handleAutoFillTrips} 
                   className="ml-auto text-xs bg-[#8A05BE]/20 text-[#8A05BE] hover:bg-[#8A05BE] hover:text-white px-3 py-1 rounded-lg transition-colors flex items-center gap-1 font-semibold border border-[#8A05BE]/30"
                   title="Preencher serviços e destinos baseados nos horários do Monitor de Frotas"
                 >
                   <Wand2 className="size-3" /> Auto-Preencher (Frotas)
                 </button>
               </h3>
               
               <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 flex items-center justify-between">
                    Top Serviços/Horários do Dia
                  </label>
                  
                  <div className="flex flex-col gap-2 mb-3">
                    <input 
                      type="text" 
                      value={currentLineNome}
                      onChange={(e) => setCurrentLineNome(e.target.value)}
                      placeholder="Serviço (Ex: Eunápolis x PS 21:00)" 
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors"
                    />
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={currentLineQtd}
                        onChange={(e) => setCurrentLineQtd(e.target.value)}
                        placeholder="Qtd" 
                        className="w-20 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors text-center"
                      />
                      <input 
                        type="text" 
                        value={currentLineValor}
                        onChange={(e) => setCurrentLineValor(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && currentLineNome.trim()) {
                            e.preventDefault();
                            let nomeFinal = currentLineNome.trim();
                            const tripMatch = trips.find(t => t.code === nomeFinal || (t.route_name && t.route_name.includes(nomeFinal)));
                            if (tripMatch) {
                              const route = tripMatch.route_name || `${tripMatch.origin} x ${tripMatch.destination}`;
                              nomeFinal = `${route} ${tripMatch.departure}`;
                            }
                            setAnaliseTopLines([...analiseTopLines, { nome: nomeFinal, quantidade: currentLineQtd.trim(), valor: currentLineValor.trim() }]);
                            setCurrentLineNome("");
                            setCurrentLineQtd("");
                            setCurrentLineValor("");
                          }
                        }}
                        placeholder="R$ Total" 
                        className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors"
                      />
                      <button 
                        onClick={() => {
                          if (currentLineNome.trim()) {
                            let nomeFinal = currentLineNome.trim();
                            const tripMatch = trips.find(t => t.code === nomeFinal || (t.route_name && t.route_name.includes(nomeFinal)));
                            if (tripMatch) {
                              const route = tripMatch.route_name || `${tripMatch.origin} x ${tripMatch.destination}`;
                              nomeFinal = `${route} ${tripMatch.departure}`;
                            }
                            setAnaliseTopLines([...analiseTopLines, { nome: nomeFinal, quantidade: currentLineQtd.trim(), valor: currentLineValor.trim() }]);
                            setCurrentLineNome("");
                            setCurrentLineQtd("");
                            setCurrentLineValor("");
                          }
                        }}
                        className="bg-[#8A05BE] hover:bg-[#8A05BE]/90 text-white px-3 rounded-xl transition-colors shrink-0 flex items-center justify-center font-bold"
                        title="Adicionar"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {analiseTopLines.length > 0 && (
                    <div className="flex flex-col gap-2 border-t border-border/50 pt-3">
                      {analiseTopLines.map((line, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-black/20 border border-white/5 px-3 py-2 rounded-lg text-sm">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{line.nome}</span>
                            <span className="text-xs text-muted-foreground">
                              {line.quantidade && `Qtd: ${line.quantidade}`}
                              {line.quantidade && line.valor && ` • `}
                              {line.valor && `Valor: ${line.valor}`}
                            </span>
                          </div>
                          <button 
                            onClick={() => setAnaliseTopLines(analiseTopLines.filter((_, i) => i !== idx))}
                            className="text-muted-foreground hover:text-danger transition-colors p-1 rounded-full hover:bg-danger/10"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
               
               <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 flex items-center justify-between">
                    Destinos Mais Vendidos (Cidades Pico)
                  </label>
                  
                  <div className="flex flex-col gap-2 mb-3">
                    <input 
                      type="text" 
                      value={currentDestNome}
                      onChange={(e) => setCurrentDestNome(e.target.value)}
                      placeholder="Destino (Ex: Teixeira de Freitas)" 
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors"
                    />
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={currentDestQtd}
                        onChange={(e) => setCurrentDestQtd(e.target.value)}
                        placeholder="Qtd" 
                        className="w-20 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors text-center"
                      />
                      <input 
                        type="text" 
                        value={currentDestValor}
                        onChange={(e) => setCurrentDestValor(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && currentDestNome.trim()) {
                            e.preventDefault();
                            let searchCode = currentDestNome.trim().toUpperCase();
                            let destFinal = currentDestNome.trim();
                            
                            const dictionaryMatch = cityCodes.find(c => c.code.toUpperCase() === searchCode);
                            if (dictionaryMatch) {
                                destFinal = dictionaryMatch.city_name;
                            } else {
                                const tripMatch = trips.find(t => t.destination_code === searchCode || t.origin_code === searchCode);
                                if (tripMatch) {
                                  if (tripMatch.origin_code === searchCode) {
                                    destFinal = tripMatch.origin;
                                  } else {
                                    destFinal = tripMatch.destination;
                                  }
                                }
                            }
                            setAnaliseTopDestinations([...analiseTopDestinations, { nome: destFinal, quantidade: currentDestQtd.trim(), valor: currentDestValor.trim() }]);
                            setCurrentDestNome("");
                            setCurrentDestQtd("");
                            setCurrentDestValor("");
                          }
                        }}
                        placeholder="R$ Total" 
                        className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors"
                      />
                      <button 
                        onClick={() => {
                          if (currentDestNome.trim()) {
                            let searchCode = currentDestNome.trim().toUpperCase();
                            let destFinal = currentDestNome.trim();
                            const dictionaryMatch = cityCodes.find(c => c.code.toUpperCase() === searchCode);
                            if (dictionaryMatch) {
                                destFinal = dictionaryMatch.city_name;
                            } else {
                                const tripMatch = trips.find(t => t.destination_code === searchCode || t.origin_code === searchCode);
                                if (tripMatch) {
                                  if (tripMatch.origin_code === searchCode) {
                                    destFinal = tripMatch.origin;
                                  } else {
                                    destFinal = tripMatch.destination;
                                  }
                                }
                            }
                            setAnaliseTopDestinations([...analiseTopDestinations, { nome: destFinal, quantidade: currentDestQtd.trim(), valor: currentDestValor.trim() }]);
                            setCurrentDestNome("");
                            setCurrentDestQtd("");
                            setCurrentDestValor("");
                          }
                        }}
                        className="bg-[#8A05BE] hover:bg-[#8A05BE]/90 text-white px-3 rounded-xl transition-colors shrink-0 flex items-center justify-center font-bold"
                        title="Adicionar"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {analiseTopDestinations.length > 0 && (
                    <div className="flex flex-col gap-2 border-t border-border/50 pt-3">
                      {analiseTopDestinations.map((dest, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-black/20 border border-white/5 px-3 py-2 rounded-lg text-sm">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{dest.nome}</span>
                            <span className="text-xs text-muted-foreground">
                              {dest.quantidade && `Qtd: ${dest.quantidade}`}
                              {dest.quantidade && dest.valor && ` • `}
                              {dest.valor && `Valor: ${dest.valor}`}
                            </span>
                          </div>
                          <button 
                            onClick={() => setAnaliseTopDestinations(analiseTopDestinations.filter((_, i) => i !== idx))}
                            className="text-muted-foreground hover:text-danger transition-colors p-1 rounded-full hover:bg-danger/10"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 block">Volume (Qtd)</label>
                    <input 
                      type="text" 
                      value={analiseVolumeVendas}
                      onChange={(e) => setAnaliseVolumeVendas(e.target.value)}
                      placeholder="Ex: 145" 
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 block">Faturamento</label>
                    <input 
                      type="text" 
                      value={analiseTotalVendas}
                      onChange={(e) => setAnaliseTotalVendas(e.target.value)}
                      placeholder="Ex: R$ 25k" 
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors"
                    />
                 </div>
               </div>
               
               <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 block">Ticket Médio Est.</label>
                  <input 
                    type="text" 
                    value={analiseTicketMedio}
                    onChange={(e) => setAnaliseTicketMedio(e.target.value)}
                    placeholder="Ex: R$ 180" 
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors text-[#8A05BE] font-bold"
                  />
               </div>
             </div>
             
             <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
               <h3 className="font-bold text-lg flex items-center gap-2 border-b border-border/50 pb-3">
                 <DollarSign className="size-5 text-success" /> Perfis de Receita
               </h3>
               
               <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 block">Taxas (Embarque / Cartão)</label>
                  <input 
                    type="text" 
                    value={analiseTaxas}
                    onChange={(e) => setAnaliseTaxas(e.target.value)}
                    placeholder="Ex: Alta / Média / Baixa" 
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors"
                  />
               </div>
               
               <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 block">Pico de Horário</label>
                  <input 
                    type="text" 
                    value={analiseHorario}
                    onChange={(e) => setAnaliseHorario(e.target.value)}
                    placeholder="Ex: 14h às 18h" 
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors"
                  />
               </div>
               
               <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 block">Principal Meio Pgt.</label>
                  <input 
                    type="text" 
                    value={analisePagamento}
                    onChange={(e) => setAnalisePagamento(e.target.value)}
                    placeholder="Ex: Pix 70%, Cartão 30%" 
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors"
                  />
               </div>

               <div className="pt-2 border-t border-white/5 space-y-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 block">Receita Origem x Destino</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                       <input 
                         type="text" 
                         value={analiseReceitaOrigem}
                         onChange={(e) => setAnaliseReceitaOrigem(e.target.value)}
                         placeholder="Origem (Ex: R$ 12k)" 
                         className="w-full sm:w-1/2 bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors"
                       />
                       <input 
                         type="text" 
                         value={analiseReceitaDestino}
                         onChange={(e) => setAnaliseReceitaDestino(e.target.value)}
                         placeholder="Destino (Ex: R$ 8k)" 
                         className="w-full sm:w-1/2 bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors"
                       />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 block">Receita p/ Rota</label>
                    <input 
                      type="text" 
                      value={analiseReceitaRota}
                      onChange={(e) => setAnaliseReceitaRota(e.target.value)}
                      placeholder="Ex: SP x BH (R$ 9k)" 
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 block">Receita p/ Horário</label>
                    <input 
                      type="text" 
                      value={analiseReceitaHorario}
                      onChange={(e) => setAnaliseReceitaHorario(e.target.value)}
                      placeholder="Ex: Manhã (R$ 2k), Tarde (R$ 5k)" 
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors"
                    />
                  </div>
               </div>
             </div>

             <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6 flex flex-col md:col-span-2 lg:col-span-1">
               <h3 className="font-bold text-lg border-b border-border/50 pb-3">Fatores Externos & Ocorrências</h3>
               
               <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 block">Clima e Ações Locais</label>
                  <input 
                    type="text" 
                    value={analiseClima}
                    onChange={(e) => setAnaliseClima(e.target.value)}
                    placeholder="Ex: Muita chuva / Ação da Gontijo" 
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors"
                  />
               </div>
               
               <div className="flex-1 flex flex-col">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 block">Análise Livre (Histórico Completo)</label>
                  <textarea 
                    value={analiseNotes}
                    onChange={(e) => setAnaliseNotes(e.target.value)}
                    placeholder="Descreva aqui o comportamento geral do dia..."
                    className="w-full flex-1 min-h-[150px] bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors resize-none"
                  ></textarea>
               </div>
             </div>
          </div>
        </div>

        <div className="p-6 border-t border-border/50 flex flex-col-reverse sm:flex-row justify-end gap-3 bg-black/10 rounded-b-3xl">
          <button 
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-white/5 transition-colors text-center"
          >
            Cancelar
          </button>
          <button 
            disabled={isSaving || !analiseEmpresa}
            onClick={handleSave}
            className="w-full sm:w-auto bg-[#8A05BE] hover:bg-[#8A05BE]/90 disabled:opacity-50 text-white font-bold px-8 py-3 sm:py-2.5 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isSaving ? "Salvando..." : "Salvar Análise Diária"}
          </button>
        </div>
      </div>
    </div>
  );
}
