import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { 
  MessageCircle, 
  Instagram, 
  Mail, 
  Phone, 
  HelpCircle, 
  ShieldAlert, 
  BookOpen,
  ChevronDown,
  Building,
  CheckCircle2,
  Users,
  Plus,
  Briefcase,
  Tag,
  Search
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useContactsRealtime, type CompanyContact } from "@/hooks/use-contacts";
import { ContactFormModal } from "@/components/ContactFormModal";

export const Route = createFileRoute("/info")({
  component: InfoPage,
});

function InfoPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { contacts, loading: contactsLoading } = useContactsRealtime();
  const [searchQuery, setSearchQuery] = useState("");
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<CompanyContact | null>(null);

  const handleEdit = (contact: CompanyContact) => {
    setEditingContact(contact);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingContact(null);
    setModalOpen(true);
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const filteredContacts = contacts.filter((contact) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      contact.name.toLowerCase().includes(lowerQuery) ||
      contact.role.toLowerCase().includes(lowerQuery) ||
      (contact.agency_company && contact.agency_company.toLowerCase().includes(lowerQuery)) ||
      (contact.tags && contact.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)))
    );
  });

  const faqs = [
    {
      question: "Como realizar o check-in de um veículo?",
      answer: "Acesse a aba 'Monitor de Frotas', clique no botão 'Fazer Check-in' e preencha a placa do veículo, empresa e o horário de chegada. Se o veículo não estiver cadastrado, basta digitar o número que o sistema registrará automaticamente."
    },
    {
      question: "Qual o procedimento para reembolsos?",
      answer: "Todos os reembolsos devem ser solicitados via sistema na aba Financeiro, anexando o comprovante da despesa. O prazo de aprovação é de até 48 horas úteis."
    },
    {
      question: "Como transferir um lead de Frio para Venda?",
      answer: "No CRM, arraste o card do cliente para a coluna 'Venda' ou clique nos três pontinhos do card e selecione 'Mover para Venda'. Lembre-se de preencher o valor correto da venda."
    },
    {
      question: "O que fazer em caso de atraso na frota?",
      answer: "Notifique imediatamente a base operacional via grupo de WhatsApp e atualize o status da viagem no Monitor de Frotas para 'Atrasado', inserindo o motivo nas observações."
    }
  ];

  const rules = [
    {
      title: "Atendimento ao Cliente",
      description: "Sempre utilizar linguagem formal, respeitosa e ágil. Tempo de resposta ideal no WhatsApp é de menos de 5 minutos.",
      icon: MessageCircle,
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      title: "Organização do CRM",
      description: "Não deixe leads acumularem na coluna 'Não Atendido'. Todos os dias ao finalizar o turno, sua caixa de entrada deve estar limpa.",
      icon: BookOpen,
      color: "text-purple-500",
      bg: "bg-purple-500/10"
    },
    {
      title: "Padrão de Vestimenta",
      description: "Obrigatório o uso de uniforme completo durante todo o expediente na agência, incluindo crachá de identificação.",
      icon: ShieldAlert,
      color: "text-orange-500",
      bg: "bg-orange-500/10"
    },
    {
      title: "Conferência de Caixa",
      description: "O fechamento de caixa deve ser realizado com tolerância máxima de 15 minutos após o fim do turno. Diferenças acima de R$ 5 devem ser justificadas.",
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10"
    }
  ];

  return (
    <>
      <TopBar 
        title="Informações & Contatos" 
        subtitle="Diretrizes, regras, protocolos operacionais e canais de comunicação da empresa." 
      />

      <main className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Contatos Hero Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-gradient-to-br from-primary/20 via-primary/5 to-card rounded-3xl p-8 border border-primary/20 relative overflow-hidden group hover:border-primary/40 transition-all duration-300">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Building className="size-24" />
            </div>
            <div className="relative z-10">
              <h2 className="text-2xl font-bold tracking-tight mb-2">Nossa Empresa</h2>
              <p className="text-sm text-muted-foreground mb-8">
                Canais oficiais para comunicação interna, suporte e redes sociais.
              </p>

              <div className="space-y-4">
                <a href="#" className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group/link border border-transparent hover:border-white/10">
                  <div className="p-2.5 rounded-lg bg-green-500/20 text-green-500 group-hover/link:bg-green-500 group-hover/link:text-white transition-colors">
                    <MessageCircle className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Suporte WhatsApp</p>
                    <p className="text-sm font-medium text-foreground">(11) 99999-9999</p>
                  </div>
                </a>

                <a href="#" className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group/link border border-transparent hover:border-white/10">
                  <div className="p-2.5 rounded-lg bg-pink-500/20 text-pink-500 group-hover/link:bg-pink-500 group-hover/link:text-white transition-colors">
                    <Instagram className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Instagram Oficial</p>
                    <p className="text-sm font-medium text-foreground">@voyageflow.app</p>
                  </div>
                </a>

                <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
                  <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-500">
                    <Mail className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-mail Corporativo</p>
                    <p className="text-sm font-medium text-foreground">contato@voyageflow.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <ShieldAlert className="size-5 text-primary" />
              Regras e Protocolos
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rules.map((rule, idx) => {
                const Icon = rule.icon;
                return (
                  <div key={idx} className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", rule.bg, rule.color)}>
                      <Icon className="size-5" />
                    </div>
                    <h4 className="font-bold text-base mb-2">{rule.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {rule.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mt-12 bg-card/40 border border-border rounded-3xl p-8 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <HelpCircle className="size-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight">Guias e Dúvidas Frequentes</h3>
              <p className="text-sm text-muted-foreground">Consulte rapidamente os procedimentos do sistema.</p>
            </div>
          </div>

          <div className="space-y-3 max-w-4xl">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div 
                  key={index}
                  className={cn(
                    "border rounded-2xl overflow-hidden transition-colors duration-200",
                    isOpen ? "bg-muted/30 border-primary/30" : "bg-card border-border hover:border-primary/20"
                  )}
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 focus:outline-none"
                  >
                    <span className="font-semibold text-foreground text-base">{faq.question}</span>
                    <ChevronDown className={cn("size-5 text-muted-foreground transition-transform duration-300", isOpen && "rotate-180")} />
                  </button>
                  
                  <div 
                    className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out",
                      isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <p className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Dynamic Contacts Directory */}
        <section className="mt-12 bg-card/40 border border-border rounded-3xl p-8 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <Users className="size-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight">Diretório de Contatos</h3>
                <p className="text-sm text-muted-foreground">Agentes, gerentes e parceiros operacionais.</p>
              </div>
            </div>
            <button 
              onClick={handleNew}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-all shadow-sm shadow-primary/20"
            >
              <Plus className="size-4" /> Adicionar Contato
            </button>
          </div>

          <div className="mb-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="size-4 text-muted-foreground" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar contatos por nome, empresa, função ou etiqueta..."
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {contactsLoading ? (
            <div className="flex justify-center p-8">
              <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center p-12 border-2 border-dashed border-border/50 rounded-2xl text-muted-foreground">
              Nenhum contato cadastrado ainda.
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center p-12 border-2 border-dashed border-border/50 rounded-2xl text-muted-foreground">
              Nenhum contato encontrado para a sua busca.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContacts.map((contact) => (
                <div 
                  key={contact.id} 
                  onClick={() => handleEdit(contact)}
                  className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-foreground text-lg leading-tight">{contact.name}</h4>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mt-1">
                        <Briefcase className="size-3.5 text-primary/70" />
                        {contact.role}
                      </p>
                    </div>
                    {contact.agency_company && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground px-2 py-1 rounded-md">
                        {contact.agency_company}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1.5 mb-4">
                    {contact.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Phone className="size-3.5" /> {contact.phone}
                      </p>
                    )}
                    {contact.email && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Mail className="size-3.5" /> {contact.email}
                      </p>
                    )}
                  </div>

                  {contact.tags && contact.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border/50">
                      {contact.tags.map((tag, idx) => (
                        <span key={idx} className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                          <Tag className="size-3" /> {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      <ContactFormModal 
        contact={editingContact} 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
      />
    </>
  );
}
