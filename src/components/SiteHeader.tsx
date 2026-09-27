import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, ShieldAlert, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useMe } from "@/lib/auth";
import { EmergencyCall } from "@/components/EmergencyCall";

type NavItem = { to: string; label: string };

export function SiteHeader() {
  const { session } = useAuth();
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  let items: NavItem[] = [
    { to: "/", label: "Home" },
    { to: "/register-provider", label: "Become a provider" },
  ];
  if (session && me) {
    if (me.role === "customer")
      items = [
        { to: "/home", label: "Home" },
        { to: "/request", label: "Request" },
        { to: "/history", label: "History" },
        { to: "/profile", label: "Profile" },
      ];
    else if (me.role === "provider")
      items = [
        { to: "/provider", label: "Dashboard" },
        { to: "/profile", label: "Profile" },
      ];
    else
      items = [
        { to: "/admin", label: "Admin" },
        { to: "/profile", label: "Profile" },
      ];
  }

  async function signOut() {
    setOpen(false);
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const linkCls = "rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground";
  const activeCls = "rounded-full px-4 py-2 text-sm font-semibold bg-accent text-accent-foreground";

  return (
    <header className="sticky top-0 z-50 border-b bg-card/90 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 md:flex md:justify-between">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <span className="truncate text-lg font-extrabold tracking-tight">RoadRescue</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {items.map((i) => (
            <Link key={i.to} to={i.to} className={linkCls} activeProps={{ className: activeCls }} activeOptions={{ exact: true }}>
              {i.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <EmergencyCall />
          {session ? (
            <Button variant="outline" onClick={signOut}><LogOut /> Log out</Button>
          ) : (
            <>
              <Button variant="ghost" asChild><Link to="/auth">Sign in</Link></Button>
              <Button asChild><Link to="/auth" search={{ mode: "register" }}>Register</Link></Button>
            </>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu"><Menu className="!size-6" /></Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader><SheetTitle>RoadRescue</SheetTitle></SheetHeader>
            <nav className="mt-4 flex flex-col gap-1 px-4">
              {items.map((i) => (
                <Link key={i.to} to={i.to} onClick={() => setOpen(false)} className={linkCls} activeProps={{ className: activeCls }} activeOptions={{ exact: true }}>
                  {i.label}
                </Link>
              ))}
              <div className="mt-4 border-t pt-4">
                <EmergencyCall className="mb-2 w-full" onNavigate={() => setOpen(false)} />
                {session ? (
                  <Button variant="outline" className="w-full" onClick={signOut}><LogOut /> Log out</Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" asChild><Link to="/auth" onClick={() => setOpen(false)}>Sign in</Link></Button>
                    <Button asChild><Link to="/auth" search={{ mode: "register" }} onClick={() => setOpen(false)}>Register</Link></Button>
                  </div>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
