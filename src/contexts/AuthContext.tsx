import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { isSuperAdminEmail } from "@/lib/admin";

export type AuthProfile = Database["public"]["Tables"]["profiles"]["Row"];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  /**
   * Admin da PLATAFORMA (dono do app) — quem enxerga /admin e as configurações
   * globais. Fonte única de verdade: a função `is_admin()` do banco, que checa
   * `user_roles` e cai para `profiles.is_admin`. O e-mail super admin funciona
   * como chave reserva para nunca haver trava total de acesso.
   *
   * Não confundir com o assinante comum, que administra apenas o próprio tenant.
   */
  isPlatformAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isPlatformAdmin: false,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string, email?: string | null) => {
    const [{ data }, { data: adminFlag }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.rpc("is_admin", { _user_id: userId }),
    ]);
    setProfile(data);
    setIsPlatformAdmin(adminFlag === true || isSuperAdminEmail(email ?? data?.email));
  }, []);

  useEffect(() => {
    let mounted = true;

    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Use setTimeout to avoid Supabase auth deadlock
          setTimeout(() => {
            if (mounted) {
              fetchProfile(newSession.user.id, newSession.user.email).then(() => {
                if (mounted) setLoading(false);
              });
            }
          }, 0);
        } else {
          setProfile(null);
          setIsPlatformAdmin(false);
          setLoading(false);
        }
      }
    );

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!mounted) return;
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        fetchProfile(existingSession.user.id, existingSession.user.email).then(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsPlatformAdmin(false);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id, user.email);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isPlatformAdmin, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
