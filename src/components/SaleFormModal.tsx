import { useEffect, useState } from "react";
import { 
  X, Save, Banknote, CreditCard, QrCode, 
  Smartphone, Globe, MessageCircle, MapPin, 
  Building2, User, Truck, Calendar, DollarSign
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnersRealtime } from "@/hooks/use-partners-realtime";
import { useTripsRealtime } from "@/hooks/use-trips-realtime";
import type { UiSale } from "@/hooks/use-sales-realtime";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { getLocalToday } from "@/lib/date-helpers";

interface Props {
  sale: UiSale | null;
  open: boolean;
  onClose: () => void;
}

const PAYMENT_METHODS = [
  { id: "Dinheiro", label: "Dinheiro", icon: Banknote },
  { id: "PIX", label: "PIX", icon: QrCode },
  { id: "Cartão de Crédito", label: "Crédito", icon: CreditCard },
  { id: "Cartão de Débito", label: "Débito", icon: CreditCard },
  { id: "Boleto", label: "Boleto", icon: Banknote },
];

const SALES_CHANNELS = [
  { id: "Balcão", label: "Balcão", icon: MapPin },
  { id: "WhatsApp", label: "WhatsApp", icon: MessageCircle },
  { id: "Instagram", label: "Instagram", icon: Smartphone },
  { id: "Site", label: "Site", icon: Globe },
  { id: "Telefone", label: "Telefone", icon: Smartphone },
];

export function SaleFormModal({ sale, open, onClose }: Props) {
  const { partners } = usePartnersRealtime();
  const { trips } = useTripsRealtime();
  const [sellers, setSellers] = useState<Tables<"sellers">[]>([]);

  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [commission, setCommission] = useState("");
  const [saleDate, setSaleDate] = useState(getLocalToday());
  const [companyId, setCompanyId] = useState("");
  const [tripId, setTripId] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Dinheiro");
  const [salesChannel, setSalesChannel] = useState("Balcão");

  useEffect(() => {
    supabase.from("sellers").select("*").then(({ data }) => {
      if (data) setSellers(data);
    });
  }, []);

  useEffect(() => {
    if (sale) {
      setAmount(sale.amount.toString());
      setCommission(sale.commission_amount.toString());
      setSaleDate(sale.sale_date);
      setCompanyId(sale.company_id || "");
      setTripId(sale.trip_id || "");
      setSellerId(sale.seller_id || "");
      setPaymentMethod(sale.payment_method || "Dinheiro");
      setSalesChannel(sale.sales_channel || "Balcão");
    } else {
      setAmount("");
      setCommission("");
      setSaleDate(getLocalToday());
      setCompanyId("");
      setTripId("");
      setSellerId("");
      setPaymentMethod("Dinheiro");
      setSalesChannel("Balcão");
    }
  }, [sale, open]);

  // Auto-fill vendedor logado
  useEffect(() => {
    async function autoSetSeller() {
      if (!sale && open && sellers.length > 0 && !sellerId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email) {
          const emailLower = user.email.toLowerCase();
          const nameFromEmail = emailLower.split("@")[0];
          
          const match = sellers.find(s => 
            s.email?.toLowerCase() === emailLower ||
            s.name.toLowerCase().includes(nameFromEmail) ||
            nameFromEmail.includes(s.name.toLowerCase().split(' ')[0])
          );
          
          if (match) {
            setSellerId(match.id);
          }
        }
      }
    }
    autoSetSeller();
  }, [sale, open, sellers, sellerId]);

  // Auto-calcular comissão se empresa for selecionada e houver um amount
  useEffect(() => {
    if (!sale && companyId && amount) {
      const p = partners.find(p => p.id === companyId);
      if (p && p.comissao !== undefined && p.comissao !== null) {
        const val = (Number(amount) * Number(p.comissao)) / 100;
        setCommission(val.toFixed(2));
      }
    }
  }, [companyId, amount, partners, sale]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      amount: Number(amount),
      commission_amount: Number(commission),
      sale_date: saleDate,
      company_id: companyId || null,
      trip_id: tripId || null,
      seller_id: sellerId || null,
      payment_method: paymentMethod || null,
      sales_channel: salesChannel || null,
    };

    try {
      if (sale) {
        await supabase.from("sales").update(payload).eq("id", sale.id);
      } else {
        await supabase.from("sales").insert(payload);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar venda");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-3xl rounded-t-3xl sm:rounded-3xl border-t sm:border border-border bg-card shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[95vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <DollarSign className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {sale ? "Editar Venda" : "Registrar Nova Venda"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Preencha os valores e selecione as opções de forma rápida.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 bg-card hover:bg-muted border border-border transition-colors">
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin scrollbar-thumb-border">
          <form id="sale-form" onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            
            {/* Valores Principais - DESTAQUE */}
            <div className="grid sm:grid-cols-2 gap-6 bg-muted/10 p-5 rounded-2xl border border-border/50">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Valor da Venda *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-xl font-medium text-muted-foreground">R$</span>
                  </div>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-primary/20 bg-card pl-10 sm:pl-12 pr-4 py-3 sm:py-4 text-2xl sm:text-3xl font-mono font-bold text-success focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Comissão Gerada *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-xl font-medium text-muted-foreground">R$</span>
                  </div>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-danger/20 bg-card pl-10 sm:pl-12 pr-4 py-3 sm:py-4 text-2xl sm:text-3xl font-mono font-bold text-danger focus:border-danger focus:ring-2 focus:ring-danger/20 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Configurações Rápidas - Quick Selects */}
            <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
              
              {/* Forma de Pagamento */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((method) => {
                    const Icon = method.icon;
                    const isActive = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id)}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200",
                          isActive 
                            ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]" 
                            : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
                        )}
                      >
                        <Icon className={cn("size-5 mb-1.5", isActive ? "opacity-100" : "opacity-70")} />
                        <span className="text-xs font-medium">{method.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Canal de Venda */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Canal de Venda</label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                  {SALES_CHANNELS.map((channel) => {
                    const Icon = channel.icon;
                    const isActive = salesChannel === channel.id;
                    return (
                      <button
                        key={channel.id}
                        type="button"
                        onClick={() => setSalesChannel(channel.id)}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200",
                          isActive 
                            ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]" 
                            : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
                        )}
                      >
                        <Icon className={cn("size-5 mb-1.5", isActive ? "opacity-100" : "opacity-70")} />
                        <span className="text-[10px] font-medium uppercase tracking-wider">{channel.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <hr className="border-border/50" />

            {/* Dados Opcionais e Complementares */}
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                 Informações Complementares
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Data */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center gap-1"><Calendar className="size-3"/> Data *</label>
                  <input
                    required
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                {/* Empresa */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center gap-1"><Building2 className="size-3"/> Empresa</label>
                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none transition-all"
                  >
                    <option value="">Nenhuma...</option>
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.comissao || 0}%)</option>
                    ))}
                  </select>
                </div>

                {/* Vendedor */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center gap-1"><User className="size-3"/> Vendedor</label>
                  <select
                    value={sellerId}
                    onChange={(e) => setSellerId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none transition-all"
                  >
                    <option value="">Nenhum...</option>
                    {sellers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Viagem */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center gap-1"><Truck className="size-3"/> Viagem</label>
                  <select
                    value={tripId}
                    onChange={(e) => setTripId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none transition-all"
                  >
                    <option value="">Nenhuma...</option>
                    {trips.map(t => (
                      <option key={t.id} value={t.id}>{t.code} - {t.destination}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-border bg-muted/20 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl px-5 py-3 sm:py-2.5 text-sm font-medium hover:bg-card border border-transparent hover:border-border transition-all"
          >
            Cancelar
          </button>
          <button
            form="sale-form"
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-xl bg-primary px-6 py-3 sm:py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-lg shadow-primary/20 transition-all active:scale-95"
          >
            <Save className="size-5" />
            {loading ? "Salvando..." : "Confirmar Venda"}
          </button>
        </div>

      </div>
    </div>
  );
}
