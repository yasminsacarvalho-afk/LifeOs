import re

with open("src/routes/analytics.tsx", "r") as f:
    content = f.read()

# 1. Add hook to calculate the closing stats per company
stats_hook = """
  // 13. Estatísticas e Projeções de Fechamento por Empresa
  const companyClosingStats = useMemo(() => {
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear();
    const totalDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const passedDays = isCurrentMonth ? today.getDate() : totalDays;
    const remainingDays = Math.max(0, totalDays - passedDays);

    return partners.map(partner => {
      const dailyTotals: number[] = [];
      filteredClosings.forEach(c => {
        if (c.company_settlements && Array.isArray(c.company_settlements)) {
          const settlement = c.company_settlements.find((s: any) => s.company_id === partner.id);
          if (settlement) {
            dailyTotals.push(Number(settlement.total || 0));
          }
        } else if (c.company_totals && c.company_totals[partner.id]) {
          dailyTotals.push(Number(c.company_totals[partner.id] || 0));
        }
      });

      const validTotals = dailyTotals.filter(v => v > 0);
      const totalAmount = validTotals.reduce((a, b) => a + b, 0);
      const avgAmount = validTotals.length > 0 ? totalAmount / validTotals.length : 0;
      const bestAmount = validTotals.length > 0 ? Math.max(...validTotals) : 0;
      const worstAmount = validTotals.length > 0 ? Math.min(...validTotals) : 0;

      const projPessimista = totalAmount + (worstAmount * remainingDays);
      const projMedia = totalAmount + (avgAmount * remainingDays);
      const projOtimista = totalAmount + (bestAmount * remainingDays);

      return {
        partner,
        totalAmount,
        avgAmount,
        bestAmount,
        worstAmount,
        projPessimista,
        projMedia,
        projOtimista,
        remainingDays,
        validDays: validTotals.length
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount).filter(c => c.totalAmount > 0);
  }, [filteredClosings, partners, currentMonth]);
"""

if "// 13. Estatísticas" not in content:
    content = content.replace(
        "  const closingsChartData = useMemo(() => {",
        stats_hook + "\n  const closingsChartData = useMemo(() => {"
    )

# 2. Add the UI for this in Auditoria de Fechamentos section
ui_section = """
            <div className="grid gap-6 mb-8 lg:grid-cols-1">
               {companyClosingStats.length > 0 && (
                 <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl p-6">
                    <h3 className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2"><Target className="size-5 text-primary" /> Projeção de Fechamentos (Mês Atual)</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                       {companyClosingStats.map((stat) => (
                          <div key={stat.partner.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.04] transition-colors relative overflow-hidden group">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-primary/20 transition-colors"></div>
                             
                             <div className="flex justify-between items-center mb-4 relative z-10">
                                <span className="font-bold text-base flex items-center gap-2"><Store className="size-4 text-primary" /> {stat.partner.name}</span>
                                <span className="text-[10px] uppercase font-bold text-muted-foreground bg-white/5 px-2 py-0.5 rounded border border-white/5">Faltam {stat.remainingDays} dias</span>
                             </div>

                             <div className="grid grid-cols-3 gap-3 mb-5 relative z-10">
                                <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 text-center flex flex-col justify-center">
                                   <span className="text-[9px] uppercase font-bold tracking-widest text-danger mb-1 block">Pior Dia</span>
                                   <span className="font-mono font-bold text-danger">{formatCurrency(stat.worstAmount)}</span>
                                </div>
                                <div className="bg-info/10 border border-info/20 rounded-xl p-3 text-center flex flex-col justify-center">
                                   <span className="text-[9px] uppercase font-bold tracking-widest text-info mb-1 block">Média</span>
                                   <span className="font-mono font-bold text-info">{formatCurrency(stat.avgAmount)}</span>
                                </div>
                                <div className="bg-success/10 border border-success/20 rounded-xl p-3 text-center flex flex-col justify-center">
                                   <span className="text-[9px] uppercase font-bold tracking-widest text-success mb-1 block">Melhor Dia</span>
                                   <span className="font-mono font-bold text-success">{formatCurrency(stat.bestAmount)}</span>
                                </div>
                             </div>

                             <div className="pt-4 border-t border-white/10 relative z-10">
                                <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-3">Como será o fechamento do mês:</div>
                                <div className="space-y-2 text-sm">
                                   <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground flex items-center gap-1.5"><TrendingDown className="size-3 text-danger" /> Se for ruim:</span>
                                      <span className="font-mono font-bold text-foreground">{formatCurrency(stat.projPessimista)}</span>
                                   </div>
                                   <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground flex items-center gap-1.5"><Activity className="size-3 text-info" /> Na média:</span>
                                      <span className="font-mono font-bold text-info">{formatCurrency(stat.projMedia)}</span>
                                   </div>
                                   <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground flex items-center gap-1.5"><TrendingUp className="size-3 text-success" /> Se for ótimo:</span>
                                      <span className="font-mono font-bold text-success">{formatCurrency(stat.projOtimista)}</span>
                                   </div>
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
               )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden">
"""

content = content.replace(
    '<div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden">',
    ui_section
)

# 3. Handle import for TrendingDown if missing
if "TrendingDown" not in content:
    content = content.replace('TrendingUp, MapPin', 'TrendingUp, TrendingDown, MapPin')

with open("src/routes/analytics.tsx", "w") as f:
    f.write(content)
print("Updated successfully")
