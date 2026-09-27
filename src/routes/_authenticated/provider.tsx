import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Car, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RoleGate, PageShell } from "@/components/RoleGate";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { haversineKm, rand, serviceLabel } from "@/lib/services";
import mechanic from "@/assets/mechanic.jpg";

export const Route = createFileRoute("/_authenticated/provider")({
  head: () => ({ meta: [{ title: "Provider dashboard — RoadRescue" }, { name: "description", content: "Manage incoming jobs." }] }),
  component: () => <RoleGate allow={["provider"]}><ProviderDash /></RoleGate>,
});

const NEXT: Record<string, { to: string; label: string }> = {
  matched: { to: "en_route", label: "Start driving (En route)" },
  en_route: { to: "arrived", label: "I've arrived" },
  arrived: { to: "completed", label: "Mark completed" },
};

function ProviderDash() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const p = me?.provider;
  const [declined, setDeclined] = useState<string[]>([]);

  const { data: reqs } = useQuery({
    queryKey: ["provider-requests", p?.id],
    enabled: p?.status === "approved",
    queryFn: async () => (await supabase.from("requests").select("*, vehicles(*)").in("status", ["pending", "matched", "en_route", "arrived", "completed"]).order("created_at", { ascending: false }).limit(100)).data ?? [],
  });

  useEffect(() => {
    if (p?.status !== "approved") return;
    const ch = supabase.channel("prov-reqs")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, (e) => {
        if (e.eventType === "INSERT") toast.info("New assistance request nearby");
        qc.invalidateQueries({ queryKey: ["provider-requests", p.id] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [p?.id, p?.status, qc]);

  const pos = p && (p.current_lat ?? p.base_lat) != null ? { lat: (p.current_lat ?? p.base_lat)!, lng: (p.current_lng ?? p.base_lng)! } : null;
  const incoming = useMemo(() => (reqs ?? [])
    .filter((r) => r.status === "pending" && !r.provider_id && p?.services.includes(r.service_type) && !declined.includes(r.id))
    .map((r) => ({ ...r, dist: pos ? haversineKm(pos, { lat: r.lat, lng: r.lng }) : null }))
    .sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0)), [reqs, p, declined, pos?.lat, pos?.lng]);
  const active = (reqs ?? []).filter((r) => r.provider_id === p?.id && ["matched", "en_route", "arrived"].includes(r.status));
  const done = (reqs ?? []).filter((r) => r.provider_id === p?.id && r.status === "completed");

  // live location while online
  const last = useRef(0);
  useEffect(() => {
    if (!p?.is_online || !navigator.geolocation) return;
    const w = navigator.geolocation.watchPosition(async (g) => {
      if (Date.now() - last.current < 10000) return;
      last.current = Date.now();
      await supabase.from("providers").update({ current_lat: g.coords.latitude, current_lng: g.coords.longitude }).eq("id", p.id);
    }, () => {}, { enableHighAccuracy: true });
    return () => navigator.geolocation.clearWatch(w);
  }, [p?.is_online, p?.id]);

  if (!p) return <PageShell title="Provider dashboard"><p>No provider profile found.</p></PageShell>;
  if (p.status !== "approved")
    return (
      <PageShell title="Provider dashboard">
        <div className="card-surface mx-auto max-w-lg overflow-hidden">
          <img src={mechanic} alt="" className="h-48 w-full object-cover" />
          <div className="p-6">
            <StatusBadge status={p.status} label={p.status === "pending" ? "Pending approval" : "Rejected"} />
            <h2 className="mt-3 text-xl font-bold">{p.status === "pending" ? "Your application is under review" : "Your application was not approved"}</h2>
            <p className="mt-1 text-muted-foreground">{p.status === "pending" ? "An administrator will review your details. You'll be able to receive jobs once approved." : "Please contact RoadRescue support for more information."}</p>
          </div>
        </div>
      </PageShell>
    );

  async function toggleOnline(v: boolean) {
    await supabase.from("providers").update({ is_online: v }).eq("id", p!.id);
    qc.invalidateQueries({ queryKey: ["me"] });
  }
  async function accept(id: string) {
    const { data, error } = await supabase.from("requests").update({ provider_id: p!.id, status: "matched" }).eq("id", id).eq("status", "pending").select("id");
    if (error || !data?.length) return toast.error("This request is no longer available");
    toast.success("Job accepted");
    qc.invalidateQueries({ queryKey: ["provider-requests", p!.id] });
  }
  async function advance(id: string, to: string) {
    const { error } = await supabase.from("requests").update({ status: to as "en_route" }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["provider-requests", p!.id] });
  }

  const earned = done.reduce((s, r) => s + Number(r.est_cost ?? 0), 0);

  return (
    <PageShell title={p.business_name} subtitle="Provider dashboard"
      action={<label className="card-surface flex items-center gap-3 px-4 py-2 text-sm font-bold"><Switch checked={p.is_online} onCheckedChange={toggleOnline} />{p.is_online ? "Online" : "Offline"}</label>}>
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[["Incoming", incoming.length], ["Active jobs", active.length], ["Earned", rand(earned)]].map(([k, v]) => (
          <div key={k} className="card-surface p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="text-2xl font-extrabold">{v}</p></div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-bold">Incoming requests</h2>
          {!p.is_online && <p className="text-sm text-muted-foreground">Go online to receive requests.</p>}
          {p.is_online && !incoming.length && <p className="text-sm text-muted-foreground">No requests right now. New ones appear automatically.</p>}
          <div className="space-y-3">
            {p.is_online && incoming.map((r) => (
              <div key={r.id} className="card-surface p-4">
                <div className="flex items-center justify-between"><p className="font-bold">{serviceLabel(r.service_type)}</p><p className="font-extrabold text-primary">{rand(r.est_cost)}</p></div>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Car className="h-4 w-4" />{r.vehicles ? `${r.vehicles.make_model} • ${r.vehicles.colour} • ${r.vehicles.category}` : "Vehicle"}</p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{r.dist != null ? `${r.dist.toFixed(1)} km away` : "Distance unknown"}</p>
                {r.instructions && <p className="mt-1 text-sm">“{r.instructions}”</p>}
                <div className="mt-3 flex gap-2">
                  <Button className="flex-1" onClick={() => accept(r.id)}>Accept</Button>
                  <Button variant="outline" className="flex-1" onClick={() => setDeclined([...declined, r.id])}>Decline</Button>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-bold">Active jobs</h2>
          {!active.length && <p className="text-sm text-muted-foreground">No active jobs.</p>}
          <div className="space-y-3">
            {active.map((r) => (
              <div key={r.id} className="card-surface p-4">
                <div className="flex items-center justify-between"><p className="font-bold">{serviceLabel(r.service_type)}</p><StatusBadge status={r.status} /></div>
                <p className="mt-1 text-sm text-muted-foreground">{r.vehicles?.make_model} • {r.vehicles?.registration}</p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" />{new Date(r.created_at).toLocaleTimeString("en-ZA")}</p>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" asChild><a href={`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`} target="_blank" rel="noreferrer">Navigate</a></Button>
                  <Button className="flex-1" onClick={() => advance(r.id, NEXT[r.status].to)}>{NEXT[r.status].label}</Button>
                </div>
              </div>
            ))}
          </div>
          {!!done.length && (
            <>
              <h2 className="mb-3 mt-6 text-lg font-bold">Completed</h2>
              <ul className="card-surface divide-y">
                {done.slice(0, 8).map((r) => (
                  <li key={r.id} className="flex justify-between p-3 text-sm"><span>{serviceLabel(r.service_type)} • {new Date(r.created_at).toLocaleDateString("en-ZA")}</span><span className="font-bold">{rand(r.est_cost)}</span></li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </PageShell>
  );
}
