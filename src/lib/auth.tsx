import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "provider" | "customer";

type AuthCtx = { session: Session | null; ready: boolean };
const Ctx = createContext<AuthCtx>({ session: null, ready: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthCtx>({ session: null, ready: false });
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setState({ session, ready: true }));
    supabase.auth.getSession().then(({ data }) => setState({ session: data.session, ready: true }));
    return () => data.subscription.unsubscribe();
  }, []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

export function useMe() {
  const { session } = useAuth();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ["me", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [p, r, pr] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid!).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid!),
        supabase.from("providers").select("*").eq("user_id", uid!).maybeSingle(),
      ]);
      const roles = (r.data ?? []).map((x) => x.role as Role);
      const role: Role = roles.includes("admin") ? "admin" : roles.includes("provider") ? "provider" : "customer";
      return { profile: p.data, role, provider: pr.data };
    },
  });
}

export const homeFor = (role: Role) =>
  role === "admin" ? "/admin" : role === "provider" ? "/provider" : "/home";
