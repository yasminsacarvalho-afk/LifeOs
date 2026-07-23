import { useState } from "react";
import { Building2, TrendingUp, ShieldCheck, X, FileText, RefreshCw, Scale, DollarSign, Car, BarChart3, MapPin, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PartnerWithTrips } from "@/hooks/use-partners-realtime";

// Importações das imagens locais
import aguiaImg from "@/aguia.jpg";
import brasileiroImg from "@/Brasileiro.png";
import cidadeImg from "@/Cidadesol.webp";
import rotaImg from "@/rota.png";
import gontijoImg from "@/Gontijo.jpg";

// import brasileiroImg from "@/Brasileiro.jpg";
// import nacionalImg from "@/nacional.jpg";
// import gontijoImg from "@/gontijo.jpg";

interface Props {
  partners: PartnerWithTrips[];
  sales?: any[];
  closings?: any[];
}

/**
 * ==========================================
 * ÁREA DE CONFIGURAÇÃO DE IMAGENS DAS EMPRESAS
 * ==========================================
 * Cole aqui os links das imagens que deseja usar como "Capa" para cada empresa.
 * Se o nome da empresa for "Gontijo", crie uma chave "Gontijo": "https://link-da-imagem.com/foto.jpg".
 * 
 * DICA: Tente usar imagens em alta resolução, horizontais (ex: fotos de ônibus ou garagens).
 */
const PARTNER_IMAGES: Record<string, string> = {
  "aguia branca": aguiaImg,
  "rota": rotaImg,
  "gontijo": gontijoImg,
  "brasileiro": brasileiroImg,

  "cidadedosol": cidadeImg,
  "nacional": "https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=1000",
  // Imagem padrão caso a empresa não esteja mapeada acima
  "default": "https://images.unsplash.com/photo-1534008897995-27a23e859048?auto=format&fit=crop&q=80&w=1000"
};

// Função auxiliar para remover acentos e deixar em minúsculo, garantindo que o nome do banco sempre faça "match"
const normalizeName = (name: string) => {
  if (!name) return "";
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

function FormattedText({ text }: { text?: string | null }) {
  if (!text) return <p className="text-sm text-muted-foreground">Nenhuma informação cadastrada.</p>;
  
  const lines = text.split('\n');

  return (
    <div className="space-y-3">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        
        // Regex para capturar: TEXTO EM MAIÚSCULAS (incluindo números e espaços) - Descrição
        const match = trimmed.match(/^([A-ZÀ-Ú0-9\s]+)\s*-\s*(.*)$/);
        
        if (match) {
          const title = match[1].trim();
          const desc = match[2].trim();
          
          const isRedFlag = title.includes("REDFLAG") || title.includes("RED FLAG");
          
          if (isRedFlag) {
            return (
              <div key={idx} className="bg-danger/10 border border-danger/20 rounded-lg p-3 flex flex-col gap-1 shadow-sm mt-2">
                <span className="font-bold text-danger uppercase flex items-center gap-1.5 text-xs tracking-widest"><AlertTriangle className="size-3" /> {title}</span>
                <span className="text-sm text-foreground/90 font-medium leading-relaxed">{desc}</span>
              </div>
            );
          }
          
          return (
            <div key={idx} className="flex flex-col bg-background/40 p-2.5 rounded-lg border border-border/50">
              <span className="font-extrabold text-foreground text-[10px] uppercase tracking-wider mb-0.5 text-primary">{title}</span>
              <span className="text-sm text-muted-foreground leading-relaxed">{desc}</span>
            </div>
          );
        }
        
        return <p key={idx} className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{trimmed}</p>;
      })}
    </div>
  );
}

export function PartnerShowcase({ partners, sales = [], closings = [] }: Props) {
  const [selectedPartner, setSelectedPartner] = useState<PartnerWithTrips | null>(null);

  if (!partners || partners.length === 0) return null;

  return (
    <section className="mb-10 animate-fade-in">
      <div className="flex items-center justify-between mb-5 px-1">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          Empresas Parceiras
        </h2>
        <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
          {partners.length} Operando
        </span>
      </div>

      {/* Horizontal Scroller */}
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar -mx-4 px-4 md:-mx-8 md:px-8 lg:mx-0 lg:px-0">
        {partners.map((partner, index) => {
          // Busca a imagem mapeada pelo nome normalizado, ou usa o default
          const normalized = normalizeName(partner.name);
          const imageUrl = PARTNER_IMAGES[normalized] || PARTNER_IMAGES["default"];

          return (
            <div 
              key={partner.id}
              onClick={() => setSelectedPartner(partner)}
              className="relative min-w-[260px] w-[260px] md:min-w-[320px] md:w-[320px] h-[160px] rounded-2xl overflow-hidden snap-center group shrink-0 shadow-lg cursor-pointer transition-transform duration-500 hover:-translate-y-1"
            >
              {/* Background Image */}
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{ backgroundImage: `url('${imageUrl}')` }}
              />
              
              {/* Dark Gradient Overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

              {/* Glassmorphism Border Overlay */}
              <div className="absolute inset-0 border border-white/10 rounded-2xl group-hover:border-white/20 transition-colors" />

              {/* Content */}
              <div className="absolute inset-0 p-5 flex flex-col justify-end">
                <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                  <div className="flex items-center gap-2 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-white/80 bg-white/10 backdrop-blur-md px-2 py-0.5 rounded">
                      <TrendingUp className="size-3" /> Monitoramento Ativo
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 drop-shadow-md">
                    <Building2 className="size-5 text-white/70" />
                    {partner.name}
                  </h3>
                </div>
              </div>
            </div>
          );
        })}
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

      {/* Modal de Detalhes da Empresa */}
      {selectedPartner && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setSelectedPartner(null)}>
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200 hide-scrollbar" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedPartner(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white/80 hover:bg-black/70 hover:text-white backdrop-blur-sm transition-colors"
            >
              <X className="size-5" />
            </button>
            
            {/* Header com Imagem */}
            <div 
              className="relative h-48 w-full bg-cover bg-center"
              style={{ backgroundImage: `url('${PARTNER_IMAGES[normalizeName(selectedPartner.name)] || PARTNER_IMAGES["default"]}')` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                    <Building2 className="size-7 text-primary" />
                    {selectedPartner.name}
                  </h2>
                  <div className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-1.5">
                    <ShieldCheck className="size-4" /> Parceiro Operacional Homologado
                  </div>
                </div>
              </div>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6 space-y-6">
              
              {/* Grid Operacional e Financeiro */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-border bg-background/50 p-4 backdrop-blur-sm shadow-sm">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1 mb-2"><Car className="size-3" /> Frotas Hoje</div>
                  <div className="text-2xl font-bold">{selectedPartner.trips?.length || 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">Carros em operação</div>
                </div>
                
                <div className="rounded-2xl border border-border bg-background/50 p-4 backdrop-blur-sm shadow-sm">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1 mb-2"><BarChart3 className="size-3" /> Vendas (Mês)</div>
                  <div className="text-2xl font-bold">{sales.filter(s => s.company_id === selectedPartner.id).length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Passagens emitidas</div>
                </div>

                <div className="rounded-2xl border border-success/30 bg-success/5 p-4 backdrop-blur-sm shadow-sm lg:col-span-2">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-success flex items-center gap-1 mb-2"><DollarSign className="size-3" /> Faturamento (Caixa Fechado)</div>
                  <div className="text-2xl font-bold text-success">
                    {(() => {
                      let total = 0;
                      closings.forEach(c => {
                        if (c.company_settlements && Array.isArray(c.company_settlements)) {
                          const s = c.company_settlements.find((x: any) => x.company_id === selectedPartner.id);
                          if (s) total += Number(s.total || 0);
                        } else if (c.company_totals) {
                          total += Number((c.company_totals as any)[selectedPartner.id] || 0);
                        }
                      });
                      if (total === 0 && sales.length > 0) {
                        total = sales.filter(s => s.company_id === selectedPartner.id).reduce((acc, s) => acc + Number(s.amount), 0);
                      }
                      return total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                    })()}
                  </div>
                  <div className="text-xs text-success/80 mt-1 font-medium flex justify-between">
                    <span>Meta: {Number(selectedPartner.meta || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                    <span>Ticket Médio: {Number(selectedPartner.ticket_medio || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                </div>
              </div>

              {/* Histórico de Fechamentos de Caixa */}
              <div className="rounded-2xl border border-border bg-background/50 p-5 shadow-sm">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-primary border-b border-border/50 pb-2"><ShieldCheck className="size-4" /> Histórico de Fechamentos de Caixa</h3>
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                  {closings
                    .filter(c => {
                       let hasData = false;
                       if (c.company_settlements && Array.isArray(c.company_settlements)) {
                          hasData = !!c.company_settlements.find((x: any) => x.company_id === selectedPartner.id);
                       } else if (c.company_totals) {
                          hasData = !!(c.company_totals as any)[selectedPartner.id];
                       }
                       return hasData;
                    })
                    .map((c, idx) => {
                      let amount = 0;
                      if (c.company_settlements && Array.isArray(c.company_settlements)) {
                        const s = c.company_settlements.find((x: any) => x.company_id === selectedPartner.id);
                        if (s) amount = Number(s.total || 0);
                      } else if (c.company_totals) {
                        amount = Number((c.company_totals as any)[selectedPartner.id] || 0);
                      }
                      return (
                        <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-background border border-border/50">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{c.closing_date.split('-').reverse().join('/')}</span>
                            <span className="text-xs text-muted-foreground">{c.closed_by || "Sistema"}</span>
                          </div>
                          <div className="font-mono text-success font-bold">
                            {amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </div>
                        </div>
                      );
                    })}
                    {closings.filter(c => {
                       let hasData = false;
                       if (c.company_settlements && Array.isArray(c.company_settlements)) {
                          hasData = !!c.company_settlements.find((x: any) => x.company_id === selectedPartner.id);
                       } else if (c.company_totals) {
                          hasData = !!(c.company_totals as any)[selectedPartner.id];
                       }
                       return hasData;
                    }).length === 0 && (
                      <p className="text-sm text-muted-foreground italic text-center py-4">Nenhum fechamento validado para este parceiro no mês.</p>
                    )}
                </div>
              </div>

              {/* Informações Legais e Normas */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-border bg-background/50 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-primary border-b border-border/50 pb-2">
                    <Scale className="size-5" />
                    <h3 className="font-bold">Política de Devolução</h3>
                  </div>
                  <FormattedText text={selectedPartner.politica_devolucao} />
                </div>

                <div className="rounded-2xl border border-border bg-background/50 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-primary border-b border-border/50 pb-2">
                    <RefreshCw className="size-5" />
                    <h3 className="font-bold">Política de Troca</h3>
                  </div>
                  <FormattedText text={selectedPartner.politica_troca} />
                </div>

                <div className="rounded-2xl border border-border bg-background/50 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3 text-primary">
                    <FileText className="size-5" />
                    <h3 className="font-bold">Protocolo Padrão</h3>
                  </div>
                  <div className="bg-muted p-3 rounded-lg text-sm font-mono text-muted-foreground mb-3 break-all">
                    {selectedPartner.protocolo || "Sem protocolo definido"}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">
                    Comissão Acordada: <span className="font-bold text-foreground">{Number(selectedPartner.comissao || 0)}%</span>
                  </div>
                </div>
              </div>

              {/* Linhas e Notas */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background/50 p-5 shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2 text-primary border-b border-border/50 pb-2"><MapPin className="size-4" /> Linhas Exclusivas</h3>
                  {selectedPartner.linhas_exclusivas && selectedPartner.linhas_exclusivas.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {selectedPartner.linhas_exclusivas.map((linha, idx) => (
                        <div key={idx} className="bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-primary pl-3 py-2.5 rounded-r-lg text-sm font-bold text-foreground shadow-sm flex items-center justify-between">
                          <span>{linha}</span>
                          <MapPin className="size-3 text-primary/40 mr-2" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma linha exclusiva mapeada.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-background/50 p-5 shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2 text-primary border-b border-border/50 pb-2"><Info className="size-4" /> Notas Gerais</h3>
                  <FormattedText text={selectedPartner.mais_informacoes} />
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </section>
  );
}
