import { useEffect, useState } from "react";
import { X, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnersRealtime } from "@/hooks/use-partners-realtime";
import { useTripsRealtime } from "@/hooks/use-trips-realtime";
import { useContactsRealtime } from "@/hooks/use-contacts";
import type { UiPackage } from "@/hooks/use-packages-realtime";

interface Props {
  pkg: UiPackage | null;
  open: boolean;
  onClose: () => void;
}

export function PackageFormModal({ pkg, open, onClose }: Props) {
  const { partners } = usePartnersRealtime();
  const { trips } = useTripsRealtime();

  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [senderName, setSenderName] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [price, setPrice] = useState("");
  const [direction, setDirection] = useState("envio");
  const [companyId, setCompanyId] = useState("");
  const [tripId, setTripId] = useState("");
  const [deliveryPersonId, setDeliveryPersonId] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [deliveryPaid, setDeliveryPaid] = useState(false);

  const { contacts } = useContactsRealtime();

  useEffect(() => {
    if (pkg) {
      setCode(pkg.code);
      setSenderName(pkg.sender_name);
      setReceiverName(pkg.receiver_name);
      setOrigin(pkg.origin);
      setDestination(pkg.destination);
      setPrice(pkg.price.toString());
      setDirection(pkg.direction || "envio");
      setCompanyId(pkg.company_id || "");
      setTripId(pkg.trip_id || "");
      setDeliveryPersonId(pkg.delivery_person_id || "");
      setDeliveryFee(pkg.delivery_fee ? pkg.delivery_fee.toString() : "");
      setDeliveryPaid(pkg.delivery_paid || false);
    } else {
      setCode(`PKG-${Math.floor(Math.random() * 100000)}`);
      setSenderName("");
      setReceiverName("");
      setOrigin("");
      setDestination("");
      setPrice("");
      setDirection("envio");
      setCompanyId("");
      setTripId("");
      setDeliveryPersonId("");
      setDeliveryFee("");
      setDeliveryPaid(false);
    }
  }, [pkg, open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const priceNum = Number(price);
    const commissionNum = direction === "envio" ? priceNum * 0.10 : priceNum * 0.15;

    const payload = {
      code,
      sender_name: senderName,
      receiver_name: receiverName,
      origin,
      destination,
      direction,
      price: priceNum,
      commission: commissionNum,
      company_id: companyId || null,
      trip_id: tripId || null,
      delivery_person_id: deliveryPersonId || null,
      delivery_fee: Number(deliveryFee) || 0,
      delivery_paid: deliveryPaid,
    };

    try {
      if (pkg) {
        await supabase.from("packages").update(payload).eq("id", pkg.id);
      } else {
        await supabase.from("packages").insert(payload);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar encomenda");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            {pkg ? "Editar Encomenda" : "Nova Encomenda"}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/5">
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Código Rastreio</label>
              <input
                required
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Operação</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="envio">Envio (Eu Envio) - 10%</option>
                <option value="recebimento">Recebimento (Eu Recebo) - 15%</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Remetente</label>
              <input
                required
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Destinatário</label>
              <input
                required
                type="text"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Frete (R$)</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ex: 50.00"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cidade Origem</label>
              <input
                required
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cidade Destino</label>
              <input
                required
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Empresa Responsável</label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Selecione...</option>
                {partners.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Embarcar na Frota</label>
              <select
                value={tripId}
                onChange={(e) => setTripId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Nenhuma selecionada...</option>
                {trips.map(t => (
                  <option key={t.id} value={t.id}>{t.code} - {t.destination}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
            <div className="space-y-2">
              <label className="text-sm font-medium">Entregador</label>
              <select
                value={deliveryPersonId}
                onChange={(e) => setDeliveryPersonId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Nenhum...</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.agency_company ? `(${c.agency_company})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Taxa de Entrega (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                placeholder="Ex: 15.00"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none text-info"
              />
            </div>
            <div className="space-y-2 flex flex-col justify-end pb-2">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer w-max">
                <input
                  type="checkbox"
                  checked={deliveryPaid}
                  onChange={(e) => setDeliveryPaid(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary size-4"
                />
                Entregador Pago?
              </label>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-border">
            <div className="mr-auto self-center text-xs text-muted-foreground flex items-center gap-1">
              <span className="font-semibold text-primary">Comissão Automática:</span> 
              {direction === "envio" ? "10%" : "15%"}
            </div>
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
              {loading ? "Salvando..." : "Salvar Encomenda"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
