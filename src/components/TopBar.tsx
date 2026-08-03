import { useEffect, useState } from "react";
import { Bell, Search } from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now ? now.toLocaleTimeString("pt-BR", { hour12: false }) : "--:--:--";
  const date = now
    ? now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
    : "Carregando…";

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-end justify-between gap-4 border-b border-border bg-background/60 px-4 md:px-8 py-5 backdrop-blur-xl print:hidden">
      <div className="flex items-center gap-4">

        <div>
          <div className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
            <span>Sistema online · {date}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground hidden md:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
        <div className="hidden items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-sm text-muted-foreground md:flex">
          <Search className="size-4" />
          <span>Buscar...</span>
          <kbd className="ml-3 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ⌘K
          </kbd>
        </div>

        <div className="hidden flex-col items-end font-mono text-xs leading-tight md:flex">
          <span className="text-base font-semibold tabular-nums">{time}</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            BRT
          </span>
        </div>

        <ThemeSwitcher />

        <button className="relative grid size-9 place-items-center rounded-lg border border-border bg-card/60 text-muted-foreground transition-colors hover:text-foreground shrink-0">
          <Bell className="size-4" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-danger" />
        </button>

        {actions}
      </div>
    </header>
  );
}
