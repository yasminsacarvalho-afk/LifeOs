import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/contexts/AuthContext";
import { useAcademyRealtime, type AcademyItem } from "@/hooks/use-academy-realtime";
import { AcademyItemModal } from "@/components/AcademyItemModal";
import { GraduationCap, Wallet, Bus, PlayCircle, BookOpen, Clock, Lock, ChevronRight, BrainCircuit, Library, FileText, CheckCircle2, Circle, AlertCircle, Edit3, Plus, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/academy")({
  component: AcademyPage,
});

function getCategoryTheme(category: string) {
  if (category === "financas") return { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", gradient: "from-emerald-500/20 to-transparent", icon: Wallet };
  if (category === "onibus") return { color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", gradient: "from-blue-500/20 to-transparent", icon: Bus };
  return { color: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20", gradient: "from-violet-500/20 to-transparent", icon: BrainCircuit };
}

function AcademyPage() {
  const { role, permissions } = useAuth();
  const { items, loading, refetch } = useAcademyRealtime();
  
  const [activeTab, setActiveTab] = useState<"all" | "financas" | "onibus">("all");
  const [viewMode, setViewMode] = useState<"course" | "book" | "topic">("course");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AcademyItem | null>(null);
  
  // Authorization check
  const isAuthorized = role === "admin" || (permissions && permissions.includes("view_academy"));
  
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] bg-background gap-4 animate-in fade-in">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-2">
          <Lock className="size-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Acesso Não Autorizado</h2>
        <p className="text-muted-foreground text-sm max-w-md text-center">
          Você precisa de permissões especiais para acessar a Universidade Corporativa. Fale com um administrador.
        </p>
      </div>
    );
  }

  const handleNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: AcademyItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  // Filtrar os items do banco
  const filteredCourses = items.filter(c => c.type === "course" && (activeTab === "all" || c.category === activeTab));
  const filteredBooks = items.filter(b => b.type === "book" && (activeTab === "all" || b.category === activeTab));
  const filteredTopics = items.filter(t => t.type === "topic" && (activeTab === "all" || t.category === activeTab));

  return (
    <>
      <TopBar
        title="Voyage Academy"
        subtitle="Centro de excelência intelectual para desenvolvimento pessoal em finanças e operação de ônibus."
        actions={
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="size-4" />
            Adicionar Novo Item
          </button>
        }
      />
      
      <main className="px-4 md:px-8 py-6 md:py-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
        
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <GraduationCap className="size-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Conteúdos Ativos</p>
              <h3 className="text-2xl font-bold">{items.length}</h3>
            </div>
          </div>
          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Wallet className="size-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Itens em Finanças</p>
              <h3 className="text-2xl font-bold">{items.filter(i => i.category === "financas").length}</h3>
            </div>
          </div>
          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
              <Bus className="size-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Itens em Operação</p>
              <h3 className="text-2xl font-bold">{items.filter(i => i.category === "onibus").length}</h3>
            </div>
          </div>
        </div>

        {/* View Mode & Filters Control */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/20 p-2 rounded-2xl border border-border/50">
          
          <div className="flex gap-1 bg-background rounded-xl p-1 shadow-sm border border-border/50 w-full md:w-auto">
            <button 
              onClick={() => setViewMode("course")}
              className={cn("flex-1 md:flex-none px-4 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all", viewMode === "course" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <PlayCircle className="size-4" /> Cursos
            </button>
            <button 
              onClick={() => setViewMode("book")}
              className={cn("flex-1 md:flex-none px-4 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all", viewMode === "book" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <Library className="size-4" /> Livros
            </button>
            <button 
              onClick={() => setViewMode("topic")}
              className={cn("flex-1 md:flex-none px-4 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all", viewMode === "topic" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <FileText className="size-4" /> Manuais & Tópicos
            </button>
          </div>

          <div className="flex gap-1 w-full md:w-auto justify-center md:justify-end">
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "px-4 py-2 text-sm font-semibold rounded-lg transition-all",
                activeTab === "all" ? "bg-background text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Todos
            </button>
            <button
              onClick={() => setActiveTab("financas")}
              className={cn(
                "px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2",
                activeTab === "financas" ? "bg-background text-emerald-500 shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Wallet className="size-4" /> Finanças
            </button>
            <button
              onClick={() => setActiveTab("onibus")}
              className={cn(
                "px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2",
                activeTab === "onibus" ? "bg-background text-blue-500 shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Bus className="size-4" /> Ônibus
            </button>
          </div>

        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <span className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Content Area */}
            {viewMode === "course" && (
              <div className="grid md:grid-cols-2 gap-6 animate-in fade-in">
                {filteredCourses.length === 0 && (
                  <div className="col-span-full py-12 text-center text-muted-foreground italic border border-dashed border-border rounded-2xl">
                    Nenhum curso encontrado nesta categoria. Clique no botão acima para adicionar.
                  </div>
                )}
                {filteredCourses.map((course) => {
                  const theme = getCategoryTheme(course.category);
                  const Icon = theme.icon;
                  return (
                    <div 
                      key={course.id}
                      className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5"
                    >
                      <div className={cn("absolute inset-0 opacity-20 bg-gradient-to-br pointer-events-none transition-opacity group-hover:opacity-40", theme.gradient)} />
                      
                      <button onClick={() => handleEdit(course)} className="absolute top-4 right-4 z-20 p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <Edit3 className="size-4" />
                      </button>

                      <div className="p-6 relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                          <div className={cn("p-3 rounded-xl border", theme.bg, theme.border, theme.color)}>
                            <Icon className="size-6" />
                          </div>
                          {course.progress === 100 && (
                            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest bg-success/20 text-success rounded-full border border-success/30">
                              Concluído
                            </span>
                          )}
                          {course.progress > 0 && course.progress < 100 && (
                            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest bg-warning/20 text-warning-foreground rounded-full border border-warning/30">
                              Em Andamento
                            </span>
                          )}
                        </div>
                        
                        <h3 className="text-xl font-bold tracking-tight mb-2 group-hover:text-primary transition-colors pr-8">{course.title}</h3>
                        <p className="text-sm text-muted-foreground mb-6 flex-1 line-clamp-3">
                          {course.description}
                        </p>
                        
                        <div className="space-y-4 mt-auto">
                          <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground mb-4">
                            {course.duration && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="size-3.5" /> {course.duration}
                              </div>
                            )}
                            {course.modules > 0 && (
                              <div className="flex items-center gap-1.5">
                                <BookOpen className="size-3.5" /> {course.modules} Módulos
                              </div>
                            )}
                          </div>
                          
                          {course.progress > 0 && course.progress < 100 ? (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className={theme.color}>{course.progress}% Concluído</span>
                              </div>
                              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={cn("h-full rounded-full", theme.color.replace("text-", "bg-"))} 
                                  style={{ width: `${course.progress}%` }}
                                />
                              </div>
                            </div>
                          ) : course.progress === 100 ? (
                             <div className="h-1.5 w-full bg-success/20 rounded-full overflow-hidden">
                                <div className="h-full w-full bg-success rounded-full" />
                             </div>
                          ) : (
                            <div className="h-1.5 w-full bg-muted rounded-full" />
                          )}

                          <div className="flex gap-2">
                            <button className={cn(
                              "flex-1 mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all",
                              course.progress > 0 
                                ? "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20" 
                                : "bg-foreground text-background hover:bg-foreground/90 border border-transparent"
                            )}>
                              {course.progress > 0 ? (
                                <>Continuar Curso <ChevronRight className="size-4" /></>
                              ) : (
                                <>Começar Agora <PlayCircle className="size-4" /></>
                              )}
                            </button>
                            {course.drive_link && (
                              <a href={course.drive_link} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all bg-muted hover:bg-muted/80 text-foreground border border-border/50">
                                <ExternalLink className="size-4" /> Drive
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === "book" && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                {filteredBooks.length === 0 && (
                  <div className="col-span-full py-12 text-center text-muted-foreground italic border border-dashed border-border rounded-2xl">
                    Nenhum livro recomendado nesta categoria.
                  </div>
                )}
                {filteredBooks.map((book) => {
                  const theme = getCategoryTheme(book.category);
                  return (
                    <div key={book.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-primary/30 transition-all flex flex-col group relative">
                      <button onClick={() => handleEdit(book)} className="absolute top-4 right-4 z-20 p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <Edit3 className="size-4" />
                      </button>

                      <div className="flex items-center gap-4 mb-4 pr-8">
                        <div className={cn("p-3 rounded-xl border shrink-0", theme.bg, theme.border, theme.color)}>
                          <BookOpen className="size-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{book.title}</h3>
                          <p className="text-xs text-muted-foreground">{book.author}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground flex-1">
                        {book.description}
                      </p>
                      <div className="flex gap-2 mt-6">
                        <button className="flex-1 py-2 bg-muted hover:bg-muted/80 text-foreground text-sm font-semibold rounded-lg transition-colors border border-border/50">
                          Ver Resumo
                        </button>
                        {book.drive_link && (
                          <a href={book.drive_link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-sm font-semibold rounded-lg transition-colors border border-border/50">
                            <ExternalLink className="size-4" /> Drive
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === "topic" && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm animate-in fade-in">
                 <div className="p-4 bg-muted/20 border-b border-border flex items-center justify-between">
                    <h3 className="font-bold text-lg">Manuais a Estudar e Tópicos</h3>
                    <button onClick={() => { setViewMode("topic"); handleNew(); }} className="px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-md shadow-sm hover:bg-primary/90 transition-colors">
                      + Adicionar Manual / Tópico
                    </button>
                 </div>
                 <div className="divide-y divide-border">
                    {filteredTopics.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground italic">
                        Nenhum material cadastrado nesta categoria.
                      </div>
                    )}
                    {filteredTopics.map(topic => (
                      <div key={topic.id} className="group p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-muted/10 transition-colors relative">
                        <div className="flex items-start gap-4 pr-12">
                          <div className="mt-1 shrink-0">
                            {topic.status === "Concluído" ? (
                              <CheckCircle2 className="size-5 text-success" />
                            ) : topic.status === "Em Andamento" ? (
                              <AlertCircle className="size-5 text-warning" />
                            ) : (
                              <Circle className="size-5 text-muted-foreground/50" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-base flex items-center gap-2">
                              {topic.title}
                              {topic.drive_link && (
                                <a href={topic.drive_link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="Abrir no Google Drive">
                                  <ExternalLink className="size-3.5" />
                                </a>
                              )}
                            </h4>
                            {topic.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{topic.description}</p>
                            )}
                            <div className="flex items-center flex-wrap gap-2 mt-2">
                              {topic.priority === "Crítica" && (
                                <span className="text-[11px] font-bold uppercase tracking-widest text-danger bg-danger/10 px-2 py-0.5 rounded border border-danger/20">
                                  Prioridade Crítica
                                </span>
                              )}
                              {topic.priority === "Alta" && (
                                <span className="text-[11px] font-bold uppercase tracking-widest text-warning text-warning-foreground bg-warning/10 px-2 py-0.5 rounded border border-warning/20">
                                  Prioridade Alta
                                </span>
                              )}
                              {topic.priority === "Baixa" && (
                                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                                  Baixa
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(topic)} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                            <Edit3 className="size-4" />
                          </button>
                        </div>
                        
                        <div className="w-full md:w-auto mt-2 md:mt-0 flex gap-2">
                           {topic.drive_link && (
                             <a href={topic.drive_link} target="_blank" rel="noopener noreferrer" className="flex-1 md:flex-none flex justify-center items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-all">
                               <ExternalLink className="size-4" /> Drive
                             </a>
                           )}
                           <button onClick={() => handleEdit(topic)} className="flex-1 md:flex-none px-4 py-2 text-sm font-semibold bg-background border border-border rounded-lg hover:border-primary/50 hover:text-primary transition-all md:hidden">
                             Editar
                           </button>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}
          </>
        )}

      </main>

      <AcademyItemModal
        item={editingItem}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refetch}
        defaultType={viewMode}
      />
    </>
  );
}
