import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, Target, Activity, CalendarDays, Building2, Crown, Zap, Info, Sparkles, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { useCashClosingsRealtime } from "@/hooks/use-cash-closings-realtime";
import { usePartnersRealtime } from "@/hooks/use-partners-realtime";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getFinancialPeriod, getCurrentDayOfFinancialPeriod, isWithinFinancialPeriod } from "@/lib/date-helpers";

export const Route = createFileRoute("/goals")({
  head: () => ({
    meta: [{ title: "Metas & Ranking · Voyage Flow" }],
  }),
  component: GoalsPage,
});

const formatCurrency = (val: number) =>
  val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function GoalsPage() {
  const { closings } = useCashClosingsRealtime();
  const { partners } = usePartnersRealtime();

  // 1. Variáveis de Tempo (Pacing) - Usando Competência Financeira (Dia 26 a 25)
  const now = new Date();
  const period = getFinancialPeriod(now);
  const daysInMonth = period.daysInPeriod;
  const currentDay = getCurrentDayOfFinancialPeriod(now); // Quantos dias se passaram na competência até hoje

  const monthClosings = closings.filter((c) => isWithinFinancialPeriod(c.closing_date, now));
  
  // Quantidade de dias que efetivamente tiveram fechamento de caixa (evita puxar a média pra baixo em dias não fechados)
  const diasFechados = new Set(monthClosings.map(c => c.closing_date)).size;

  // 2. Cálculos Globais
  const totalFaturamento = monthClosings.reduce((acc, closing) => {
    const settlements = (closing.company_settlements as any[]) || [];
    return acc + settlements.reduce((sum, s) => sum + Number(s.total || 0), 0);
  }, 0);
  const totalMeta = partners.reduce((acc, p) => acc + (Number(p.meta) || 0), 0);

  const metaDiariaGlobal = totalMeta / daysInMonth;
  const faturamentoMedioDiario = totalFaturamento / Math.max(1, diasFechados);
  const projecaoFimDoMes = faturamentoMedioDiario * daysInMonth;
  const pacingGlobal = totalMeta > 0 ? (projecaoFimDoMes / totalMeta) * 100 : 0;

  // 5. Variáveis de Diagnóstico
  const isOnTrack = projecaoFimDoMes >= totalMeta;
  const differenceToGoal = Math.abs(projecaoFimDoMes - totalMeta);
  const dailyDifference = Math.abs(faturamentoMedioDiario - metaDiariaGlobal);

  // 3. Gráfico Diário de Ritmo (Pacing Chart)
  // Monta um array com todos os dias da competência financeira atual até hoje
  const chartData = useMemo(() => {
    const data = [];
    const iterDate = new Date(period.startDate);
    let dayIndex = 1;
    
    while (iterDate <= period.endDate) {
      const dayStr = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, "0")}-${String(iterDate.getDate()).padStart(2, "0")}`;
      const dayClosings = monthClosings.filter((c) => c.closing_date === dayStr);
      
      const revenue = dayClosings.reduce((acc, closing) => {
        const settlements = (closing.company_settlements as any[]) || [];
        return acc + settlements.reduce((sum, s) => sum + Number(s.total || 0), 0);
      }, 0);
      
      data.push({
        day: `${String(iterDate.getDate()).padStart(2, "0")}/${String(iterDate.getMonth() + 1).padStart(2, "0")}`,
        revenue: dayIndex <= currentDay ? revenue : null,
        metaDiaria: metaDiariaGlobal,
      });
      
      iterDate.setDate(iterDate.getDate() + 1);
      dayIndex++;
    }
    return data;
  }, [monthClosings, period.startDate, period.endDate, currentDay, metaDiariaGlobal]);

  // 4. Ranking Analítico por Empresa
  const companyStats = useMemo(() => {
    return partners
      .map((p) => {
        const revenue = monthClosings.reduce((acc, closing) => {
          const settlements = (closing.company_settlements as any[]) || [];
          const partnerSettlement = settlements.find((s) => s.company_id === p.id);
          return acc + (partnerSettlement ? Number(partnerSettlement.total || 0) : 0);
        }, 0);
        const metaVal = Number(p.meta) || 0;
        
        const metaDiaria = metaVal / daysInMonth;
        const mediaDiaria = revenue / Math.max(1, diasFechados);
        const projecao = mediaDiaria * daysInMonth;
        const progresso = metaVal > 0 ? (revenue / metaVal) * 100 : 0;
        const pacing = metaVal > 0 ? (projecao / metaVal) * 100 : 0;

        return {
          id: p.id,
          name: p.name,
          revenue,
          metaVal,
          metaDiaria,
          mediaDiaria,
          projecao,
          progresso: Math.min(100, Math.round(progresso)),
          pacing: Math.round(pacing),
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .map((p, index) => ({ ...p, rank: index + 1 }));
  }, [partners, monthClosings, daysInMonth, diasFechados]);

  return (
    <>
      <TopBar
        title="Metas & Pacing Analítico"
        subtitle="Acompanhe o ritmo de vendas diário e as projeções de fechamento."
        actions={
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground bg-card border border-border px-4 py-2 rounded-lg shadow-sm">
            <CalendarDays className="size-4" />
            {diasFechados} dias fechados / {daysInMonth} dias
          </div>
        }
      />

      <main className="px-8 py-8 space-y-8">
        
        {/* KPIs Pacing Global */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card/70 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Meta Mensal</div>
              <Target className="size-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight">{formatCurrency(totalMeta)}</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Alvo financeiro do mês
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/70 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Vendas Diária</div>
              <Activity className="size-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight">{formatCurrency(metaDiariaGlobal)}</div>
            <div className="mt-2 text-sm text-primary font-medium">
              Volume Financeiro diario da empresa
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/70 p-5 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-1 bg-success"></div>
            <div className="flex items-center justify-between mb-4 pl-3">
              <div className="text-xs font-bold uppercase tracking-widest text-success">Média Diária Realizada</div>
              <TrendingUp className="size-4 text-success" />
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight pl-3">{formatCurrency(faturamentoMedioDiario)}</div>
            <div className="mt-2 text-sm text-success font-medium pl-3 flex items-center gap-1">
              {faturamentoMedioDiario >= metaDiariaGlobal ? (
                <>Acima da meta diária 🚀</>
              ) : (
                <span className="text-danger">Abaixo da meta diária ⚠️</span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/70 p-5 backdrop-blur-sm relative overflow-hidden">
            <div className={cn("absolute inset-y-0 left-0 w-1", pacingGlobal >= 100 ? "bg-success" : "bg-warning")}></div>
            <div className="flex items-center justify-between mb-4 pl-3">
              <div className="text-xs font-bold uppercase tracking-widest text-foreground">Projeção Fim do Mês</div>
              <Zap className={cn("size-4", pacingGlobal >= 100 ? "text-success" : "text-warning")} />
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight pl-3">{formatCurrency(projecaoFimDoMes)}</div>
            <div className="mt-2 text-sm pl-3 font-medium text-muted-foreground">
              {pacingGlobal >= 100 ? (
                <span className="text-success">{pacingGlobal.toFixed(1)}% (Bate a meta)</span>
              ) : (
                <span className="text-warning">{pacingGlobal.toFixed(1)}% (Não bate a meta)</span>
              )}
            </div>
          </div>
        </section>

        {/* Gráfico de Ritmo Diário */}
        <section className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Faturamento vs Meta Diária</h2>
              <p className="text-sm text-muted-foreground">Acompanhamento do ritmo diário de vendas</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "oklch(0.66 0.012 285)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: "oklch(0.66 0.012 285)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.17 0.014 285)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatCurrency(v)}
                />
                <ReferenceLine y={metaDiariaGlobal} stroke="var(--primary)" strokeDasharray="4 4" label={{ position: 'top', value: 'Meta Diária', fill: 'var(--primary)', fontSize: 11 }} />
                <Area type="monotone" dataKey="revenue" name="Faturado" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Tabela de Pacing por Empresa */}
        <section className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-sm overflow-hidden">
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight">Desempenho por Empresa</h2>
                <p className="text-sm text-muted-foreground">Projeções detalhadas de cada parceira</p>
              </div>
              <Building2 className="size-5 text-muted-foreground" />
            </div>
            
            {/* Legenda das Métricas */}
            <div className="bg-white/5 rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Info className="size-4 text-primary" />
                <span className="text-sm font-semibold">Entenda as Métricas</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-muted-foreground">
                <div className="space-y-1">
                  <span className="font-semibold text-foreground block">Meta Diária</span>
                  <span>Meta mensal dividida pelo total de dias do mês. O que precisa vender por dia.</span>
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-foreground block">Média Realizada</span>
                  <span>O que a empresa efetivamente faturou em média por dia até hoje.</span>
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-foreground block">Projeção Mês</span>
                  <span>Estimativa de faturamento no fim do mês se mantiver a Média Realizada.</span>
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-foreground block">Pacing (Ritmo)</span>
                  <span>Velocidade de vendas. Acima de 100% indica que a meta será atingida ou superada.</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="px-4 py-3 text-left font-semibold">Empresa</th>
                  <th className="px-4 py-3 text-right font-semibold">Meta Mensal</th>
                  <th className="px-4 py-3 text-right font-semibold">Faturado (Atual)</th>
                  <th className="px-4 py-3 text-right font-semibold">Meta Diária</th>
                  <th className="px-4 py-3 text-right font-semibold">Média Realizada</th>
                  <th className="px-4 py-3 text-right font-semibold">Projeção Mês</th>
                  <th className="px-4 py-3 text-left font-semibold w-48">Pacing / Status</th>
                </tr>
              </thead>
              <tbody>
                {companyStats.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-4 font-medium flex items-center gap-2">
                      {p.rank === 1 && <Crown className="size-3.5 text-warning" />}
                      {p.name}
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-muted-foreground">{formatCurrency(p.metaVal)}</td>
                    <td className="px-4 py-4 text-right font-mono font-bold">{formatCurrency(p.revenue)}</td>
                    <td className="px-4 py-4 text-right font-mono text-muted-foreground">{formatCurrency(p.metaDiaria)}</td>
                    <td className="px-4 py-4 text-right font-mono">
                      <span className={cn(p.mediaDiaria >= p.metaDiaria ? "text-success" : "text-danger")}>
                        {formatCurrency(p.mediaDiaria)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-mono">
                      <span className={cn(p.projecao >= p.metaVal ? "text-success" : "text-warning")}>
                        {formatCurrency(p.projecao)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-muted-foreground">Meta atingida: {p.progresso}%</span>
                          <span className={cn(p.pacing >= 100 ? "text-success" : "text-warning")}>Ritmo: {p.pacing}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                          <div
                            className={cn("h-full", p.pacing >= 100 ? "bg-success" : "bg-warning")}
                            style={{ width: `${Math.min(100, p.pacing)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Diagnóstico de Pacing */}
        <section className={cn("rounded-2xl border bg-gradient-to-br p-6 backdrop-blur-sm relative overflow-hidden",
          isOnTrack ? "border-success/30 from-success/5 to-card/40" : "border-warning/30 from-warning/5 to-card/40"
        )}>
          {isOnTrack ? (
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Sparkles className="size-32 text-success" />
            </div>
          ) : (
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <AlertCircle className="size-32 text-warning" />
            </div>
          )}
          
          <div className="flex items-center gap-3 mb-6 relative z-10">
            {isOnTrack ? (
              <div className="bg-success/20 p-2 rounded-lg text-success">
                <CheckCircle2 className="size-6" />
              </div>
            ) : (
              <div className="bg-warning/20 p-2 rounded-lg text-warning">
                <AlertTriangle className="size-6" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold tracking-tight">Diagnóstico de Vendas</h2>
              <p className="text-sm text-muted-foreground">Análise inteligente do ritmo e projeção do mês</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status da Projeção</div>
              {isOnTrack ? (
                <div className="text-[15px] font-medium text-success leading-relaxed">
                  No ritmo para bater a meta global! A projeção indica que fecharemos o mês com <span className="font-bold">R$ {differenceToGoal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span> acima do esperado.
                </div>
              ) : (
                <div className="text-[15px] font-medium text-warning leading-relaxed">
                  Atenção necessária. No ritmo de vendas atual, a projeção aponta que vão faltar <span className="font-bold">R$ {differenceToGoal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span> para atingir a meta global.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Média Diária</div>
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {formatCurrency(faturamentoMedioDiario)}
              </div>
              <div className="text-sm font-medium">
                {faturamentoMedioDiario >= metaDiariaGlobal ? (
                  <span className="text-success flex items-center gap-1">+{formatCurrency(dailyDifference)} acima da meta diária</span>
                ) : (
                  <span className="text-danger flex items-center gap-1">-{formatCurrency(dailyDifference)} abaixo da meta diária</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plano de Ação</div>
              <div className="text-[15px] font-medium text-muted-foreground leading-relaxed">
                {isOnTrack 
                  ? "As equipes estão performando bem. Continue motivando os parceiros, mantendo o controle operacional e maximizando o resultado diário." 
                  : `Para recuperar o ritmo e bater a meta, é necessário aumentar as vendas em ${formatCurrency(dailyDifference)} por dia de caixa. Revise as rotas das empresas que estão abaixo do Pacing.`}
              </div>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
