import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { cn } from "@/lib/utils";
import { BookOpen, AlertTriangle, CheckCircle2, Lightbulb, Plus, KeyRound, Info, GitBranch, Edit3, Search, Copy, Check } from "lucide-react";
import { useKnowledgeBaseRealtime, type KnowledgeItem } from "@/hooks/use-knowledge-base";
import { KnowledgeFormModal } from "@/components/KnowledgeFormModal";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/help")({
  component: HelpPage,
});

function HelpPage() {
  const { items, loading } = useKnowledgeBaseRealtime();
  const { role, permissions } = useAuth();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const canEdit = role === "admin" || permissions.includes("edit_settings");

  const handleNew = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleEdit = (item: KnowledgeItem) => {
    if (!canEdit) return;
    setEditingItem(item);
    setModalOpen(true);
  };

  const filteredItems = items.filter(i => {
    if (!searchQuery) return true;
    const lowerQ = searchQuery.toLowerCase();
    return i.title.toLowerCase().includes(lowerQ) || i.content.toLowerCase().includes(lowerQ);
  });

  const logins = filteredItems.filter(i => i.category === "login");
  const infos = filteredItems.filter(i => i.category === "information");
  const processes = filteredItems.filter(i => i.category === "process");

  const parseContent = (contentStr: string) => {
    try {
      const parsed = JSON.parse(contentStr);
      return {
        text: parsed.text || "",
        fields: parsed.fields || [] as {label: string, value: string}[]
      };
    } catch {
      return { text: contentStr, fields: [] as {label: string, value: string}[] };
    }
  };

  const renderContent = (contentStr: string, truncate: boolean = false) => {
    const { text, fields } = parseContent(contentStr);
    
    return (
      <div className="space-y-3">
        {text && (
          <p className={cn("text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed", truncate && "line-clamp-4")}>
            {text}
          </p>
        )}
        {fields.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            {fields.map((f: any, idx: number) => (
              <CopyableField key={idx} label={f.label} value={f.value} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <TopBar
        title="Ajuda & Base de Conhecimento"
        subtitle="Guias, processos, contas e regras de operação do sistema."
        actions={
          canEdit && (
            <button
              onClick={handleNew}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="size-4" />
              Adicionar Tópico
            </button>
          )
        }
      />
      
      <main className="px-4 md:px-8 py-6 md:py-8 max-w-6xl mx-auto space-y-6">
        
        <div className="relative max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="size-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por termo ou palavra-chave no manual..."
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors shadow-sm"
          />
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <span className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            
            {/* Contas e Logins */}
            <section className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <KeyRound className="size-5" />
                </div>
                <h2 className="text-lg font-bold">Contas e Acessos</h2>
              </div>
              
              {logins.length === 0 ? (
                <div className="text-sm text-muted-foreground italic text-center p-4 border border-dashed border-border rounded-xl">Nenhum acesso cadastrado.</div>
              ) : (
                <div className="space-y-4 flex-1">
                  {logins.map(item => (
                    <div key={item.id} className="group relative bg-background border border-border/60 rounded-xl p-4 hover:border-primary/30 transition-colors">
                      <h3 className="font-semibold text-sm mb-3 pr-8">{item.title}</h3>
                      {renderContent(item.content)}
                      {canEdit && (
                        <button onClick={() => handleEdit(item)} className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                          <Edit3 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Informações */}
            <section className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col xl:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-success/10 text-success rounded-lg">
                  <Info className="size-5" />
                </div>
                <h2 className="text-lg font-bold">Avisos e Informações</h2>
              </div>
              
              {infos.length === 0 ? (
                <div className="text-sm text-muted-foreground italic text-center p-4 border border-dashed border-border rounded-xl">Nenhuma informação cadastrada.</div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4 flex-1">
                  {infos.map(item => (
                    <div key={item.id} className="group relative bg-success/5 border border-success/10 rounded-xl p-4 hover:border-success/30 transition-colors">
                      <h3 className="font-semibold text-sm mb-3 text-success pr-8">{item.title}</h3>
                      {renderContent(item.content)}
                      {canEdit && (
                        <button onClick={() => handleEdit(item)} className="absolute top-3 right-3 p-1.5 text-success/50 hover:text-success hover:bg-success/10 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                          <Edit3 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Processos */}
            <section className="bg-card border border-border rounded-2xl p-6 shadow-sm xl:col-span-3">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-warning/10 text-warning rounded-lg">
                  <GitBranch className="size-5" />
                </div>
                <h2 className="text-lg font-bold">Manuais e Processos Operacionais</h2>
              </div>
              
              {processes.length === 0 ? (
                <div className="text-sm text-muted-foreground italic text-center p-6 border border-dashed border-border rounded-xl">Nenhum manual de processo cadastrado.</div>
              ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {processes.map(item => (
                    <div key={item.id} className="group relative bg-background border border-border rounded-xl p-5 hover:border-warning/40 hover:shadow-md transition-all">
                      <h3 className="font-bold text-base mb-4 pr-8">{item.title}</h3>
                      <div className="bg-muted/20 p-4 rounded-lg border border-border/50">
                        {renderContent(item.content)}
                      </div>
                      {canEdit && (
                        <button onClick={() => handleEdit(item)} className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-warning hover:bg-warning/10 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                          <Edit3 className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
            
          </div>
        )}
      </main>

      <KnowledgeFormModal
        item={editingItem}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

function CopyableField({ label, value }: { label: string, value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs group/field">
      <span className="font-semibold text-foreground/80 min-w-[80px]">{label}:</span>
      <div className="flex items-center gap-2 flex-1">
        <span className="font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded break-all">{value}</span>
        <button 
          onClick={handleCopy}
          title="Copiar valor"
          className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors opacity-0 group-hover/field:opacity-100 focus:opacity-100"
        >
          {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
        </button>
      </div>
    </div>
  );
}
