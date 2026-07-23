import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Users, UserPlus, Key, Loader2, Mail, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSellersRealtime } from "@/hooks/use-sellers-realtime";
import { PermissionsModal } from "@/components/PermissionsModal";

// Cliente Supabase secundário para criar usuário sem deslogar o Admin atual
const supabaseAdminClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export const Route = createFileRoute("/access")({
  component: AccessPage,
});

type UserRole = {
  id: string;
  user_id: string;
  email: string;
  role: string;
  seller_id?: string | null;
  permissions?: string[];
  created_at: string;
};

function AccessPage() {
  const { role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { sellers } = useSellersRealtime();
  
  // Novo Usuário State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("operator");
  const [newSellerId, setNewSellerId] = useState("");
  const [creating, setCreating] = useState(false);

  // Modal de Permissões
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<UserRole | null>(null);

  useEffect(() => {
    if (!authLoading && role !== "admin") {
      navigate({ to: "/", replace: true });
    }
  }, [role, authLoading, navigate]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "admin") {
      fetchUsers();
    }
  }, [role]);

  const handleRoleChange = async (userId: string, newRoleValue: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRoleValue })
        .eq("user_id", userId);
        
      if (error) throw error;
      
      toast.success("Nível de acesso atualizado!");
      setUsers(users.map(u => u.user_id === userId ? { ...u, role: newRoleValue } : u));
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar acesso.");
    }
  };

  const handleSellerChange = async (userId: string, newSellerIdValue: string) => {
    const sellerId = newSellerIdValue === "" ? null : newSellerIdValue;
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ seller_id: sellerId })
        .eq("user_id", userId);
        
      if (error) throw error;
      
      toast.success("Colaborador vinculado com sucesso!");
      setUsers(users.map(u => u.user_id === userId ? { ...u, seller_id: sellerId } : u));
    } catch (err) {
      console.error(err);
      toast.error("Erro ao vincular colaborador.");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    
    try {
      // 1. Criar o usuário no Auth (sem deslogar o Admin)
      const { data: authData, error: authError } = await supabaseAdminClient.auth.signUp({
        email: newEmail,
        password: newPassword,
      });

      if (authError) throw authError;
      
      const newUserId = authData.user?.id;
      if (!newUserId) throw new Error("ID de usuário não retornado");

      // O trigger do banco cria o registro na user_roles como 'operator'. 
      // 2. Se o Admin escolheu outro cargo ou vinculou um colaborador, precisamos atualizar.
      if (newRole !== "operator" || newSellerId !== "") {
        // Wait a brief moment for the trigger to insert the row
        await new Promise(r => setTimeout(r, 1000));
        
        await supabase
          .from("user_roles")
          .update({ 
            role: newRole,
            seller_id: newSellerId === "" ? null : newSellerId
          })
          .eq("user_id", newUserId);
      }

      toast.success("Usuário criado com sucesso!");
      setNewEmail("");
      setNewPassword("");
      setNewRole("operator");
      setNewSellerId("");
      setShowAddForm(false);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao criar usuário.");
    } finally {
      setCreating(false);
    }
  };

  if (authLoading || role !== "admin") return null;

  return (
    <>
      <TopBar 
        title="Gestão de Acessos" 
        subtitle="Controle de permissões, criação de usuários e níveis hierárquicos." 
      />

      <main className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Shield className="size-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Cargos e Permissões</h2>
              <p className="text-sm text-muted-foreground">Adicione membros da equipe e defina o que eles podem ver.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-all shadow-sm shadow-primary/20"
          >
            <UserPlus className="size-4" /> Novo Colaborador
          </button>
        </div>

        {showAddForm && (
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-md mb-6 animate-in fade-in zoom-in-95 duration-300">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Key className="size-5 text-primary" /> Criar Credenciais de Acesso
            </h3>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@empresa.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Senha Provisória</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 caracteres"
                    className="w-full pl-9 pr-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cargo</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary focus:outline-none"
                >
                  <option value="admin">Administrador (Total)</option>
                  <option value="manager">Gerente (Dashboards)</option>
                  <option value="operator">Operador (Monitor/Restrito)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vincular a Colaborador</label>
                <select
                  required
                  value={newSellerId}
                  onChange={(e) => setNewSellerId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary focus:outline-none text-muted-foreground"
                >
                  <option value="" disabled>Selecione um Colaborador...</option>
                  {sellers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="w-full py-2.5 bg-muted text-foreground rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-colors flex justify-center items-center gap-2"
                >
                  {creating ? <Loader2 className="size-4 animate-spin" /> : "Criar"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-card/40 border border-border/60 rounded-2xl overflow-hidden backdrop-blur-sm shadow-sm">
          {loading ? (
             <div className="flex justify-center p-12">
               <Loader2 className="size-8 animate-spin text-primary" />
             </div>
          ) : users.length === 0 ? (
             <div className="text-center p-12 text-muted-foreground">Nenhum usuário encontrado.</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">E-mail (Usuário)</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Colaborador Vinculado</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Data de Cadastro</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Acessos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-full", u.role === 'admin' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                          <Users className="size-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{u.email}</span>
                          {u.role === 'admin' && <span className="text-[10px] text-primary uppercase font-bold tracking-widest">Admin</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        required
                        value={u.seller_id || ""}
                        onChange={(e) => handleSellerChange(u.user_id, e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg text-xs border bg-background text-muted-foreground outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer"
                      >
                        <option value="" disabled>Pendente</option>
                        {sellers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground text-xs">
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {u.role === 'admin' ? (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20 cursor-not-allowed opacity-80" title="Admins têm acesso total por padrão">
                          Acesso Total
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedUserForPerms(u);
                            setPermModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-card border border-border text-foreground hover:bg-muted/80 hover:border-primary/50 transition-all shadow-sm"
                        >
                          Configurar Acessos
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </main>

      {/* Permissions Modal */}
      <PermissionsModal
        open={permModalOpen}
        onClose={() => setPermModalOpen(false)}
        userId={selectedUserForPerms?.user_id || null}
        userName={selectedUserForPerms?.email || ""}
        currentPermissions={selectedUserForPerms?.permissions || []}
        onSaved={fetchUsers}
      />
    </>
  );
}
