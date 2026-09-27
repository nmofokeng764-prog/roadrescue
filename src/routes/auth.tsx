import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useMe, homeFor } from "@/lib/auth";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: "register" } => (s["mode"] === "register" ? { mode: "register" } : {}),
  head: () => ({
    meta: [
      { title: "Sign in — RoadRescue" },
      { name: "description", content: "Sign in or create your RoadRescue customer account." },
      { property: "og:title", content: "Sign in — RoadRescue" },
      { property: "og:description", content: "Sign in or create your RoadRescue account." },
    ],
  }),
  component: AuthPage,
});

const regSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const [register, setRegister] = useState(mode === "register");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const { session } = useAuth();
  const { data: me } = useMe();
  const navigate = useNavigate();

  useEffect(() => setRegister(mode === "register"), [mode]);
  useEffect(() => {
    if (session && me) navigate({ to: homeFor(me.role), replace: true });
  }, [session, me, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (register) {
        const p = regSchema.safeParse(form);
        if (!p.success) return toast.error(p.error.issues[0].message);
        const { data, error } = await supabase.auth.signUp({
          email: p.data.email,
          password: p.data.password,
          options: { emailRedirectTo: window.location.origin + "/auth", data: { full_name: p.data.full_name, account_type: "customer" } },
        });
        if (error) return toast.error(error.message);
        if (!data.session) toast.success("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (error) return toast.error(error.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-[calc(100vh-4rem)] md:grid-cols-2">
      <div className="relative hidden md:block">
        <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="banner-overlay absolute inset-0" />
        <div className="absolute bottom-10 left-10 right-10 text-ink-foreground">
          <h2 className="text-4xl font-extrabold">Stranded? We're ready.</h2>
          <p className="mt-2 text-ink-foreground/80">One account for help on every road.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-10">
        <form onSubmit={submit} className="card-surface w-full max-w-md space-y-4 p-8">
          <div>
            <h1 className="text-2xl font-extrabold">{register ? "Create your account" : "Welcome back"}</h1>
            <p className="text-sm text-muted-foreground">{register ? "Register as a customer to request assistance." : "Sign in with your email and password."}</p>
          </div>
          {register && (
            <div className="space-y-2"><Label htmlFor="fn">Full name</Label>
              <Input id="fn" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          )}
          <div className="space-y-2"><Label htmlFor="em">Email</Label>
            <Input id="em" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div className="space-y-2"><Label htmlFor="pw">Password</Label>
            <Input id="pw" type="password" autoComplete={register ? "new-password" : "current-password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Please wait…" : register ? "Create account" : "Sign in"}</Button>
          <p className="text-center text-sm text-muted-foreground">
            {register ? "Already have an account?" : "New to RoadRescue?"}{" "}
            <button type="button" className="font-semibold text-primary" onClick={() => setRegister(!register)}>{register ? "Sign in" : "Register"}</button>
          </p>
          <p className="border-t pt-4 text-center text-sm">
            Run a roadside business? <Link to="/register-provider" className="font-semibold text-primary">Register as a Service Provider</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
