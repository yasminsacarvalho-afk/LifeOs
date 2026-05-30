import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Radar,
  Building2,
  Users,
  TrendingUp,
  Wallet,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navSections = [
  {
    label: "Operação",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/monitor", label: "Monitor de Frotas", icon: Radar, badge: "AO VIVO" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { to: "/partners", label: "Empresas Parceiras", icon: Building2 },
      { to: "/sellers", label: "Vendedores", icon: Users },
      { to: "/billing", label: "Faturamento", icon: Wallet },
      { to: "/goals", label: "Metas & Ranking", icon: TrendingUp },
    ],
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-border bg-card/40 p-5 backdrop-blur-xl lg:flex">
      <Link to="/" className="mb-10 flex items-center gap-3">
        <div className="relative grid size-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-[oklch(0.7_0.16_295)] font-bold text-primary-foreground shadow-glow-accent">
          <span className="italic">VF</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight">Voyage Flow</span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            ERP · Transporte
          </span>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {section.label}
            </div>
            <div className="flex flex-col gap-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_oklch(0.65_0.19_255/0.25)]"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="flex items-center gap-1 rounded bg-success/15 px-1.5 py-0.5 text-[9px] font-bold text-success">
                        <span className="size-1 rounded-full bg-success animate-pulse" />
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
            Meta Mensal
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">JUN</span>
        </div>
        <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-primary/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-[oklch(0.7_0.16_295)]"
            style={{ width: "72%" }}
          />
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="font-mono text-muted-foreground">R$ 1.2M</span>
          <span className="font-mono font-semibold text-primary">72%</span>
        </div>
      </div>

      <button className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground">
        <Settings className="size-4" />
        Configurações
      </button>
    </aside>
  );
}
