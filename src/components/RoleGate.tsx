import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { homeFor, useMe, type Role } from "@/lib/auth";

export function RoleGate({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { data, isLoading } = useMe();
  const navigate = useNavigate();
  const ok = data && allow.includes(data.role);
  useEffect(() => {
    if (data && !ok) navigate({ to: homeFor(data.role), replace: true });
  }, [data, ok, navigate]);
  if (isLoading || !ok)
    return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  return <>{children}</>;
}

export function PageShell({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </main>
  );
}
