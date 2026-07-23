import re

with open("src/routes/analytics.tsx", "r") as f:
    content = f.read()

table_regex = re.compile(r'\{\/\* Auditoria de Fechamentos \(Tabela\) \*\/}.*?(?=        </div>\n      </main>)', re.DOTALL)

new_table = """{/* Auditoria de Fechamentos */}
          <section className="mt-12 mb-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Auditoria de Fechamentos</h2>
                <p className="text-sm text-muted-foreground mt-1 font-medium">Registros diários do caixa matriz e detalhamento de split de pagamento.</p>
              </div>
              <div className="flex gap-4">
                 <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Faturado</span>
                    <span className="text-base font-mono font-bold text-success">{formatCurrency(closingsTotals.revenue)}</span>
                 </div>
                 <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Comissão</span>
                    <span className="text-base font-mono font-bold text-danger">- {formatCurrency(closingsTotals.commission)}</span>
                 </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden">
               <div className="grid grid-cols-12 gap-4 p-5 border-b border-white/10 text-xs font-bold uppercase tracking-widest text-muted-foreground bg-white/[0.02]">
                  <div className="col-span-3 pl-4">Data do Fechamento</div>
                  <div className="col-span-2 text-center">Qtd. Vendas</div>
                  <div className="col-span-3 text-right">Total Faturado</div>
                  <div className="col-span-2 text-right">Comissão (Saída)</div>
                  <div className="col-span-2 text-center">Status</div>
               </div>

               <div className="flex flex-col">
                  {closingsHistory.length === 0 ? (
                     <div className="text-center py-16 text-muted-foreground italic border-b border-white/5">Nenhum fechamento registrado nas datas selecionadas.</div>
                  ) : (
                     closingsHistory.map((c) => {
                        const [y, m, d] = c.closing_date.split('-');
                        const formattedDate = `${d}/${m}/${y}`;
                        const isExpanded = expandedClosing === c.id;

                        return (
                           <div key={c.id} className="group flex flex-col border-b border-white/5 last:border-0 transition-colors">
                              {/* Main Row */}
                              <div 
                                 onClick={() => setExpandedClosing(isExpanded ? null : c.id)}
                                 className={cn("grid grid-cols-12 gap-4 p-5 items-center cursor-pointer transition-all", isExpanded ? "bg-white/[0.04]" : "hover:bg-white/[0.02]")}
                              >
                                 <div className="col-span-3 pl-4 font-bold text-primary flex items-center gap-3 text-sm">
                                    <div className={cn("p-1.5 rounded-md bg-white/5 transition-transform", isExpanded && "rotate-90 bg-primary/20 text-primary")}>
                                       <ChevronRight className="size-4" />
                                    </div>
                                    {formattedDate}
                                 </div>
                                 <div className="col-span-2 text-center font-mono text-sm text-muted-foreground">{c.sales_count_calc || 0}</div>
                                 <div className="col-span-3 text-right font-mono font-bold text-success text-base">{formatCurrency(c.total_revenue_calc || 0)}</div>
                                 <div className="col-span-2 text-right font-mono font-bold text-danger text-base">- {formatCurrency(c.total_commission_calc || 0)}</div>
                                 <div className="col-span-2 flex justify-center">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-success/10 text-success border border-success/20">
                                       <CheckCircle2 className="size-3" /> Validado
                                    </span>
                                 </div>
                              </div>

                              {/* Expanded Details */}
                              {isExpanded && (
                                 <div className="p-6 bg-black/20 border-t border-white/5 shadow-inner">
                                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                                       <Activity className="size-3" /> Split de Repasse por Empresa
                                    </div>
                                    
                                    {(!c.company_settlements || c.company_settlements.length === 0) ? (
                                       <div className="text-sm text-muted-foreground italic bg-white/5 p-4 rounded-xl border border-white/5">Sem rateio mapeado no caixa.</div>
                                    ) : (
                                       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                          {(c.company_settlements as any[]).map(s => (
                                             <div key={s.id} className="relative overflow-hidden bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex flex-col gap-4 shadow-xl hover:bg-white/[0.05] transition-colors">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-primary/50"></div>
                                                <div className="flex items-center justify-between font-bold text-sm">
                                                   <span className="tracking-tight">{s.company_name}</span>
                                                   <span className="text-success font-mono text-lg">{formatCurrency(Number(s.total || 0))}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/5 text-[10px] uppercase font-semibold text-muted-foreground">
                                                   <div className="bg-white/5 p-2 rounded-lg text-center">
                                                      <span className="block mb-1 opacity-60">PIX</span>
                                                      <span className="font-mono text-foreground text-xs">{formatCurrency(Number(s.pix || 0))}</span>
                                                   </div>
                                                   <div className="bg-white/5 p-2 rounded-lg text-center">
                                                      <span className="block mb-1 opacity-60">Espécie</span>
                                                      <span className="font-mono text-foreground text-xs">{formatCurrency(Number(s.dinheiro || 0))}</span>
                                                   </div>
                                                   <div className="bg-white/5 p-2 rounded-lg text-center">
                                                      <span className="block mb-1 opacity-60">Cartão</span>
                                                      <span className="font-mono text-foreground text-xs">{formatCurrency(Number(s.cartao || 0))}</span>
                                                   </div>
                                                </div>
                                                <div className="flex justify-between items-center bg-danger/5 border border-danger/10 px-4 py-2.5 rounded-xl mt-1">
                                                   <span className="text-danger uppercase tracking-wider font-bold text-[10px]">Comissão / Repasse</span>
                                                   <span className="font-mono font-extrabold text-danger text-sm">- {formatCurrency(Number(s.commission || 0))}</span>
                                                </div>
                                             </div>
                                          ))}
                                       </div>
                                    )}
                                 </div>
                              )}
                           </div>
                        );
                     })
                  )}
               </div>
            </div>
          </section>
"""

content = table_regex.sub(new_table, content, count=1)

with open("src/routes/analytics.tsx", "w") as f:
    f.write(content)

print("Success!")
