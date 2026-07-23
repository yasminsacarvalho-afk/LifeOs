import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Radar,
  Building2,
  Users,
  TrendingUp,
  LineChart,
  PackageOpen,
  Wallet,
  Settings,
  Target,
  BookOpen,
  Shield,
  LogOut,
  Car,
  Map,
  HelpCircle,
  CheckSquare,
  TestTube2,
  GraduationCap,
  Cpu,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navSections = [
  {
    label: "Operação",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, permission: "view_dashboard" },
      { to: "/monitor", label: "Monitor de Frotas", icon: Radar, badge: "AO VIVO", permission: "view_monitor" },
      { to: "/search-routes", label: "Buscador de Rotas", icon: Map, permission: "view_dashboard" },
      { to: "/packages", label: "Encomendas", icon: PackageOpen, permission: "view_packages" },
      { to: "/crm", label: "CRM & Funil", icon: Target, permission: "view_crm" },
    ],
  },
  
  {
    label: "Gestão",
    items: [
      { to: "/partners", label: "Empresas Parceiras", icon: Building2, permission: "view_partners" },
      { to: "/drivers", label: "Motoristas", icon: Car, permission: "view_admin" },
      { to: "/admin", label: "Gestão RH", icon: Users, permission: "view_admin" },
      { to: "/goals", label: "Metas & Ranking", icon: TrendingUp, permission: "view_goals" },
      { to: "/info", label: "Contatos e Info", icon: BookOpen, permission: "view_info" },
      { to: "/access", label: "Acessos e Permissões", icon: Shield, permission: "view_access" },
      { to: "/help", label: "Ajuda & Manual", icon: HelpCircle, permission: "view_dashboard" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { to: "/finance", label: "Dashboard Principal", icon: LayoutDashboard, permission: "view_billing" },
      { to: "/billing", label: "Caixa e Vendas", icon: Wallet, permission: "view_billing" },
      { to: "/reconcile", label: "Meta & Realizado", icon: Target, permission: "view_billing" },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { to: "/analytics", label: "Análises & Insights", icon: LineChart, permission: "view_analytics" },
      { to: "/quadro-operacional", label: "Quadro Detalhado", icon: ClipboardList, permission: "view_analytics" },
      { to: "/simulator", label: "Simulador de Metas", icon: Target, permission: "view_analytics" },
      { to: "/growth", label: "Testes & Growth", icon: TestTube2, permission: "view_analytics" },
    ],
  },
  {
    label: "Pessoal",
    items: [
      { to: "/personal-os", label: "Personal OS", icon: Cpu, permission: "view_dashboard", badge: "NOVO" },
      { to: "/academy", label: "Voyage Academy", icon: GraduationCap, permission: "view_dashboard", badge: "NOVO" },
      { to: "/tasks", label: "Tarefas & Hábitos", icon: CheckSquare, permission: "view_dashboard" },
    ],
  }
];

export function SidebarContent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { role, permissions, signOut, user } = useAuth();

  return (
    <>
      <Link to="/" className="mb-10 flex items-center gap-3">
        <div className="relative grid size-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent font-bold text-primary-foreground shadow-glow-accent">
          <span className="italic">VF</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight">Agência de Itambé</span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            ERP · Transporte
          </span>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto">
        {navSections.map((section) => {
          const visibleItems = section.items.filter((item) => {
            if (role === "admin") return true;
            if (role === "seller" && item.to === "/billing") return true;
            return permissions.includes(item.permission);
          });
          
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label}>
              <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {section.label}
              </div>
              <div className="flex flex-col gap-1">
                {visibleItems.map((item) => {
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
          );
        })}
      </nav>

      <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 shrink-0">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
            Meta Mensal
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">JUN</span>
        </div>
        <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-primary/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
            style={{ width: "72%" }}
          />
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="font-mono text-muted-foreground">R$ 1.2M</span>
          <span className="font-mono font-semibold text-primary">72%</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border/50 flex flex-col gap-1 shrink-0">
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground truncate mb-1" title={user?.email || ""}>
          {user?.email}
        </div>
        <button 
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="size-4" />
          Sair da Conta
        </button>
      </div>
    </>
  );
}

export function AppSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-border bg-card/40 p-5 backdrop-blur-xl lg:flex">
      <SidebarContent />
    </aside>
  );
}
