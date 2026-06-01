import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Building2, DollarSign, Target, Plus, ArrowLeft, Route as RouteIcon, 
  FileText, Scale, ChevronDown, ChevronUp, RefreshCw, Undo2, 
  TrendingUp, Truck, Info, Users, BarChart3, X, Coins
} from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { useState, useMemo } from "react";

interface Empresa {
  id: string;
  nome: string;
  meta: number;
  comissao: number;
  valorComissaoReal: number; // Novo campo calculado: Meta * (Comissão / 100)
  linhasExclusivas: string[];
  protocolo: string;
  politicaDevolucao: string;
  politicaTroca: string;
  ticketMedio: number;
  carrosPorDia: number;
  maisInformacoes: string;
}

export const Route = createFileRoute("/partners")({
  component: () => <GerenciamentoParceiros title="Empresas Parceiras" />,
});

export function GerenciamentoParceiros({ title }: { title: string }) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [empresaExpandida, setEmpresaExpandida] = useState<string | null>(null);

  // Estados do formulário
  const [nome, setNome] = useState("");
  const [meta, setMeta] = useState("");
  const [comissao, setComissao] = useState("");
  const [linhas, setLinhas] = useState("");
  const [protocolo, setProtocolo] = useState("");
  const [ticketMedio, setTicketMedio] = useState("");
  const [carrosPorDia, setCarrosPorDia] = useState("");
  const [politicaDevolucao, setPoliticaDevolucao] = useState("");
  const [politicaTroca, setPoliticaTroca] = useState("");
  const [maisInformacoes, setMaisInformacoes] = useState("");

  // Cálculo em tempo real do valor em dinheiro da comissão para o formulário
  const comissaoCalculadaFormulario = useMemo(() => {
    const m = Number(meta) || 0;
    const c = Number(comissao) || 0;
    return m * (c / 100);
  }, [meta, comissao]);

  // Cálculo dos KPIs dinâmicos da listagem
  const kpis = useMemo(() => {
    const total = empresas.length;
    const metaTotal = empresas.reduce((acc, emp) => acc + emp.meta, 0);
    // Soma do valor total em dinheiro que será recebido de comissão
    const comissaoTotalReal = empresas.reduce((acc, emp) => acc + emp.valorComissaoReal, 0);
    const totalCarros = empresas.reduce((acc, emp) => acc + emp.carrosPorDia, 0);

    return { total, metaTotal, comissaoTotalReal, totalCarros };
  }, [empresas]);

  const toggleExpandir = (id: string) => {
    setEmpresaExpandida(empresaExpandida === id ? null : id);
  };

  const handleCadastrar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !meta || !comissao) {
      alert("Por favor, preencha os campos obrigatórios (Nome, Meta e Comissão).");
      return;
    }

    const valorMeta = Number(meta);
    const porcentagemComissao = Number(comissao);

    const novaEmpresa: Empresa = {
      id: crypto.randomUUID(),
      nome,
      meta: valorMeta,
      comissao: porcentagemComissao,
      valorComissaoReal: valorMeta * (porcentagemComissao / 100), // Salva o valor calculado
      linhasExclusivas: linhas ? linhas.split(",").map(l => l.trim()).filter(Boolean) : [],
      protocolo,
      politicaDevolucao,
      politicaTroca,
      ticketMedio: ticketMedio ? Number(ticketMedio) : 0,
      carrosPorDia: carrosPorDia ? Number(carrosPorDia) : 0,
      maisInformacoes,
    };

    setEmpresas([...empresas, novaEmpresa]);
    setMostrarFormulario(false);

    // Limpar campos
    setNome(""); setMeta(""); setComissao(""); setLinhas(""); setProtocolo("");
    setTicketMedio(""); setCarrosPorDia(""); setPoliticaDevolucao(""); setPoliticaTroca(""); setMaisInformacoes("");
  };

  return (
    <>
      <TopBar title={title} subtitle="Métricas consolidadas, parametrização de metas e diretrizes de parceiros." />
      
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-in fade-in duration-300">
        
        {/* SEÇÃO DE KPIS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Total de Parceiros</span>
              <Users className="size-4 text-primary" />
            </div>
            <p className="text-2xl font-semibold tracking-tight">{kpis.total}</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Meta Consolidada</span>
              <Target className="size-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-semibold tracking-tight font-mono">
              {kpis.metaTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Comissão Total (R$)</span>
              <Coins className="size-4 text-blue-500" />
            </div>
            <p className="text-2xl font-semibold tracking-tight font-mono text-blue-600 dark:text-blue-400">
              {kpis.comissaoTotalReal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Frota Total Ativa</span>
              <Truck className="size-4 text-amber-500" />
            </div>
            <p className="text-2xl font-semibold tracking-tight">
              {kpis.totalCarros} <span className="text-xs font-normal text-muted-foreground">carros/dia</span>
            </p>
          </div>
        </div>

        {/* CABEÇALHO DA TABELA + BOTÃO DE CADASTRO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Portfólio de Empresas</h2>
            <p className="text-sm text-muted-foreground">Visualização de contratos, metas comerciais e regras operacionais.</p>
          </div>
          {!mostrarFormulario && (
            <button
              onClick={() => setMostrarFormulario(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-all shadow-sm"
            >
              <Plus className="size-4" /> Adicionar Empresa
            </button>
          )}
        </div>

        {/* FORMULÁRIO DE CADASTRO ELEGANTE (EXPANSÍVEL) */}
        {mostrarFormulario && (
          <section className="rounded-2xl border border-border bg-card p-6 shadow-md relative animate-in slide-in-from-top-4 duration-200">
            <button 
              type="button"
              onClick={() => setMostrarFormulario(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-5" />
            </button>

            <h3 className="text-lg font-semibold tracking-tight mb-6 flex items-center gap-2">
              <Building2 className="size-5 text-primary" /> Nova Parametrização de Empresa
            </h3>
            
            <form onSubmit={handleCadastrar} className="space-y-6">
              {/* Grid 1: Nome, Meta, Porcentagem e o campo de Cálculo Dinâmico */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-xs font-medium text-muted-foreground">Razão Social *</label>
                  <input
                    type="text" placeholder="Ex: Expresso Nordeste" value={nome} onChange={(e) => setNome(e.target.value)}
                    className="w-full rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Meta de Faturamento *</label>
                  <input
                    type="number" placeholder="R$ 50000" value={meta} onChange={(e) => setMeta(e.target.value)}
                    className="w-full rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Comissão (%) *</label>
                  <input
                    type="number" placeholder="10" value={comissao} onChange={(e) => setComissao(e.target.value)}
                    className="w-full rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>
                
                {/* DISPLAY DE VALOR DE COMISSÃO JÁ CALCULADO EM TEMPO REAL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Coins className="size-3" /> Comissão em Dinheiro (Retorno)
                  </label>
                  <div className="w-full rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2 text-sm font-semibold font-mono text-blue-700 dark:text-blue-400 h-[38px] flex items-center">
                    {comissaoCalculadaFormulario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
              </div>

              {/* Grid 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><TrendingUp className="size-3.5" /> Ticket Médio</label>
                  <input type="number" placeholder="R$" value={ticketMedio} onChange={(e) => setTicketMedio(e.target.value)} className="w-full rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Truck className="size-3.5" /> Carros por Dia</label>
                  <input type="number" placeholder="Qtd" value={carrosPorDia} onChange={(e) => setCarrosPorDia(e.target.value)} className="w-full rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><FileText className="size-3.5" /> Protocolo Identificador</label>
                  <input type="text" placeholder="Cód/Link" value={protocolo} onChange={(e) => setProtocolo(e.target.value)} className="w-full rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><RouteIcon className="size-3.5" /> Linhas Exclusivas</label>
                  <input type="text" placeholder="Separadas por vírgula" value={linhas} onChange={(e) => setLinhas(e.target.value)} className="w-full rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>

              {/* Grid 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Undo2 className="size-3.5" /> Política de Devolução</label>
                  <textarea placeholder="Regras de estorno e prazos..." value={politicaDevolucao} onChange={(e) => setPoliticaDevolucao(e.target.value)} rows={2} className="w-full rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><RefreshCw className="size-3.5" /> Política de Troca</label>
                  <textarea placeholder="Prazos para remarcação e custos..." value={politicaTroca} onChange={(e) => setPoliticaTroca(e.target.value)} rows={2} className="w-full rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Info className="size-3.5" /> Informações Complementares</label>
                <textarea placeholder="Observações operacionais importantes..." value={maisInformacoes} onChange={(e) => setMaisInformacoes(e.target.value)} rows={2} className="w-full rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setMostrarFormulario(false)} className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
                <button type="submit" className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-all shadow-sm">Salvar Registro</button>
              </div>
            </form>
          </section>
        )}

        {/* LISTAGEM DE EMPRESAS */}
        <section className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-sm">
          {empresas.length === 0 ? (
            <div className="p-16 text-center text-sm text-muted-foreground space-y-2">
              <Building2 className="size-8 text-muted-foreground/50 mx-auto stroke-[1.5]" />
              <p>Nenhuma empresa cadastrada no ecossistema.</p>
              <p className="text-xs opacity-70">Utilize o botão superior para realizar a parametrização inicial.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="p-4 w-10 text-center"></th>
                    <th className="p-4">Empresa</th>
                    <th className="p-4">Meta Comercial</th>
                    <th className="p-4">Comissão (%)</th>
                    <th className="p-4">Retorno Estimado (R$)</th>
                    <th className="p-4">Volume (Dia)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-sm">
                  {empresas.map((empresa) => {
                    const estaExpandido = empresaExpandida === empresa.id;
                    return (
                      <>
                        <tr 
                          key={empresa.id} 
                          onClick={() => toggleExpandir(empresa.id)}
                          className="hover:bg-muted/30 cursor-pointer transition-colors group"
                        >
                          <td className="p-4 text-center text-muted-foreground group-hover:text-foreground transition-colors">
                            {estaExpandido ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                          </td>
                          <td className="p-4 font-medium text-foreground">{empresa.nome}</td>
                          <td className="p-4 font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                            {empresa.meta.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                          </td>
                          <td className="p-4 font-mono text-muted-foreground group-hover:text-foreground transition-colors">{empresa.comissao}%</td>
                          
                          {/* Exibe o valor total da comissão já calculado na tabela */}
                          <td className="p-4 font-mono font-medium text-blue-600 dark:text-blue-400">
                            {empresa.valorComissaoReal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </td>
                          <td className="p-4">
                            <span className="text-xs bg-muted border border-border px-2 py-0.5 rounded-md font-medium">
                              {empresa.carrosPorDia || 0} carros
                            </span>
                          </td>
                        </tr>

                        {/* DETALHES INTERNOS EXPANDIDOS */}
                        {estaExpandido && (
                          <tr className="bg-muted/20 border-t border-b border-border/40">
                            <td colSpan={6} className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                                      <FileText className="size-3 text-primary" /> Protocolo de Identificação
                                    </h4>
                                    <p className="text-xs font-mono bg-background px-2.5 py-1.5 border border-border rounded-lg inline-block shadow-sm">
                                      {empresa.protocolo || "Não definido"}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                                      <TrendingUp className="size-3 text-primary" /> Ticket Médio Operacional
                                    </h4>
                                    <p className="text-xs font-mono bg-background px-2.5 py-1.5 border border-border rounded-lg inline-block shadow-sm">
                                      {empresa.ticketMedio ? empresa.ticketMedio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Não informado"}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                                      <RouteIcon className="size-3 text-primary" /> Rotas e Linhas Exclusivas
                                    </h4>
                                    {empresa.linhasExclusivas.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {empresa.linhasExclusivas.map((linha, idx) => (
                                          <span key={idx} className="text-[11px] bg-background border border-border px-2 py-0.5 rounded-md">
                                            {linha}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">Nenhuma rota restrita mapeada.</p>
                                    )}
                                  </div>
                                </div>

                                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                                      <Undo2 className="size-3" /> Termos de Devolução
                                    </h4>
                                    <div className="text-xs bg-background/60 border border-border/80 p-3 rounded-xl leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                      {empresa.politicaDevolucao || "Diretriz de devolução padrão aplicável."}
                                    </div>
                                  </div>

                                  <div className="space-y-1.5">
                                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                      <RefreshCw className="size-3" /> Termos de Trocas / Alterações
                                    </h4>
                                    <div className="text-xs bg-background/60 border border-border/80 p-3 rounded-xl leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                      {empresa.politicaTroca || "Diretriz de troca padrão aplicável."}
                                    </div>
                                  </div>
                                </div>

                                <div className="col-span-1 md:col-span-3 pt-2 border-t border-border/40">
                                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                                    <Scale className="size-3 text-muted-foreground" /> Informações Legais / Notas Gerais
                                  </h4>
                                  <div className="text-xs bg-background/40 border border-border p-3.5 rounded-xl text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                    {empresa.maisInformacoes || "Sem notas adicionais cadastradas."}
                                  </div>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* LINK DE RETORNO */}
        <div className="flex justify-start">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Retornar ao Voyage Dashboard
          </Link>
        </div>
      </main>
    </>
  );
}