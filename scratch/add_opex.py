import re

with open("src/routes/analytics.tsx", "r") as f:
    content = f.read()

# 1. Add import
if "import { useTransactionsRealtime }" not in content:
    content = content.replace(
        'import { useCashClosingsRealtime } from "@/hooks/use-cash-closings-realtime";',
        'import { useCashClosingsRealtime } from "@/hooks/use-cash-closings-realtime";\nimport { useTransactionsRealtime } from "@/hooks/use-transactions-realtime";'
    )

# 2. Add hook call
if "const { transactions } = useTransactionsRealtime();" not in content:
    content = content.replace(
        '  const { closings } = useCashClosingsRealtime();',
        '  const { closings } = useCashClosingsRealtime();\n  const { transactions } = useTransactionsRealtime();'
    )

# 3. Add OPEX calculation right before KPI Row
opex_calc = """
  const opex = useMemo(() => {
    const filteredTransactions = transactions.filter(t => isIncluded(t.date));
    return filteredTransactions
      .filter(t => t.context === 'business' && t.type === 'expense' && t.category !== 'CAPEX / Aquisições' && t.category !== 'Pró-Labore / Distribuição')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [transactions, filterMode, currentMonth, startDate, endDate]);

  const opexCovered = closingsTotals.revenue >= opex;
  const opexPercentage = opex > 0 ? (closingsTotals.revenue / opex) * 100 : 0;
"""
if "const opex =" not in content:
    content = content.replace(
        '{/* KPI Row (Visão Macro Financeira) */}',
        opex_calc + '\n        {/* KPI Row (Visão Macro Financeira) */}'
    )

# 4. Modify grid layout and add OPEX Card
new_kpi_row = """{/* KPI Row (Visão Macro Financeira) */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-6 backdrop-blur-xl shadow-2xl group transition-all hover:bg-black/60 hover:border-white/10">
            <div className="absolute -right-10 -top-10 size-40 bg-primary/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-primary/30 transition-colors"></div>
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="size-5 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Total Faturado</h3>
            </div>
            <div className="text-4xl font-extrabold font-mono tracking-tighter text-foreground">
              {formatCurrency(closingsTotals.revenue)}
            </div>
            <div className="text-xs font-semibold text-primary mt-2 flex items-center gap-1.5">
               <Activity className="size-3" /> Volume financeiro do período
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-6 backdrop-blur-xl shadow-2xl group transition-all hover:bg-black/60 hover:border-white/10">
            <div className="absolute -right-10 -top-10 size-40 bg-danger/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-danger/30 transition-colors"></div>
            <div className="flex items-center gap-2 mb-3">
              <LineChart className="size-5 text-danger" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Comissão (Rateio)</h3>
            </div>
            <div className="text-4xl font-extrabold font-mono tracking-tighter text-danger">
              - {formatCurrency(closingsTotals.commission)}
            </div>
            <div className="text-xs font-semibold text-muted-foreground mt-2 flex items-center gap-1.5">
               <TrendingUp className="size-3" /> Pagamento de parceiros
            </div>
          </div>
          
          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-6 backdrop-blur-xl shadow-2xl group transition-all hover:bg-black/60 hover:border-white/10">
            <div className={cn("absolute -right-10 -top-10 size-40 blur-[60px] rounded-full pointer-events-none transition-colors", opexCovered ? "bg-success/20 group-hover:bg-success/30" : "bg-warning/20 group-hover:bg-warning/30")}></div>
            <div className="flex items-center gap-2 mb-3">
              <Target className={cn("size-5", opexCovered ? "text-success" : "text-warning")} />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">OPEX / Break-even</h3>
            </div>
            <div className={cn("text-4xl font-extrabold font-mono tracking-tighter", opexCovered ? "text-success" : "text-warning")}>
              {formatCurrency(opex)}
            </div>
            <div className={cn("text-xs font-semibold mt-2 flex items-center gap-1.5", opexCovered ? "text-success" : "text-warning")}>
               <CheckCircle2 className="size-3" /> {opexCovered ? `Operação paga (${opexPercentage.toFixed(0)}%)` : `Falta ${formatCurrency(opex - closingsTotals.revenue)}`}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-6 backdrop-blur-xl shadow-2xl group transition-all hover:bg-black/60 hover:border-white/10">
            <div className="absolute -right-10 -top-10 size-40 bg-info/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-info/30 transition-colors"></div>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="size-5 text-info" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Ticket Médio</h3>
            </div>
            <div className="text-4xl font-extrabold font-mono tracking-tighter text-foreground">
              {closingsTotals.sales > 0 ? formatCurrency(closingsTotals.revenue / closingsTotals.sales) : "R$ 0,00"}
            </div>
            <div className="text-xs font-semibold text-info mt-2 flex items-center gap-1.5">
               <Users className="size-3" /> Gasto médio por passagem
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-6 backdrop-blur-xl shadow-2xl group transition-all hover:bg-black/60 hover:border-white/10">
            <div className="absolute -right-10 -top-10 size-40 bg-success/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-success/30 transition-colors"></div>
            <div className="flex items-center gap-2 mb-3">
              <Bus className="size-5 text-success" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Pontualidade</h3>
            </div>
            <div className="text-4xl font-extrabold font-mono tracking-tighter text-success">
              {operationalStats.punctuality}%
            </div>
            <div className="text-xs font-semibold text-muted-foreground mt-2 flex items-center gap-1.5">
               <CalendarClock className="size-3" /> {operationalStats.avgDelay} min de atraso médio
            </div>
          </div>
        </section>"""

content = re.sub(r'\{\/\* KPI Row \(Visão Macro Financeira\) \*\/\}.*?<\/section>', new_kpi_row, content, flags=re.DOTALL)

with open("src/routes/analytics.tsx", "w") as f:
    f.write(content)

print("Success!")
