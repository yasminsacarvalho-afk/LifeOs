import { useState } from "react";
import { X, CheckCircle2, DollarSign, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { UiPackage } from "@/hooks/use-packages-realtime";

interface Props {
  packages: UiPackage[];
  open: boolean;
  onClose: () => void;
}

export function DeliverySettlementModal({ packages, open, onClose }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  if (!open) return null;

  // Agrupar pacotes por entregador
  const packagesWithDelivery = packages.filter(p => p.delivery_person_id);
  
  const settlementData = packagesWithDelivery.reduce((acc, pkg) => {
    const personId = pkg.delivery_person_id!;
    const personName = pkg.delivery_person_name || "Entregador Desconhecido";
    
    if (!acc[personId]) {
      acc[personId] = {
        id: personId,
        name: personName,
        totalDeliveries: 0,
        pendingDeliveries: 0,
        totalPaid: 0,
        totalPendingAmount: 0,
        pendingPackageIds: []
      };
    }

    acc[personId].totalDeliveries += 1;
    
    if (pkg.delivery_paid) {
      acc[personId].totalPaid += Number(pkg.delivery_fee) || 0;
    } else {
      acc[personId].pendingDeliveries += 1;
      acc[personId].totalPendingAmount += Number(pkg.delivery_fee) || 0;
      acc[personId].pendingPackageIds.push(pkg.id);
    }

    return acc;
  }, {} as Record<string, any>);

  const deliveryPersons = Object.values(settlementData).sort((a, b) => b.totalPendingAmount - a.totalPendingAmount);

  const handlePayAll = async (personId: string, packageIds: string[], amount: number) => {
    if (!confirm(`Confirmar o repasse de R$ ${amount.toFixed(2)} para este entregador?`)) return;
    
    setLoading(personId);
    try {
      toast.loading("Baixando pagamentos...", { id: "pay-all" });
      const { error } = await supabase
        .from("packages")
        .update({ delivery_paid: true })
        .in("id", packageIds);
        
      if (error) throw error;
      toast.success("Pagamentos baixados com sucesso!", { id: "pay-all" });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao dar baixa nos pagamentos.", { id: "pay-all" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl p-6 max-h-[85vh] flex flex-col">
        <div className="mb-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <Wallet className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Acerto de Entregadores</h2>
              <p className="text-sm text-muted-foreground">Repasses pendentes de taxas de entrega.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/5">
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 hide-scrollbar">
          {deliveryPersons.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl">
              Nenhum entregador vinculado a encomendas no momento.
            </div>
          ) : (
            deliveryPersons.map(person => (
              <div key={person.id} className="border border-border/80 bg-card rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{person.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {person.totalDeliveries} entregas totais registradas
                    </p>
                  </div>
                  {person.pendingDeliveries === 0 && (
                     <span className="flex items-center gap-1.5 bg-success/10 text-success border border-success/20 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                       <CheckCircle2 className="size-3" /> Tudo Pago
                     </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                     <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">Total Já Pago</span>
                     <span className="font-mono text-foreground font-semibold">R$ {person.totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
                     <span className="text-[10px] uppercase font-bold text-primary tracking-wider block mb-1">
                        Pendente ({person.pendingDeliveries} entregas)
                     </span>
                     <span className="font-mono text-primary font-bold text-lg">R$ {person.totalPendingAmount.toFixed(2)}</span>
                  </div>
                </div>

                {person.pendingDeliveries > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/50 flex justify-end">
                    <button
                      onClick={() => handlePayAll(person.id, person.pendingPackageIds, person.totalPendingAmount)}
                      disabled={loading === person.id}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all shadow-sm shadow-primary/20"
                    >
                      <DollarSign className="size-4" />
                      {loading === person.id ? "Processando..." : "Baixar Pagamento Pendente"}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
