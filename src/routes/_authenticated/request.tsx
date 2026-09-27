import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Car, Crosshair, Info, TriangleAlert, Battery, Fuel, Truck, Wrench, CircleDot, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RoleGate, PageShell } from "@/components/RoleGate";
import { LazyMap } from "@/components/LazyMap";
import { SafetyAlertButton } from "@/components/SafetyAlertButton";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { SERVICES, DEFAULT_CENTER, estimate, rand } from "@/lib/services";
import { cn } from "@/lib/utils";
import banner from "@/assets/driver.jpg";

export const Route = createFileRoute("/_authenticated/request")({
  head: () => ({ meta: [{ title: "Request assistance — RoadRescue" }, { name: "description", content: "Report a breakdown and get help." }] }),
  component: () => <RoleGate allow={["customer"]}><RequestPage /></RoleGate>,
});

const icons: Record<string, typeof Battery> = { battery: Battery, flat_tyre: CircleDot, fuel: Fuel, mechanical: Wrench, towing: Truck, lockout: KeyRound };

function RequestPage() {
  const { data: me } = useMe();
  const uid = me?.profile?.id;
  const navigate = useNavigate();
  const [loc, setLoc] = useState(DEFAULT_CENTER);
  const [locating, setLocating] = useState(false);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [service, setService] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles", uid],
    queryFn: async () => (await supabase.from("vehicles").select("*").eq("owner_id", uid!).order("is_primary", { ascending: false })).data ?? [],
    enabled: !!uid,
  });
  useEffect(() => { if (!vehicleId && vehicles?.length) setVehicleId(vehicles[0].id); }, [vehicles, vehicleId]);

  function locate() {
    if (!navigator.geolocation) return toast.error("Location is not available on this device");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); },
      () => { setLocating(false); toast.error("Allow location access, or drag the pin to your position"); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }
  useEffect(() => { locate(); }, []);

  const { data: nearest, isFetching } = useQuery({
    queryKey: ["nearest", service, loc.lat.toFixed(4), loc.lng.toFixed(4)],
    enabled: !!service,
    queryFn: async () => {
      const { data } = await supabase.rpc("nearest_provider", { _lat: loc.lat, _lng: loc.lng, _service: service! });
      return data?.[0] ?? null;
    },
  });
  const dist = nearest ? Number(nearest.distance_km) : null;
  const est = service ? estimate(service, dist ?? 10) : null;

  async function submit() {
    if (!vehicleId) return toast.error("Add or select a vehicle first");
    if (!service) return toast.error("Choose the problem");
    setBusy(true);
    const { data, error } = await supabase.from("requests").insert({
      customer_id: uid!, vehicle_id: vehicleId, service_type: service, instructions: instructions.trim().slice(0, 500) || null,
      lat: loc.lat, lng: loc.lng, distance_km: dist ? Math.round(dist * 10) / 10 : null, eta_min: est?.eta, est_cost: est?.cost,
    }).select("id").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Request sent — finding a provider");
    navigate({ to: "/requests/$id", params: { id: data.id } });
  }

  return (
    <PageShell title="Report breakdown">
      <div className="relative mb-6 h-28 overflow-hidden rounded-3xl">
        <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="banner-overlay absolute inset-0" />
        <p className="absolute bottom-4 left-6 text-2xl font-extrabold text-ink-foreground">Stranded? We're ready.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">1. Confirm your location</h2>
            <Button variant="outline" size="sm" onClick={locate} disabled={locating}>{locating ? <Loader2 className="animate-spin" /> : <Crosshair />} Use GPS</Button>
          </div>
          <LazyMap center={loc} onChange={setLoc} height={380} />
          <p className="text-xs text-muted-foreground">Drag the pin or tap the map to set a safer meeting point. {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</p>
        </section>

        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-bold">2. Describe the issue</h2>
            <p className="text-sm text-muted-foreground">Select your breakdown type so we can dispatch the right equipment.</p>
          </div>
          <div className="space-y-2">
            {!vehicles?.length && (
              <Link to="/profile" className="card-surface flex items-center gap-4 p-4"><Car className="h-5 w-5" /> <span className="font-semibold">Add a vehicle in your profile first</span></Link>
            )}
            {vehicles?.map((v) => (
              <button key={v.id} onClick={() => setVehicleId(v.id)}
                className={cn("card-surface flex w-full items-center gap-4 p-4 text-left", vehicleId === v.id && "border-primary ring-1 ring-primary")}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted"><Car className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-bold"><span className="truncate">{v.make_model}</span>
                    {vehicleId === v.id && <span className="rounded-full bg-info px-2 py-0.5 text-[10px] font-bold uppercase text-info-foreground">Selected</span>}</p>
                  <p className="truncate text-sm text-muted-foreground">{v.colour} • {v.registration}{v.is_primary ? " • Primary vehicle" : ""}</p>
                </div>
              </button>
            ))}
          </div>

          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-bold"><TriangleAlert className="h-4 w-4" /> Identify problem</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SERVICES.map((s) => {
                const I = icons[s.id];
                return (
                  <button key={s.id} onClick={() => setService(s.id)}
                    className={cn("card-surface flex flex-col items-center gap-2 p-4 text-sm font-semibold", service === s.id && "border-primary bg-accent text-accent-foreground")}>
                    <I className="h-5 w-5" />{s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-bold"><Info className="h-4 w-4" /> Special instructions</p>
            <Textarea maxLength={500} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Add gate codes or specific landmarks" />
          </div>

          {service && (
            <div className="card-surface grid grid-cols-3 gap-2 p-4 text-center">
              {isFetching ? <p className="col-span-3 text-sm text-muted-foreground">Checking nearby providers…</p> : (
                <>
                  <div><p className="text-xs text-muted-foreground">Distance</p><p className="text-lg font-extrabold">{dist != null ? `${dist.toFixed(1)} km` : "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">ETA</p><p className="text-lg font-extrabold">{est?.eta} min</p></div>
                  <div><p className="text-xs text-muted-foreground">Est. cost</p><p className="text-lg font-extrabold text-primary">{rand(est?.cost)}</p></div>
                  <p className="col-span-3 text-xs text-muted-foreground">{nearest ? `Nearest available: ${nearest.business_name}` : "No provider online right now — estimate based on 10 km. We'll keep searching."}</p>
                </>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
            <p className="font-bold text-destructive">Feeling unsafe where you are?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Send your name and exact location straight to our agents, who alert the police immediately.
            </p>
            <SafetyAlertButton location={loc} className="mt-3 w-full" />
          </div>
          <p className="text-sm font-medium text-primary"><strong>Stay safe:</strong> If you are on a busy highway, exit the vehicle and wait in a safe area away from traffic.</p>
          <Button variant="hero" size="xl" className="w-full" onClick={submit} disabled={busy}>
            <TriangleAlert className="!size-5" /> {busy ? "Sending…" : "Report breakdown"}
          </Button>
        </section>
      </div>
    </PageShell>
  );
}
