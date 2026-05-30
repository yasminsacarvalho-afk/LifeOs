import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, ArrowUpRight, Building2, Crown, Radar, TrendingUp, Trophy } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { companyShare, ranking, revenueSeries } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard Financeiro · Voyage Flow" },
      {
        name: "description",
        content:
          "Visão consolidada do faturamento diário e mensal, comissões por empresa, ranking de vendedores e metas.",
      },
    ],
  }),
  component: DashboardPage,
});

const stats = [
  {
    label: "Faturamento Diário",
    value: "R$ 48.290",
    delta: "+12,4%",
    deltaTone: "text-success",
    sub: "vs. ontem · 7 viagens",
  },
  {
    label: "Faturamento Mensal",
    value: "R$ 1,21M",
    delta: "+8,1%",
    deltaTone: "text-success",
    sub: "Meta R$ 1,67M · 72%",
  },
  {
    label: "Comissões Hoje",
    value: "R$ 4.120",
    delta: "42 vendedores",
    deltaTone: "text-muted-foreground",
    sub: "Pagamento previsto: 05/JUL",
  },
  {
    label: "Empresas Parceiras",
    value: "18",
    delta: "+3 este mês",
    deltaTone: "text-primary",
    sub: "Ocupação média 84,2%",
  },
];

function DashboardPage() {
  return (
    <>
      <TopBar
        title="Overview Operacional"
        subtitle="Bem-vindo, Central de Comando (CCO)."
        actions={
          <Link
            to="/monitor"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-[oklch(0.7_0.16_295)] px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow-accent hover:scale-[1.01] transition-transform"
          >
            <Radar className="size-4" />
            Abrir Torre de Controle
          </Link>
        }
      />

      <main className="space-y-8 px-8 py-8">
        {/* KPI grid */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card/70 p-5 backdrop-blur-sm transition-colors hover:border-primary/30 animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="pointer-events-none absolute -right-12 -top-12 size-32 rounded-full bg-primary/10 blur-3xl opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {s.label}
              </div>
              <div className="mt-2 font-mono text-3xl font-semibold tracking-tight">
                {s.value}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className={cn("font-medium inline-flex items-center gap-1", s.deltaTone)}>
                  <ArrowUpRight className="size-3" /> {s.delta}
                </span>
                <span className="text-muted-foreground">{s.sub}</span>
              </div>
            </div>
          ))}
        </section>

        {/* Charts */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-sm lg:col-span-2">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Faturamento da semana</h2>
                <p className="text-xs text-muted-foreground">
                  Receita líquida × comissões pagas (últimos 7 dias)
                </p>
              </div>
              <div className="flex gap-2 text-[11px]">
                <Legend dot="bg-primary" label="Receita" />
                <Legend dot="bg-[oklch(0.7_0.16_295)]" label="Comissão" />
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueSeries} margin={{ left: -10, right: 8, top: 4 }}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.65 0.19 255)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="oklch(0.65 0.19 255)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gCom" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.7 0.16 295)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="oklch(0.7 0.16 295)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "oklch(0.66 0.012 285)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
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
                    formatter={(v: number) =>
                      v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="oklch(0.65 0.19 255)"
                    strokeWidth={2}
                    fill="url(#gRev)"
                  />
                  <Area
                    type="monotone"
                    dataKey="commission"
                    stroke="oklch(0.7 0.16 295)"
                    strokeWidth={2}
                    fill="url(#gCom)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Share por empresa</h2>
                <p className="text-xs text-muted-foreground">Participação no faturamento</p>
              </div>
              <Building2 className="size-4 text-muted-foreground" />
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={companyShare} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "oklch(0.66 0.012 285)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    cursor={{ fill: "oklch(1 0 0 / 0.04)" }}
                    contentStyle={{
                      background: "oklch(0.17 0.014 285)",
                      border: "1px solid oklch(1 0 0 / 0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => `${v}%`}
                  />
                  <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                    {companyShare.map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          ["oklch(0.65 0.19 255)", "oklch(0.7 0.16 295)", "oklch(0.72 0.17 158)", "oklch(0.72 0.18 55)", "oklch(0.5 0.05 285)"][i]
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
              Top 4 parceiras concentram <span className="text-foreground font-semibold">94%</span>{" "}
              da receita.
            </div>
          </div>
        </section>

        {/* Ranking + Goals */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-sm lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-warning" />
                <h2 className="text-base font-semibold tracking-tight">
                  Ranking de Empresas & Vendedores
                </h2>
              </div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Junho · 2026
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.02] text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Empresa</th>
                    <th className="px-4 py-3 text-right">Receita</th>
                    <th className="px-4 py-3 text-right">Comissão</th>
                    <th className="px-4 py-3 text-left">Meta</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((p) => (
                    <tr key={p.rank} className="border-t border-border hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono text-xs">
                        <span
                          className={cn(
                            "inline-grid size-6 place-items-center rounded-md border text-xs font-bold",
                            p.rank === 1
                              ? "border-warning/40 bg-warning/10 text-warning"
                              : "border-border bg-card",
                          )}
                        >
                          {p.rank === 1 ? <Crown className="size-3" /> : p.rank}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-right font-mono">{p.revenue}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                        {p.commission}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/5">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                p.goal >= 80
                                  ? "bg-success"
                                  : p.goal >= 60
                                    ? "bg-primary"
                                    : "bg-warning",
                              )}
                              style={{ width: `${p.goal}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-muted-foreground">
                            {p.goal}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-6 backdrop-blur-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Meta Mensal Voyage
                </span>
                <TrendingUp className="size-4 text-primary" />
              </div>
              <div className="font-mono text-3xl font-semibold">R$ 1,21M</div>
              <div className="text-xs text-muted-foreground">de R$ 1,67M projetados</div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-primary/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-[oklch(0.7_0.16_295)]"
                  style={{ width: "72%" }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] font-mono text-muted-foreground">
                <span>72% concluído</span>
                <span>D-6</span>
              </div>
            </div>

            <Link
              to="/monitor"
              className="group block rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-sm hover:border-warning/40 transition-colors"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-warning">
                  Torre de Controle
                </span>
                <Radar className="size-4 text-warning" />
              </div>
              <div className="text-sm">
                <span className="font-mono text-2xl font-semibold">7</span>{" "}
                <span className="text-muted-foreground">partidas hoje</span>
              </div>
              <div className="mt-2 flex gap-2 text-[10px] font-bold uppercase tracking-widest">
                <span className="rounded bg-success/10 px-2 py-0.5 text-success">3 ok</span>
                <span className="rounded bg-warning/10 px-2 py-0.5 text-warning">1 iminente</span>
                <span className="rounded bg-danger/10 px-2 py-0.5 text-danger">1 atrasada</span>
              </div>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-foreground/80 group-hover:text-foreground">
                Abrir monitor em tempo real <ArrowRight className="size-3" />
              </div>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2 py-1 font-medium text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", dot)} /> {label}
    </span>
  );
}
