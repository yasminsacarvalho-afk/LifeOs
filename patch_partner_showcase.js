const fs = require('fs');

const file = 'src/components/PartnerShowcase.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add closings to Props
content = content.replace(
  'sales?: any[];',
  'sales?: any[];\n  closings?: any[];'
);

// Add closings to destructuring
content = content.replace(
  'export function PartnerShowcase({ partners, sales = [] }: Props) {',
  'export function PartnerShowcase({ partners, sales = [], closings = [] }: Props) {'
);

// Replace Faturamento calculation
const oldFaturamento = `{sales.filter(s => s.company_id === selectedPartner.id).reduce((acc, s) => acc + Number(s.amount), 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;

const newFaturamento = `{(() => {
                      let total = 0;
                      closings.forEach(c => {
                        if (c.company_settlements && Array.isArray(c.company_settlements)) {
                          const s = c.company_settlements.find((x: any) => x.company_id === selectedPartner.id);
                          if (s) total += Number(s.total || 0);
                        } else if (c.company_totals) {
                          total += Number((c.company_totals as any)[selectedPartner.id] || 0);
                        }
                      });
                      if (total === 0) {
                        // Fallback to sales if no closings
                        total = sales.filter(s => s.company_id === selectedPartner.id).reduce((acc, s) => acc + Number(s.amount), 0);
                      }
                      return total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                    })()}`;

content = content.replace(oldFaturamento, newFaturamento);

// Add "Histórico de Fechamentos" list
const insertionPoint = '{/* Informações Legais e Normas */}';
const historyUI = `
              {/* Histórico de Fechamentos */}
              <div className="rounded-2xl border border-border bg-background/50 p-5 shadow-sm">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-primary border-b border-border/50 pb-2"><ShieldCheck className="size-4" /> Histórico de Fechamentos de Caixa</h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
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
                      <p className="text-sm text-muted-foreground italic text-center py-4">Nenhum fechamento validado ainda.</p>
                    )}
                </div>
              </div>

              {/* Informações Legais e Normas */}`;

content = content.replace(insertionPoint, historyUI);

fs.writeFileSync(file, content);
console.log('Patched PartnerShowcase.tsx successfully.');
