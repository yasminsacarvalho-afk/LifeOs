import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnersRealtime } from "@/hooks/use-partners-realtime";
import { toast } from "sonner";
import type { CrmLead } from "@/hooks/use-crm-realtime";

interface Props {
  lead: CrmLead | null;
  open: boolean;
  onClose: () => void;
  defaultStatus?: string;
}

export function CrmLeadFormModal({ lead, open, onClose, defaultStatus = "nao_atendido" }: Props) {
  const { partners } = usePartnersRealtime();
  const [loading, setLoading] = useState(false);
  
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [destination, setDestination] = useState("");
  const [status, setStatus] = useState(defaultStatus);
  const [expectedValue, setExpectedValue] = useState("");
  const [estimatedCommission, setEstimatedCommission] = useState("");
  const [notes, setNotes] = useState("");
  const [targetCompanyId, setTargetCompanyId] = useState(""); 

  useEffect(() => {
    if (lead) {
      setClientName(lead.client_name);
      setPhone(lead.phone || "");
      setEmail(lead.email || "");
      setDestination(lead.desired_destination || "");
      setStatus(lead.status);
      setExpectedValue(lead.expected_value ? lead.expected_value.toString() : "");
      setEstimatedCommission(lead.estimated_commission ? lead.estimated_commission.toString() : "");
      setNotes(lead.notes || "");
      setTargetCompanyId(lead.target_company_id || "");
    } else {
      setClientName("");
      setPhone("");
      setEmail("");
      setDestination("");
      setStatus(defaultStatus);
      setExpectedValue("");
      setEstimatedCommission("");
      setNotes("");
      setTargetCompanyId("");
    }
  }, [lead, open, defaultStatus]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      client_name: clientName,
      phone: phone || null,
      email: email || null,
      desired_destination: destination || null,
      status,
      expected_value: Number(expectedValue) || 0,
      estimated_commission: Number(estimatedCommission) || null,
      notes,
      target_company_id: targetCompanyId || null,
    };

    try {
      toast.loading("Salvando lead...", { id: "lead-save" });

      if (lead) {
        const { error } = await supabase.from("crm_leads").update(payload).eq("id", lead.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("crm_leads").insert([payload]);
        if (error) throw error;
      }

      toast.success("Lead salvo com sucesso!", { id: "lead-save" });
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === '42P01') {
        toast.error("Tabela crm_leads não existe. Execute o SQL no Supabase.", { id: "lead-save" });
      } else {
        toast.error("Erro ao salvar lead.", { id: "lead-save" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            {lead ? "Editar Atendimento" : "Novo Atendimento"}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/5">
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome do Cliente / Contato</label>
            <input
              required
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex: João Silva"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Destino Desejado (Cidade)</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Ex: Porto Seguro, BA"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
               <label className="text-sm font-medium">Estágio (Status)</label>
               <select
                 value={status}
                 onChange={(e) => setStatus(e.target.value)}
                 className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
               >
                 <option value="nao_atendido">Não Atendido</option>
                 <option value="em_atendimento">Em Atendimento</option>
                 <option value="aguardando">Aguardando</option>
                 <option value="venda">Venda</option>
                 <option value="revenda">Revenda</option>
                 <option value="lead">Lead (Frio/Morno)</option>
               </select>
            </div>
            <div className="space-y-2">
               <label className="text-sm font-medium">Ticket Estimado (R$)</label>
               <input
                 type="number"
                 step="0.01"
                 min="0"
                 value={expectedValue}
                 onChange={(e) => setExpectedValue(e.target.value)}
                 placeholder="0.00"
                 className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-success focus:outline-none text-success"
               />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Empresa Desejada</label>
              <select
                value={targetCompanyId}
                onChange={(e) => {
                  setTargetCompanyId(e.target.value);
                  // Auto-calculate commission if target company selected and expectedValue exists
                  if (e.target.value && expectedValue) {
                    const p = partners.find(part => part.id === e.target.value);
                    if (p && p.comissao) {
                       setEstimatedCommission((Number(expectedValue) * (Number(p.comissao)/100)).toFixed(2));
                    }
                  }
                }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Não especificada</option>
                {partners.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
               <label className="text-sm font-medium">Comissão Estimada (R$)</label>
               <input
                 type="number"
                 step="0.01"
                 min="0"
                 value={estimatedCommission}
                 onChange={(e) => setEstimatedCommission(e.target.value)}
                 placeholder="0.00"
                 className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none text-primary"
               />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Informações Importantes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Trecho da viagem, dúvidas, objeções..."
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none"
            />
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Save className="size-4" />
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
