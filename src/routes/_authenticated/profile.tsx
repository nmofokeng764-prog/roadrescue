import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Car, LogOut, Star, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell } from "@/components/RoleGate";
import { StatusBadge } from "@/components/StatusBadge";
import { ProviderReviews } from "@/components/ProviderReviews";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { VEHICLE_CATEGORIES, serviceLabel } from "@/lib/services";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — RoadRescue" }, { name: "description", content: "Your RoadRescue account and vehicles." }] }),
  component: Profile,
});

const vSchema = z.object({
  make_model: z.string().trim().min(2, "Enter make and model").max(80),
  category: z.string().min(1, "Choose a category"),
  colour: z.string().trim().min(2, "Enter the colour").max(30),
  registration: z.string().trim().min(3, "Enter the registration").max(15),
});

function Profile() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const uid = me?.profile?.id;
  const [v, setV] = useState({ make_model: "", category: "", colour: "", registration: "" });
  const [adding, setAdding] = useState(false);

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles", uid],
    enabled: !!uid && me?.role === "customer",
    queryFn: async () => (await supabase.from("vehicles").select("*").eq("owner_id", uid!).order("is_primary", { ascending: false })).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["vehicles", uid] });

  async function addVehicle(e: React.FormEvent) {
    e.preventDefault();
    const p = vSchema.safeParse(v);
    if (!p.success) return toast.error(p.error.issues[0].message);
    const { error } = await supabase.from("vehicles").insert({ ...p.data, registration: p.data.registration.toUpperCase(), owner_id: uid!, is_primary: !vehicles?.length });
    if (error) return toast.error(error.message);
    setV({ make_model: "", category: "", colour: "", registration: "" });
    setAdding(false);
    refresh();
  }
  async function makePrimary(id: string) {
    await supabase.from("vehicles").update({ is_primary: false }).eq("owner_id", uid!);
    await supabase.from("vehicles").update({ is_primary: true }).eq("id", id);
    refresh();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) toast.error(error.message);
    refresh();
  }
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <PageShell title="Profile" action={<Button variant="outline" onClick={signOut}><LogOut /> Log out</Button>}>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <div className="card-surface h-fit p-6">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-2xl font-extrabold text-primary-foreground">
            {(me?.profile?.full_name || "?").charAt(0).toUpperCase()}
          </span>
          <p className="mt-4 text-xl font-bold">{me?.profile?.full_name || "—"}</p>
          <p className="text-muted-foreground">{me?.profile?.email}</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-accent-foreground">{me?.role}</p>
        </div>

        {me?.role === "customer" && (
          <div className="card-surface p-6">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">My vehicles</h2>
              <Button size="sm" onClick={() => setAdding(!adding)}><Plus /> Add vehicle</Button></div>
            {adding && (
              <form onSubmit={addVehicle} className="mb-5 grid gap-3 rounded-2xl bg-muted p-4 sm:grid-cols-2">
                <div className="space-y-1"><Label>Make & model</Label><Input value={v.make_model} onChange={(e) => setV({ ...v, make_model: e.target.value })} placeholder="Toyota Corolla" /></div>
                <div className="space-y-1"><Label>Category</Label>
                  <Select value={v.category} onValueChange={(c) => setV({ ...v, category: c })}>
                    <SelectTrigger className="bg-card"><SelectValue placeholder="Choose" /></SelectTrigger>
                    <SelectContent>{VEHICLE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="space-y-1"><Label>Colour</Label><Input value={v.colour} onChange={(e) => setV({ ...v, colour: e.target.value })} /></div>
                <div className="space-y-1"><Label>Registration</Label><Input value={v.registration} onChange={(e) => setV({ ...v, registration: e.target.value })} placeholder="CAA 123-456" /></div>
                <Button type="submit" className="sm:col-span-2">Save vehicle</Button>
              </form>
            )}
            {!vehicles?.length && !adding && <p className="text-sm text-muted-foreground">No vehicles yet. Add one so you can request help faster.</p>}
            <ul className="space-y-2">
              {vehicles?.map((x) => (
                <li key={x.id} className="flex items-center gap-3 rounded-2xl border p-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted"><Car className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">{x.make_model} {x.is_primary && <span className="ml-1 text-xs font-bold text-primary">PRIMARY</span>}</p>
                    <p className="truncate text-xs text-muted-foreground">{x.category} • {x.colour} • {x.registration}</p></div>
                  {!x.is_primary && <Button size="icon" variant="ghost" aria-label="Make primary" onClick={() => makePrimary(x.id)}><Star /></Button>}
                  <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => remove(x.id)}><Trash2 /></Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {me?.role === "provider" && me.provider && (
          <div className="card-surface space-y-2 p-6 text-sm">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{me.provider.business_name}</h2><StatusBadge status={me.provider.status} label={me.provider.status} /></div>
            <p><span className="text-muted-foreground">Phone:</span> {me.provider.contact_phone}</p>
            <p><span className="text-muted-foreground">Service area:</span> {me.provider.service_area}</p>
            <p><span className="text-muted-foreground">Services:</span> {me.provider.services.map(serviceLabel).join(", ")}</p>
            <div className="pt-2"><ProviderReviews providerId={me.provider.id} title="Customer reviews" /></div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
