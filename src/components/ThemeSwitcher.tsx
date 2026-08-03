import { Palette } from "lucide-react";
import { useTheme, ThemeType } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { useState } from "react";

const THEMES: { id: ThemeType; name: string; color: string }[] = [
  { id: "theme-cosmos", name: "Cosmos (Padrão)", color: "bg-rose-500" },
  { id: "theme-ocean", name: "Oceano", color: "bg-blue-500" },
  { id: "theme-forest", name: "Floresta", color: "bg-emerald-500" },
  { id: "theme-dracula", name: "Drácula", color: "bg-purple-500" },
  { id: "theme-monochrome", name: "Monocromático", color: "bg-zinc-400" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg bg-card/50 p-2 text-muted-foreground hover:bg-card hover:text-foreground transition-colors border border-border"
        title="Mudar Tema"
      >
        <Palette className="size-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 bottom-full mb-2 z-50 w-48 rounded-xl border border-border bg-card p-2 shadow-xl backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="mb-2 px-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Temas
            </div>
            <div className="flex flex-col gap-1">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors text-left",
                    theme === t.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className={cn("size-3 rounded-full", t.color)} />
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
