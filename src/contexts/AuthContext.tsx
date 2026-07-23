import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type Role = "admin" | "manager" | "operator" | null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: Role;
  sellerId: string | null;
  permissions: string[];
  onlineUsers: string[];
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  sellerId: null,
  permissions: [],
  onlineUsers: [],
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchRole(session.user.id);
      } else {
        setRole(null);
        setSellerId(null);
        setPermissions([]);
        setLoading(false);
      }
    }

    async function fetchRole(userId: string) {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role, seller_id, permissions")
          .eq("user_id", userId)
          .single();
          
        if (data && !error && mounted) {
          setRole(data.role as Role);
          setSellerId(data.seller_id);
          setPermissions((data.permissions as string[]) || []);
        }
      } catch (err) {
        console.error("Error fetching role:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setLoading(true);
          fetchRole(session.user.id);
        } else {
          setRole(null);
          setSellerId(null);
          setPermissions([]);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Presence Tracking
  useEffect(() => {
    if (loading || !user) {
      setOnlineUsers([]);
      return;
    }

    const channel = supabase.channel('online-users', {
      config: { presence: { key: user.id } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const activeIds: string[] = [];
      for (const id in state) {
        state[id].forEach((p: any) => {
          if (p.sellerId) activeIds.push(p.sellerId);
          else if (p.userId) activeIds.push(p.userId);
        });
      }
      setOnlineUsers(Array.from(new Set(activeIds)));
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ userId: user.id, sellerId: sellerId });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, sellerId, loading]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, sellerId, permissions, onlineUsers, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
