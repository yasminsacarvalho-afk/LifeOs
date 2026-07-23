import { useState, useEffect, useMemo } from "react";
import { X, Save, Plus, Trash2, MapPin, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnersRealtime } from "@/hooks/use-partners-realtime";
import { useTripsRealtime } from "@/hooks/use-trips-realtime";

interface CityCode {
  id: string;
  city_name: string;
  code: string;
  company_id: string | null;
}

interface CityCodesModalProps {
  open: boolean;
  onClose: () => void;
}

export function CityCodesModal({ open, onClose }: CityCodesModalProps) {
  const { partners } = usePartnersRealtime();
  const { trips } = useTripsRealtime();
  
  const [codes, setCodes] = useState<CityCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [cityName, setCityName] = useState("");
  const [code, setCode] = useState("");
  const [companyId, setCompanyId] = useState("");

  const suggestedCities = useMemo(() => {
    const suggestions = new Map<string, { city_name: string, code: string }>();

    trips.forEach(t => {
      if (t.origin && t.origin_code) {
        const cName = t.origin.trim();
        const cCode = t.origin_code.trim().toUpperCase();
        if (cName && cCode) suggestions.set(cCode, { city_name: cName, code: cCode });
      }
      if (t.destination && t.destination_code) {
        const cName = t.destination.trim();
        const cCode = t.destination_code.trim().toUpperCase();
        if (cName && cCode) suggestions.set(cCode, { city_name: cName, code: cCode });
      }
    });

    // Remove as que já estão no dicionário
    codes.forEach(c => {
      suggestions.delete(c.code.toUpperCase());
    });

    return Array.from(suggestions.values()).sort((a, b) => a.city_name.localeCompare(b.city_name));
  }, [trips, codes]);

  const fetchCodes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("city_codes")
      .select("*")
      .order("city_name", { ascending: true });
      
    if (error) {
      console.error(error);
    } else if (data) {
      setCodes(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (open) {
      fetchCodes();
    } else {
      setCityName("");
      setCode("");
      setCompanyId("");
      setEditingId(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityName || !code) {
      alert("Preencha a cidade e o código.");
      return;
    }

    const normalizedCity = cityName.trim();
    const normalizedCode = code.trim().toUpperCase();

    // Validação de unicidade
    const cityExists = codes.find(c => c.city_name.toUpperCase() === normalizedCity.toUpperCase() && c.id !== editingId);
    if (cityExists) {
      alert(`A cidade "${normalizedCity}" já está cadastrada com o código "${cityExists.code}". Não é permitido cadastrar cidades duplicadas.`);
      return;
    }

    const codeExists = codes.find(c => c.code.toUpperCase() === normalizedCode && c.id !== editingId);
    if (codeExists) {
      alert(`O código "${normalizedCode}" já está sendo utilizado pela cidade "${codeExists.city_name}". Cada código deve ser único.`);
      return;
    }

    setIsSubmitting(true);
    const payload = {
      city_name: normalizedCity,
      code: normalizedCode,
      company_id: companyId || null
    };

    if (editingId) {
      const { error } = await supabase.from("city_codes").update(payload).eq("id", editingId);
      if (error) {
        alert(`Erro ao atualizar: ${error.message}`);
      } else {
        setCityName("");
        setCode("");
        setCompanyId("");
        setEditingId(null);
        fetchCodes();
      }
    } else {
      const { error } = await supabase.from("city_codes").insert([payload]);
      if (error) {
        alert(`Erro ao salvar: ${error.message}`);
      } else {
        setCityName("");
        setCode("");
        setCompanyId("");
        fetchCodes();
      }
    }
    
    setIsSubmitting(false);
  };

  const handleSyncAll = async () => {
    if (!confirm(`Deseja importar todas as ${suggestedCities.length} cidades sugeridas do monitor?`)) return;
    setIsSubmitting(true);
    
    const payloads = suggestedCities.map(s => ({
      city_name: s.city_name,
      code: s.code,
      company_id: null
    }));
    
    const { error } = await supabase.from("city_codes").insert(payloads);
    
    if (error) {
      alert("Erro ao sincronizar: " + error.message);
    } else {
      fetchCodes();
    }
    
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este código?")) return;
    
    const { error } = await supabase.from("city_codes").delete().eq("id", id);
    if (error) {
      alert("Não foi possível excluir o código.");
    } else {
      fetchCodes();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-white/10 bg-[#0A0A0A] shadow-2xl animate-in zoom-in-95 duration-200 hide-scrollbar overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-[#8A05BE]/20 rounded-xl">
               <MapPin className="size-6 text-[#8A05BE]" />
             </div>
             <div>
               <h2 className="text-xl font-bold tracking-tight text-white">
                 Dicionário de Cidades
               </h2>
               <p className="text-sm text-muted-foreground mt-1">Cadastre os códigos (siglas) das cidades para inteligência de dados.</p>
             </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row overflow-hidden flex-1">
          
          {/* Form Side */}
          <div className="w-full md:w-1/3 p-6 border-r border-white/10 bg-white/5 flex-shrink-0">
             <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
               {editingId ? "Editar Código" : "Novo Código"}
             </h3>
             
             <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/70">Nome da Cidade <span className="text-[#8A05BE]">*</span></label>
                  <input
                    type="text"
                    placeholder="Ex: Teófilo Otoni"
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8A05BE] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/70">Código / Sigla <span className="text-[#8A05BE]">*</span></label>
                  <input
                    type="text"
                    placeholder="Ex: TEO"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8A05BE] uppercase transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/70">Vincular Empresa (Opcional)</label>
                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8A05BE] transition-all"
                  >
                    <option value="" className="bg-black">-- Todas as Empresas --</option>
                    {partners.map(p => (
                      <option key={p.id} value={p.id} className="bg-black text-white">{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#8A05BE] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-all shadow-lg hover:shadow-[#8A05BE]/20 disabled:opacity-50"
                  >
                    {isSubmitting ? "Salvando..." : editingId ? <><Save className="size-4" /> Atualizar</> : <><Plus className="size-4" /> Adicionar</>}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setCityName("");
                        setCode("");
                        setCompanyId("");
                      }}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                {suggestedCities.length > 0 && !editingId && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>Sugestões do Monitor</span>
                        <span className="bg-[#8A05BE]/20 text-[#8A05BE] px-1.5 py-0.5 rounded text-[8px]">{suggestedCities.length}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={handleSyncAll} 
                        disabled={isSubmitting} 
                        className="text-[#8A05BE] hover:underline font-bold text-[10px]"
                      >
                        Importar Todas
                      </button>
                    </h4>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto hide-scrollbar">
                      {suggestedCities.map(s => (
                        <button
                          key={s.code}
                          type="button"
                          onClick={() => {
                            setCityName(s.city_name);
                            setCode(s.code);
                          }}
                          className="text-xs bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg hover:bg-white/20 hover:border-white/30 text-white transition-all text-left flex items-center gap-2 group"
                        >
                          <span className="font-bold group-hover:text-[#8A05BE] transition-colors">{s.city_name}</span>
                          <span className="font-mono text-muted-foreground text-[9px] bg-black/50 px-1 rounded">{s.code}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
             </form>
          </div>

          {/* List Side */}
          <div className="flex-1 overflow-y-auto p-6 bg-black/20">
             <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Códigos Cadastrados ({codes.length})</h3>
             
             {isLoading ? (
               <div className="flex justify-center py-10">
                 <div className="animate-spin size-6 border-2 border-[#8A05BE] border-t-transparent rounded-full"></div>
               </div>
             ) : codes.length === 0 ? (
               <div className="text-center text-sm text-muted-foreground py-10 border border-dashed border-white/10 rounded-2xl">
                 Nenhum código cadastrado ainda.
               </div>
             ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {codes.map(c => {
                   const company = partners.find(p => p.id === c.company_id);
                   return (
                     <div key={c.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex justify-between items-start group hover:border-white/20 transition-all">
                       <div>
                         <div className="flex items-center gap-2 mb-1">
                           <span className="bg-[#8A05BE]/20 text-white font-mono text-xs px-2 py-0.5 rounded font-bold">{c.code}</span>
                           <span className="text-sm font-bold text-white">{c.city_name}</span>
                         </div>
                         {company ? (
                           <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{company.name}</div>
                         ) : (
                           <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Global</div>
                         )}
                       </div>
                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                         <button onClick={() => {
                           setEditingId(c.id);
                           setCityName(c.city_name);
                           setCode(c.code);
                           setCompanyId(c.company_id || "");
                         }} className="p-1.5 text-muted-foreground hover:text-[#8A05BE] hover:bg-[#8A05BE]/10 rounded-md transition-all">
                           <Edit2 className="size-3.5" />
                         </button>
                         <button onClick={() => handleDelete(c.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all">
                           <Trash2 className="size-3.5" />
                         </button>
                       </div>
                     </div>
                   )
                 })}
               </div>
             )}
          </div>

        </div>
      </div>
    </div>
  );
}
