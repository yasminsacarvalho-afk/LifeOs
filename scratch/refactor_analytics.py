import re

with open("src/routes/analytics.tsx", "r") as f:
    content = f.read()

# 1. Replace KPI Row (approx lines 640-670)
kpi_regex = re.compile(r'\{\/\* KPI Row \*\/}(.*?)(?=\{\/\* Charts Row \*\/})', re.DOTALL)

new_kpi_and_chart = """{/* KPI Row (Visão Macro Financeira) */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </section>

        {/* Histórico de Fechamentos Chart - moved up */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/60 p-8 backdrop-blur-2xl shadow-2xl mt-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
            <div className="absolute -left-40 -bottom-40 size-96 bg-primary/10 blur-[100px] rounded-full pointer-events-none"></div>
            
            <div className="mb-8 flex items-center justify-between relative z-10">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Histórico Financeiro</h2>
                <p className="text-base text-muted-foreground mt-1 font-medium">Evolução do faturamento real validado em caixa e comissões associadas.</p>
              </div>
              <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20">
                 <Lock className="size-6 text-primary" />
              </div>
            </div>

            {closingsChartData.length > 0 ? (
              <div className="h-[350px] relative z-10 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={closingsChartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.05} vertical={false} />
                    <XAxis dataKey="date" stroke="currentColor" opacity={0.5} fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis 
                      yAxisId="left"
                      stroke="currentColor" 
                      opacity={0.5}
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      dx={-10}
                      domain={[0, (dataMax) => Math.max(8000, dataMax)]}
                      tickFormatter={(value) => value >= 1000 ? `R$ ${(value / 1000).toFixed(1).replace('.0', '')}k` : `R$ ${value}`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="oklch(0.8 0.1 320)" 
                      opacity={0.8}
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      dx={10}
                      tickFormatter={(value) => value >= 1000 ? `R$ ${(value / 1000).toFixed(1).replace('.0', '')}k` : `R$ ${value}`}
                    />
                    <RechartsTooltip 
                      formatter={(val, name) => [formatCurrency(val), name === "revenue" ? "Faturado" : "Comissão"]}
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
                      itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                    <Bar yAxisId="left" dataKey="revenue" name="Faturado" fill="url(#colorRevenueGradient)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                    <Line yAxisId="right" type="monotone" dataKey="commission" name="Comissão" stroke="oklch(0.8 0.1 320)" strokeWidth={4} dot={{ r: 5, fill: "oklch(0.8 0.1 320)", strokeWidth: 2, stroke: "#000" }} activeDot={{ r: 8, strokeWidth: 0 }} />
                    <defs>
                      <linearGradient id="colorRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.65 0.19 255)" stopOpacity={1} />
                        <stop offset="100%" stopColor="oklch(0.65 0.19 255)" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground italic border border-dashed border-white/10 rounded-2xl">
                   Nenhum dado financeiro para gerar o gráfico.
                </div>
            )}
        </section>

        """

content = kpi_regex.sub(new_kpi_and_chart, content, count=1)

# 2. Modify "Dossiê Analítico por Empresa" header to be more elegant
dossie_header_regex = re.compile(r'\{\/\* Dossiê por Empresa \*\/}.*?(?=<div className="grid gap-6 lg:grid-cols-2">)', re.DOTALL)
new_dossie_header = """{/* Dossiê por Empresa */}
        <section className="relative pt-6">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Dossiê Analítico por Parceiro</h2>
            <p className="text-base text-muted-foreground mt-1 font-medium">Raio-X financeiro: de quem mais vende à consistência de metas.</p>
          </div>

          """
content = dossie_header_regex.sub(new_dossie_header, content, count=1)

# 3. Update the Card design inside Dossiê Analítico
card_regex = re.compile(r'<div key=\{idx\} className="flex flex-col rounded-2xl border border-border\/60 bg-background\/60 hover:bg-white\/\[0\.02\] transition-colors overflow-hidden">.*?<div className="p-5 border-b border-border\/50 bg-muted\/10 flex items-center justify-between">', re.DOTALL)

new_card = """<div key={idx} className="flex flex-col rounded-3xl border border-white/5 bg-black/40 backdrop-blur-md shadow-xl hover:shadow-2xl hover:border-white/10 transition-all overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="p-6 border-b border-white/5 bg-white/[0.01] flex items-center justify-between relative z-10">"""
content = card_regex.sub(new_card, content)

# 4. Strip out the old "Histórico de Fechamentos" Chart because we moved it up.
# And modify the table to look better.
old_chart_regex = re.compile(r'\{\/\* Histórico de Fechamentos \*\/}.*?<tbody>', re.DOTALL)
new_table_start = """{/* Auditoria de Fechamentos (Tabela) */}
          <section className="rounded-3xl border border-white/10 bg-black/40 p-8 backdrop-blur-xl shadow-2xl overflow-hidden mt-8">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Auditoria de Fechamentos</h2>
                <p className="text-sm text-muted-foreground mt-1">Registros diários de caixa e detalhamento de repasses.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-muted-foreground">
                    <th className="px-4 py-3 text-left font-semibold">Data do Fechamento</th>
                    <th className="px-4 py-3 text-center font-semibold">Qtd. Vendas</th>
                    <th className="px-4 py-3 text-right font-semibold">Total Faturado</th>
                    <th className="px-4 py-3 text-right font-semibold">Comissão (Saída)</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>"""
content = old_chart_regex.sub(new_table_start, content, count=1)


with open("src/routes/analytics.tsx", "w") as f:
    f.write(content)

print("Success!")
