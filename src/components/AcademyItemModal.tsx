import { useState, useEffect } from "react";
import { X, Save, Loader2, BookOpen, PlayCircle, FileText, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { AcademyItem } from "@/hooks/use-academy-realtime";

interface Props {
  item: AcademyItem | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultType?: "course" | "book" | "topic";
}

export function AcademyItemModal({ item, open, onClose, onSuccess, defaultType = "course" }: Props) {
  const [type, setType] = useState<"course" | "book" | "topic">(defaultType);
  const [category, setCategory] = useState<string>("financas");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [duration, setDuration] = useState("");
  const [modules, setModules] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [driveLink, setDriveLink] = useState("");
  const [priority, setPriority] = useState("Média");
  const [status, setStatus] = useState("Pendente");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (item) {
        setType(item.type);
        setCategory(item.category);
        setTitle(item.title);
        setDescription(item.description || "");
        setAuthor(item.author || "");
        setDuration(item.duration || "");
        setModules(item.modules || 0);
        setProgress(item.progress || 0);
        setDriveLink(item.drive_link || "");
        setPriority(item.priority || "Média");
        setStatus(item.status || "Pendente");
        setNotes(item.notes || "");
      } else {
        setType(defaultType);
        setCategory("financas");
        setTitle("");
        setDescription("");
        setAuthor("");
        setDuration("");
        setModules(0);
        setProgress(0);
        setDriveLink("");
        setPriority("Média");
        setStatus("Pendente");
        setNotes("");
      }
    }
  }, [open, item, defaultType]);

  if (!open) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = {
      type,
      category,
      title,
      description,
      author,
      duration,
      modules,
      progress,
      drive_link: driveLink,
      priority,
      status,
      notes,
    };

    try {
      if (item) {
        await supabase.from("academy_items").update(payload).eq("id", item.id);
      } else {
        await supabase.from("academy_items").insert([payload]);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar o item.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (!confirm("Tem certeza que deseja excluir este item?")) return;
    
    setSaving(true);
    try {
      await supabase.from("academy_items").delete().eq("id", item.id);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-4xl overflow-y-auto max-h-[95vh] rounded-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-8">
        <div className="flex items-center justify-between border-b border-border bg-muted/20 p-5 sticky top-0 z-10 backdrop-blur-md">
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              {item ? "Editar Item" : "Novo Item na Academy"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Tipo de Conteúdo
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setType("course")}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-3 transition-all",
                  type === "course" 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-border bg-background/50 text-muted-foreground hover:bg-muted"
                )}
              >
                <PlayCircle className="size-5" />
                <span className="text-xs font-semibold">Curso</span>
              </button>
              
              <button
                type="button"
                onClick={() => setType("book")}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-3 transition-all",
                  type === "book" 
                    ? "border-amber-500 bg-amber-500/10 text-amber-500" 
                    : "border-border bg-background/50 text-muted-foreground hover:bg-muted"
                )}
              >
                <BookOpen className="size-5" />
                <span className="text-xs font-semibold">Livro</span>
              </button>

              <button
                type="button"
                onClick={() => setType("topic")}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-3 transition-all",
                  type === "topic" 
                    ? "border-blue-500 bg-blue-500/10 text-blue-500" 
                    : "border-border bg-background/50 text-muted-foreground hover:bg-muted"
                )}
              >
                <FileText className="size-5" />
                <span className="text-xs font-semibold">Manual / Tópico</span>
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Categoria Principal
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="financas">Finanças</option>
                <option value="onibus">Frota e Ônibus</option>
                <option value="geral">Gestão Geral</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Título
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === "topic" ? "Ex: Manual de Operação, Procedimento de Caixa..." : "Ex: Inteligência Financeira..."}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Link do Google Drive (Material / Arquivo)
            </label>
            <input
              type="url"
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <p className="text-[10px] text-muted-foreground">
              Cole o link da planilha, documento ou pasta do Google Drive.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === "topic" ? "Descreva o objetivo deste manual ou tópico..." : "Descreva o conteúdo..."}
              className="w-full min-h-[80px] resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {type === "course" && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Duração</label>
                <input type="text" placeholder="Ex: 4h 30m" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Módulos</label>
                <input type="number" min="0" value={modules} onChange={(e) => setModules(Number(e.target.value))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Progresso (%)</label>
                <input type="number" min="0" max="100" value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
            </div>
          )}

          {(type === "book" || type === "topic") && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {type === "topic" ? "Autor / Responsável" : "Autor"}
              </label>
              <input type="text" placeholder={type === "topic" ? "Quem criou ou é responsável por este manual..." : "Nome do autor..."} value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>
          )}

          {type === "topic" && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
                  <option value="Pendente">Pendente</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Concluído">Concluído</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Prioridade</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
                  <option value="Baixa">Baixa</option>
                  <option value="Média">Média</option>
                  <option value="Alta">Alta</option>
                  <option value="Crítica">Crítica</option>
                </select>
              </div>
            </div>
          )}

          {/* Notion-style Notepad */}
          <div className="pt-6 mt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="size-5 text-muted-foreground" />
              <h3 className="font-bold text-foreground">
                {type === "topic" 
                  ? "Conteúdo do Manual (Procedimentos, Regras & Passo a Passo)" 
                  : "Bloco de Notas (Resumos & Capítulos)"}
              </h3>
            </div>
            <div className="bg-background rounded-xl border border-border overflow-hidden transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary shadow-inner">
              <div className="flex gap-2 p-2 border-b border-border bg-muted/30 text-muted-foreground">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-muted rounded">Suporta Formatação Livre</span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  // Auto-resize magic
                  e.target.style.height = 'auto';
                  e.target.style.height = (e.target.scrollHeight) + 'px';
                }}
                placeholder={type === "topic" 
                  ? "Escreva o conteúdo do manual aqui...\n(Ex: 1. Passo um\n2. Passo dois\n- Regra importante)" 
                  : "Escreva seus resumos, insights, capítulos ou notas de estudo aqui...\n(Pressione Enter para criar novos parágrafos)"}
                className="w-full min-h-[400px] p-6 bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground/50 leading-relaxed font-serif"
                style={{ resize: 'none' }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border mt-8">
            {item ? (
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs font-bold uppercase tracking-widest text-danger hover:text-danger/80 transition-colors"
              >
                Excluir
              </button>
            ) : <div/>}
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border bg-card px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02]",
                  saving && "opacity-70 pointer-events-none"
                )}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
