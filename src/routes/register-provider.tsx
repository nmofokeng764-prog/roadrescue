import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { SERVICES, DEFAULT_CENTER } from "@/lib/services";
import { LazyMap } from "@/components/LazyMap";

export const Route = createFileRoute("/register-provider")({
  head: () => ({
    meta: [
      { title: "Become a provider — RoadRescue" },
      { name: "description", content: "Register your roadside assistance business with RoadRescue and receive nearby jobs." },
      { property: "og:title", content: "Become a provider — RoadRescue" },
      { property: "og:description", content: "Register your roadside business and receive nearby jobs." },
    ],
  }),
  component: ProviderRegister,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter the contact person's name").max(100),
  business_name: z.string().trim().min(2, "Enter your business name").max(120),
  phone: z.string().trim().min(8, "Enter a valid phone number").max(20),
  service_area: z.string().trim().min(2, "Enter your service area").max(200),
  description: z.string().trim().max(1000),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

function ProviderRegister() {
  const [f, setF] = useState({ full_name: "", business_name: "", phone: "", service_area: "", description: "", email: "", password: "" });
  const [services, setServices] = useState<string[]>([]);
  const [base, setBase] = useState(DEFAULT_CENTER);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  function locate() {
    navigator.geolocation?.getCurrentPosition(
      (p) => setBase({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => toast.error("Could not get your location"),
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = schema.safeParse(f);
    if (!p.success) return toast.error(p.error.issues[0].message);
    if (!services.length) return toast.error("Select at least one service");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: p.data.email,
      password: p.data.password,
      options: {
        emailRedirectTo: window.location.origin + "/auth",
        data: { ...p.data, password: undefined, account_type: "provider", services, base_lat: String(base.lat), base_lng: String(base.lng) },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setDone(true);
  }

  if (done)
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="card-surface p-8">
          <h1 className="text-2xl font-extrabold">Application received</h1>
          <p className="mt-2 text-muted-foreground">Confirm your email, then sign in. Your account stays pending until an administrator approves it.</p>
          <Button className="mt-6" asChild><Link to="/auth">Go to sign in</Link></Button>
        </div>
      </main>
    );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Register as a Service Provider</h1>
      <p className="mt-1 text-muted-foreground">Tell us about your business. An administrator reviews every application.</p>
      <form onSubmit={submit} className="card-surface mt-6 space-y-5 p-6 md:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Business name</Label><Input value={f.business_name} onChange={set("business_name")} /></div>
          <div className="space-y-2"><Label>Contact person</Label><Input value={f.full_name} onChange={set("full_name")} /></div>
          <div className="space-y-2"><Label>Phone</Label><Input value={f.phone} onChange={set("phone")} placeholder="082 123 4567" /></div>
          <div className="space-y-2"><Label>Service area</Label><Input value={f.service_area} onChange={set("service_area")} placeholder="Johannesburg North, Sandton" /></div>
        </div>
        <div className="space-y-2">
          <Label>Services offered</Label>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {SERVICES.map((s) => (
              <label key={s.id} className="flex items-center gap-2 rounded-xl border p-3 text-sm font-medium">
                <Checkbox checked={services.includes(s.id)} onCheckedChange={(c) => setServices(c ? [...services, s.id] : services.filter((x) => x !== s.id))} />
                {s.label}
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><Label>Base location</Label>
            <Button type="button" variant="outline" size="sm" onClick={locate}><Crosshair /> Use my location</Button></div>
          <LazyMap center={base} onChange={setBase} height={240} />
        </div>
        <div className="space-y-2"><Label>About your business (optional)</Label><Textarea value={f.description} onChange={set("description")} /></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={f.email} onChange={set("email")} /></div>
          <div className="space-y-2"><Label>Password</Label><Input type="password" value={f.password} onChange={set("password")} /></div>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Submitting…" : "Submit application"}</Button>
      </form>
    </main>
  );
}
