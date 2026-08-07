import { Link, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
  Activity,
  Lightbulb,
  Calendar,
  DollarSign,
  Menu,
  X,
  Gift,
  Gamepad2,
  BellRing,
  ShoppingCart,
  Briefcase,
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
      { to: "/personal-os", search: { tab: "profissional" }, label: "Docs (Drive)", icon: Briefcase, permission: "view_dashboard" },
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
      { to: "/personal-os", search: { tab: "geral" }, label: "Visão Geral", icon: Cpu, permission: "view_dashboard" },
      { to: "/personal-os", search: { tab: "habitos" }, label: "Hábitos", icon: Activity, permission: "view_dashboard" },
      { to: "/personal-os", search: { tab: "tarefas" }, label: "Tarefas", icon: CheckSquare, permission: "view_dashboard" },
      { to: "/personal-os", search: { tab: "ideias" }, label: "Ideias", icon: Lightbulb, permission: "view_dashboard" },
      { to: "/personal-os", search: { tab: "agenda" }, label: "Agenda", icon: Calendar, permission: "view_dashboard" },
      { to: "/personal-os", search: { tab: "metas" }, label: "Metas", icon: Target, permission: "view_dashboard" },
      { to: "/personal-os", search: { tab: "leitura" }, label: "Leitura", icon: BookOpen, permission: "view_dashboard" },
      { to: "/personal-os", search: { tab: "evolucao" }, label: "Evolução", icon: TrendingUp, permission: "view_dashboard" },
      { to: "/personal-os", search: { tab: "recompensas" }, label: "Recompensas", icon: Gift, permission: "view_dashboard" },
      { to: "/personal-os", search: { tab: "financeiro" }, label: "Financeiro", icon: DollarSign, permission: "view_dashboard" },
      { to: "/personal-os", search: { tab: "compras" }, label: "Compras", icon: ShoppingCart, permission: "view_dashboard" },
      { to: "/personal-os", search: { tab: "estudos" }, label: "Estudos", icon: GraduationCap, permission: "view_dashboard" },
      { to: "/personal-os", search: { tab: "entretenimento" }, label: "Lazer", icon: Gamepad2, permission: "view_dashboard" },
      { to: "/personal-os", search: { tab: "alarmes" }, label: "Alarmes", icon: BellRing, permission: "view_dashboard" },
      { to: "/academy", label: "Academy", icon: GraduationCap, permission: "view_dashboard" },
    ],
  }
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchParams = useRouterState({ select: (s) => s.location.search }) as any;
  const { role, permissions, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'profissional' | 'pessoal'>('profissional');
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    if (pathname.startsWith('/academy')) {
      setActiveTab('pessoal');
    } else if (pathname.startsWith('/personal-os')) {
      if (searchParams?.tab === 'profissional') {
        setActiveTab('profissional');
      } else {
        setActiveTab('pessoal');
      }
    } else {
      setActiveTab('profissional');
    }
  }, [pathname, searchParams?.tab]);

  const profissionalSections = navSections.filter(s => s.label !== "Pessoal");
  const pessoalSections = navSections.filter(s => s.label === "Pessoal");

  const currentSections = activeTab === 'profissional' ? profissionalSections : pessoalSections;
  const allItems = currentSections.flatMap(section => section.items);

  const visibleItems = allItems.filter((item) => {
    if (role === "admin") return true;
    if (role === "seller" && item.to === "/billing") return true;
    return permissions.includes(item.permission);
  });

  const isVisible = isHovered || isPinned;

  return (
    <>
      {/* Trigger area para o dock no desktop */}
      <div
        className="fixed bottom-0 left-0 right-0 h-6 z-30 hidden md:block"
        onMouseEnter={() => setIsHovered(true)}
      />

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0A0A0C]/95 backdrop-blur-sm border-t border-[rgba(255,255,255,0.08)] z-[90] flex items-center justify-between px-6 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        {/* Left side icons */}
        <div className="flex gap-7">
          <Link to="/" className={cn("flex flex-col items-center gap-1 transition-colors", pathname === '/' ? "text-rose-500" : "text-[#71717A] hover:text-white")}>
            <LayoutDashboard className={cn("size-5", pathname === '/' && "fill-rose-500/20")} />
            <span className="text-[9px] font-bold uppercase tracking-widest">Início</span>
          </Link>
          <Link to="/personal-os" search={{ tab: 'geral' }} className={cn("flex flex-col items-center gap-1 transition-colors", pathname === '/personal-os' && searchParams.tab === 'geral' ? "text-rose-500" : "text-[#71717A] hover:text-white")}>
            <Cpu className={cn("size-5", pathname === '/personal-os' && searchParams.tab === 'geral' && "fill-rose-500/20")} />
            <span className="text-[9px] font-bold uppercase tracking-widest">Geral</span>
          </Link>
        </div>

        {/* Center space for Voice Assistant Button */}
        <div className="w-16 flex items-center justify-center pointer-events-none">
          <div className="absolute -top-5 w-16 h-16 rounded-full bg-[#0A0A0C]/95 backdrop-blur-sm border-t border-[rgba(255,255,255,0.08)] -z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] hidden"></div>
        </div>

        {/* Right side icons */}
        <div className="flex gap-7">
          <Link to="/personal-os" search={{ tab: 'leitura' }} className={cn("flex flex-col items-center gap-1 transition-colors", pathname === '/personal-os' && searchParams.tab === 'leitura' ? "text-rose-500" : "text-[#71717A] hover:text-white")}>
            <BookOpen className={cn("size-5", pathname === '/personal-os' && searchParams.tab === 'leitura' && "fill-rose-500/20")} />
            <span className="text-[9px] font-bold uppercase tracking-widest">Leitura</span>
          </Link>
          <button onClick={() => { if (isPinned) setIsHovered(false); setIsPinned(!isPinned); }} className={cn("flex flex-col items-center gap-1 transition-colors", isPinned ? "text-rose-500" : "text-[#71717A] hover:text-white")}>
            <Menu className="size-5" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Menu</span>
          </button>
        </div>
      </div>

      {/* Dock (Desktop) / Menu Sheet (Mobile) */}
      <div
        className={cn(
          "fixed z-40 transition-all duration-300 ease-out flex justify-center",
          "md:bottom-6 md:left-1/2 md:-translate-x-1/2 w-full md:max-w-4xl",
          "bottom-20 left-0 px-2 md:px-0",
          isVisible ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-[150%] opacity-0 pointer-events-none"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <nav className="w-full rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[#111113]/95 backdrop-blur-md shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[60vh] md:max-h-none">
          <div className="flex justify-between items-center border-b border-white/5 bg-black/40 p-1.5 px-3">
            <div className="w-8" />
            <div className="flex items-center rounded-lg bg-black/60 p-1 shadow-inner border border-white/5">
              <button
                onClick={() => setActiveTab('profissional')}
                className={cn(
                  "px-6 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all",
                  activeTab === 'profissional' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-white"
                )}
              >
                Profissional
              </button>
              <button
                onClick={() => setActiveTab('pessoal')}
                className={cn(
                  "px-6 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all",
                  activeTab === 'pessoal' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-white"
                )}
              >
                Pessoal
              </button>
            </div>
            <button
              onClick={() => { setIsPinned(false); setIsHovered(false); }}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="flex w-full items-center gap-1 overflow-x-auto px-3 py-2.5 custom-scrollbar">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActivePath = pathname === item.to;
              let active = isActivePath;

              if (isActivePath && item.search?.tab) {
                const currentTab = searchParams.tab || 'geral';
                active = currentTab === item.search.tab;
              } else if (isActivePath && pathname === '/personal-os' && !item.search) {
                active = false;
              }

              return (
                <Link
                  key={item.label}
                  to={item.to}
                  {...(item.search ? { search: item.search } : {})}
                  onClick={() => { setIsPinned(false); setIsHovered(false); }}
                  className={cn(
                    "flex min-w-[76px] flex-col items-center justify-center gap-1.5 rounded-xl p-2 text-center transition-colors shrink-0",
                    active
                      ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_oklch(0.65_0.19_255/0.25)]"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  <div className="relative">
                    <Icon className="size-[22px]" />
                    {item.badge && (
                      <span className="absolute -right-2 -top-2 flex size-2.5 items-center justify-center rounded-full bg-success">
                        <span className="absolute size-2.5 rounded-full bg-success animate-ping opacity-75"></span>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium tracking-tight whitespace-nowrap px-1 max-w-[80px] truncate">
                    {item.label}
                  </span>
                </Link>
              );
            })}
            <div className="w-[1px] h-10 bg-border/50 mx-1 shrink-0"></div>
            <button
              onClick={() => {
                setIsPinned(false);
                setIsHovered(false);
                signOut();
              }}
              className="flex min-w-[76px] flex-col items-center justify-center gap-1.5 rounded-xl p-2 text-center text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive shrink-0"
            >
              <LogOut className="size-[22px]" />
              <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">Sair</span>
            </button>
          </div>
        </nav>
      </div>
    </>
  );
}

export function SidebarContent() {
  return null;
}
