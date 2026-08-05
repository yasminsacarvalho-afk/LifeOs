import { useEffect, useState } from "react";
import { Bell, Search, Download, Settings, X, ShieldAlert, Monitor, Smartphone, User, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

function TopBarClock() {
  const [now, setNow] = useState<Date | null>(null);

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
    <>
      <span className="hidden sm:inline">· {date}</span>
      {/* We need to pass the time back up or render it directly. Wait, the date is in the left side and time is in the right side. We can just create two small components. */}
    </>
  );
}

// Let's create two isolated components to completely prevent TopBar re-renders
function TopBarDate() {
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      if (d.getDate() !== now.getDate()) setNow(d); // Only update once a day for date
    }, 60000); // Check every minute
    return () => clearInterval(id);
  }, [now]);
  return <span className="hidden sm:inline">· {now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</span>;
}

function TopBarTime() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = now ? now.toLocaleTimeString("pt-BR", { hour12: false }) : "--:--:--";
  
  return (
    <div className="hidden flex-col items-end font-mono text-xs leading-tight md:flex">
      <span className="text-base font-semibold tabular-nums">{time}</span>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">BRT</span>
    </div>
  );
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  
  const handleDownloadApp = () => {
    alert("Para instalar como aplicativo no PC ou Celular:\n\nOpção A (Mais Fácil): Se estiver no Google Chrome ou Edge, procure o botão 'Instalar App' lá em cima, do lado direito da barra de pesquisa (URL).\n\nOpção B (App Nativo Real): No seu terminal onde você digita os comandos, rode 'npm run tauri build'. Ele vai gerar o arquivo instalador executável direto para a sua máquina na pasta src-tauri/target/release!");
  };

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-end justify-between gap-4 border-b border-border bg-background/60 px-4 md:px-8 py-5 backdrop-blur-xl print:hidden">
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-[10px] md:text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success animate-pulse shrink-0" />
            <span className="truncate">Sistema online <TopBarDate /></span>
          </div>
          <h1 className="text-lg md:text-2xl font-semibold tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground hidden md:block truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
        <div className="hidden items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-sm text-muted-foreground md:flex">
          <Search className="size-4" />
          <span>Buscar...</span>
          <kbd className="ml-3 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ⌘K
          </kbd>
        </div>

        <TopBarTime />

        <ThemeSwitcher />

        <button className="relative grid size-9 place-items-center rounded-lg border border-border bg-card/60 text-muted-foreground transition-colors hover:text-foreground shrink-0" title="Notificações">
          <Bell className="size-4" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-danger" />
        </button>
        
        <button onClick={() => setSheetOpen(true)} className="relative grid size-9 place-items-center rounded-lg border border-border bg-card/60 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors shrink-0" title="Configurações e Download">
          <Settings className="size-4" />
        </button>

        {actions}
      </div>

      {/* MODAL LATERAL DE CONFIGURAÇÕES */}
      {sheetOpen && (
        <>
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setSheetOpen(false)}></div>
          <div className="fixed inset-y-0 right-0 z-[101] w-full max-w-sm bg-[#09090B] border-l border-[rgba(255,255,255,0.05)] shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.05)] bg-[#050505]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="size-5 text-emerald-400" /> Sistema
              </h2>
              <button onClick={() => setSheetOpen(false)} className="text-[#6F6F6F] hover:text-white transition-colors p-2 bg-[#1A1A1E] rounded-full">
                <X className="size-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">
              
              {/* Info da Versão */}
              <div className="flex flex-col gap-2">
                <h3 className="text-[11px] font-bold text-[#6F6F6F] uppercase tracking-widest flex items-center gap-2 mb-1">
                  <Monitor className="size-3.5" /> Arquitetura do Sistema
                </h3>
                <div className="bg-[#111113] p-4 rounded-xl border border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Híbrido (PWA + Nativo)</p>
                    <p className="text-xs text-emerald-400 font-medium">Build v2.5.0 (Câmera & Offline)</p>
                  </div>
                  <div className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] uppercase font-bold rounded-md tracking-wider">Universal</div>
                </div>
                <p className="text-[11px] text-[#A1A1AA] leading-relaxed mt-1">
                  O Scanner de Câmera e o Cache Offline já estão funcionando. Use a opção PWA abaixo para a melhor experiência.
                </p>
              </div>

              {/* Tema e Aparência */}
              <div className="flex flex-col gap-2">
                <h3 className="text-[11px] font-bold text-[#6F6F6F] uppercase tracking-widest mb-1">Aparência</h3>
                <div className="bg-[#111113] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <p className="text-sm text-[#A1A1AA] mb-3">O tema geral da plataforma é ajustado pelo botão na barra do topo, ao lado do sino de notificações. Por padrão utilizamos o modo <strong>Dark</strong> para descanso visual.</p>
                </div>
              </div>

              {/* Dados de Login */}
              <div className="flex flex-col gap-2">
                <h3 className="text-[11px] font-bold text-[#6F6F6F] uppercase tracking-widest flex items-center gap-2 mb-1">
                  <User className="size-3.5" /> Dados de Acesso
                </h3>
                <div className="bg-[#111113] p-4 rounded-xl border border-[rgba(255,255,255,0.06)] flex items-start gap-3">
                  <div className="size-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                    <User className="size-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Administrador LifeOS</p>
                    <p className="text-xs text-[#A1A1AA]">Sincronizado via Supabase Auth</p>
                    <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mt-2">Sessão Segura</p>
                  </div>
                </div>
              </div>

              {/* Download e Instaladores */}
              <div className="flex flex-col gap-2">
                <h3 className="text-[11px] font-bold text-[#6F6F6F] uppercase tracking-widest flex items-center gap-2 mb-1">
                  <Download className="size-3.5" /> Instalação no Celular/PC
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => alert("Recomendado!\n\nNo seu navegador Chrome ou Safari, abra o menu e clique em 'Adicionar à Tela Inicial' ou 'Instalar App'. Ele vira um aplicativo completo com Câmera e modo Offline de imediato.")} className="bg-[#111113] border border-emerald-500/30 hover:border-emerald-500 p-4 rounded-xl transition-all flex items-center gap-4 text-left group">
                    <div className="p-3 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                      <Smartphone className="size-6 text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">Instalação Rápida (PWA)</span>
                      <span className="text-[10px] text-[#A1A1AA] block mt-0.5">Via Navegador (Recomendado)</span>
                    </div>
                  </button>
                  <button onClick={() => alert("Para gerar o instalador nativo, rode o comando 'npm run tauri build' no terminal do seu computador.")} className="bg-[#111113] border border-[rgba(255,255,255,0.06)] hover:border-blue-500/50 p-4 rounded-xl transition-all flex items-center gap-4 text-left group">
                    <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                      <Monitor className="size-6 text-blue-400" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">Compilação Nativa (Tauri)</span>
                      <span className="text-[10px] text-[#A1A1AA] block mt-0.5">Gera .APK ou .EXE</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Permissões e Diagnóstico */}
              <div className="flex flex-col gap-2 pb-8">
                <h3 className="text-[11px] font-bold text-[#6F6F6F] uppercase tracking-widest flex items-center gap-2 mb-1">
                  <ShieldAlert className="size-3.5" /> Status e Permissões
                </h3>
                <div className="bg-[#111113] p-4 rounded-xl border border-[rgba(255,255,255,0.06)] flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-white">Notificações em Background</span>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-bold rounded">Permitido</span>
                  </div>
                  <div className="w-full h-px bg-[rgba(255,255,255,0.05)]"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-white">Acesso ao Armazenamento (Drive)</span>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-bold rounded">Conectado</span>
                  </div>
                  <div className="w-full h-px bg-[rgba(255,255,255,0.05)]"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-white">Localização (GPS Reversa)</span>
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] uppercase font-bold rounded">Opcional</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
