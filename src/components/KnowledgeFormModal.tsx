import { useState, useEffect } from "react";
import { X, Save, Loader2, KeyRound, Info, GitBranch, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { KnowledgeItem } from "@/hooks/use-knowledge-base";

interface Props {
  item: KnowledgeItem | null;
  open: boolean;
  onClose: () => void;
}

export function KnowledgeFormModal({ item, open, onClose }: Props) {
  const [category, setCategory] = useState<"login" | "information" | "process">("information");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [fields, setFields] = useState<{label: string, value: string}[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (item) {
        setCategory(item.category);
        setTitle(item.title);
        try {
          const parsed = JSON.parse(item.content);
          setContent(parsed.text || "");
          setFields(parsed.fields || []);
        } catch {
          setContent(item.content || "");
          setFields([]);
        }
      } else {
        setCategory("information");
        setTitle("");
        setContent("");
        setFields([]);
      }
    }
  }, [open, item]);

  if (!open) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = JSON.stringify({ text: content, fields });

    try {
      if (item) {
        await (supabase as any).from("knowledge_base").update({
          category,
          title,
          content: payload,
          updated_at: new Date().toISOString()
        }).eq("id", item.id);
      } else {
        await (supabase as any).from("knowledge_base").insert({
          category,
          title,
          content: payload
        });
      }
      onClose();
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar o item. Verifique se você tem permissão.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (!confirm("Tem certeza que deseja excluir este item?")) return;
    
    setSaving(true);
    try {
      await (supabase as any).from("knowledge_base").delete().eq("id", item.id);
      onClose();
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-8">
        <div className="flex items-center justify-between border-b border-border bg-muted/20 p-5">
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              {item ? "Editar Item" : "Novo Item no Manual"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adicione processos, credenciais ou informações úteis.
            </p>
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
              Categoria
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setCategory("login")}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
                  category === "login" 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-border bg-background/50 text-muted-foreground hover:bg-muted"
                )}
              >
                <KeyRound className="size-5" />
                <span className="text-xs font-semibold">Conta / Login</span>
              </button>
              
              <button
                type="button"
                onClick={() => setCategory("information")}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
                  category === "information" 
                    ? "border-success bg-success/10 text-success" 
                    : "border-border bg-background/50 text-muted-foreground hover:bg-muted"
                )}
              >
                <Info className="size-5" />
                <span className="text-xs font-semibold">Informação</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory("process")}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
                  category === "process" 
                    ? "border-warning bg-warning/10 text-warning" 
                    : "border-border bg-background/50 text-muted-foreground hover:bg-muted"
                )}
              >
                <GitBranch className="size-5" />
                <span className="text-xs font-semibold">Processo</span>
              </button>
            </div>
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
              placeholder="Ex: Senha do Wi-Fi, ou Como emitir nota fiscal..."
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium focus:border-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex justify-between items-center">
              <span>Texto Principal (Opcional)</span>
              <button
                type="button"
                onClick={() => setFields([...fields, { label: "", value: "" }])}
                className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="size-3" /> Adicionar Campo Específico
              </button>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Descreva as instruções ou texto principal aqui..."
              className="w-full min-h-[100px] resize-y rounded-lg border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none leading-relaxed"
            />
          </div>

          {fields.length > 0 && (
            <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/50">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Campos Personalizados
              </label>
              {fields.map((field, idx) => (
                <div key={idx} className="flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Nome do Campo (ex: URL)"
                      value={field.label}
                      onChange={(e) => {
                        const newFields = [...fields];
                        newFields[idx].label = e.target.value;
                        setFields(newFields);
                      }}
                      className="col-span-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold focus:border-primary focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Valor (ex: admin123)"
                      value={field.value}
                      onChange={(e) => {
                        const newFields = [...fields];
                        newFields[idx].value = e.target.value;
                        setFields(newFields);
                      }}
                      className="col-span-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFields(fields.filter((_, i) => i !== idx))}
                    className="p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors shrink-0"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-border">
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
                className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !title.trim() || (!content.trim() && fields.length === 0)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02]",
                  saving && "opacity-70 pointer-events-none"
                )}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {saving ? "Salvando..." : "Salvar Item"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
