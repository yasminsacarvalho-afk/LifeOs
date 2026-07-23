import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface CompetitorPrice {
  id: string;
  competitor: string;
  service: string;
  
  competitorPrice: number;
  competitorClass: string;
  notes: string; // Their notes
  
  ourPrice: number;
  ourClass: string;
  ourNotes: string; // Our notes
  
  difference: number;
  lastChecked: string;
  customFields?: Record<string, string>;
}

interface CompetitorPriceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (price: Omit<CompetitorPrice, "id" | "difference" | "lastChecked">) => void;
  initialData?: CompetitorPrice | null;
}

export function CompetitorPriceFormModal({ isOpen, onClose, onSave, initialData }: CompetitorPriceFormModalProps) {
  const [formData, setFormData] = useState({
    competitor: "",
    service: "",
    competitorPrice: 0,
    competitorClass: "",
    notes: "",
    ourPrice: 0,
    ourClass: "",
    ourNotes: "",
  });
  
  const [customFields, setCustomFields] = useState<{key: string, value: string}[]>([]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        competitor: initialData.competitor || "",
        service: initialData.service || "",
        competitorPrice: initialData.competitorPrice || 0,
        competitorClass: initialData.competitorClass || "",
        notes: initialData.notes || "",
        ourPrice: initialData.ourPrice || 0,
        ourClass: initialData.ourClass || "",
        ourNotes: initialData.ourNotes || "",
      });
      if (initialData.customFields) {
        setCustomFields(Object.entries(initialData.customFields).map(([k, v]) => ({ key: k, value: v })));
      } else {
        setCustomFields([]);
      }
    } else {
      setFormData({
        competitor: "",
        service: "",
        competitorPrice: 0,
        competitorClass: "",
        notes: "",
        ourPrice: 0,
        ourClass: "",
        ourNotes: "",
      });
      setCustomFields([]);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fieldsRecord: Record<string, string> = {};
    customFields.forEach(f => {
      if (f.key.trim()) fieldsRecord[f.key.trim()] = f.value;
    });
    onSave({ ...formData, customFields: fieldsRecord });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
        <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">{initialData ? "Editar" : "Adicionar"} Concorrente</h2>
            <p className="text-sm text-muted-foreground mt-1">Batalha de Serviços: Nós x Eles</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Nome do Concorrente</label>
              <input
                type="text"
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                value={formData.competitor}
                onChange={e => setFormData({ ...formData, competitor: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold">Rota / Serviço Monitorado</label>
              <input
                type="text"
                required
                placeholder="Ex: SP -> RJ"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                value={formData.service}
                onChange={e => setFormData({ ...formData, service: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* O Deles */}
            <div className="space-y-4 p-4 rounded-xl border border-danger/20 bg-danger/5 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-2 text-[10px] font-bold text-danger bg-danger/10 rounded-bl-xl uppercase tracking-widest">O Deles</div>
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-danger">Preço Deles (R$)</label>
                 <input
                   type="number"
                   min="0"
                   step="0.01"
                   required
                   className="w-full rounded-xl border border-danger/20 bg-background px-4 py-2 text-sm outline-none focus:border-danger transition-colors"
                   value={formData.competitorPrice}
                   onChange={e => setFormData({ ...formData, competitorPrice: Number(e.target.value) })}
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-danger">Classe Deles</label>
                 <input
                   type="text"
                   placeholder="Ex: Convencional"
                   className="w-full rounded-xl border border-danger/20 bg-background px-4 py-2 text-sm outline-none focus:border-danger transition-colors"
                   value={formData.competitorClass}
                   onChange={e => setFormData({ ...formData, competitorClass: e.target.value })}
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-danger">Diferenciais Deles</label>
                 <textarea
                   rows={2}
                   placeholder="Ex: Sem água, poltrona apertada"
                   className="w-full rounded-xl border border-danger/20 bg-background px-4 py-2 text-sm outline-none focus:border-danger transition-colors resize-none"
                   value={formData.notes}
                   onChange={e => setFormData({ ...formData, notes: e.target.value })}
                 />
               </div>
            </div>

            {/* O Nosso */}
            <div className="space-y-4 p-4 rounded-xl border border-success/20 bg-success/5 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-2 text-[10px] font-bold text-success bg-success/10 rounded-bl-xl uppercase tracking-widest">O Nosso</div>
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-success">Nosso Preço (R$)</label>
                 <input
                   type="number"
                   min="0"
                   step="0.01"
                   required
                   className="w-full rounded-xl border border-success/20 bg-background px-4 py-2 text-sm outline-none focus:border-success transition-colors"
                   value={formData.ourPrice}
                   onChange={e => setFormData({ ...formData, ourPrice: Number(e.target.value) })}
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-success">Nossa Classe</label>
                 <input
                   type="text"
                   placeholder="Ex: Semi-Leito VIP"
                   className="w-full rounded-xl border border-success/20 bg-background px-4 py-2 text-sm outline-none focus:border-success transition-colors"
                   value={formData.ourClass}
                   onChange={e => setFormData({ ...formData, ourClass: e.target.value })}
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-success">Nossos Diferenciais</label>
                 <textarea
                   rows={2}
                   placeholder="Ex: Kit Lanche, Poltrona Leito, Água gelada"
                   className="w-full rounded-xl border border-success/20 bg-background px-4 py-2 text-sm outline-none focus:border-success transition-colors resize-none"
                   value={formData.ourNotes}
                   onChange={e => setFormData({ ...formData, ourNotes: e.target.value })}
                 />
               </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
             <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-primary">Critérios Customizados de Avaliação</label>
                <button type="button" onClick={() => setCustomFields([...customFields, {key: '', value: ''}])} className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors">+ Adicionar Critério</button>
             </div>
             {customFields.length === 0 && (
               <div className="text-xs text-muted-foreground italic">Ex: Tempo de Viagem (Deles 8h, Nosso 7h), Paradas, etc.</div>
             )}
             {customFields.map((field, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-muted/10 p-2 rounded-xl">
                   <input type="text" placeholder="Critério (ex: Wi-Fi?)" className="w-1/3 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" value={field.key} onChange={e => { const newF = [...customFields]; newF[idx].key = e.target.value; setCustomFields(newF); }} />
                   <input type="text" placeholder="Resultado / Comparação" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" value={field.value} onChange={e => { const newF = [...customFields]; newF[idx].value = e.target.value; setCustomFields(newF); }} />
                   <button type="button" onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))} className="text-danger hover:text-danger/80 p-2 bg-danger/10 rounded-lg"><X className="size-4"/></button>
                </div>
             ))}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
            >
              Salvar Monitoramento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
