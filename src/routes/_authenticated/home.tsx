import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Car, ChevronRight, TriangleAlert, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleGate, PageShell } from "@/components/RoleGate";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { rand, serviceLabel } from "@/lib/services";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — RoadRescue" }, { name: "description", content: "Your RoadRescue customer home." }] }),
  component: () => <RoleGate allow={["customer"]}><Home /></RoleGate>,
});

function Home() {
  const { data: me } = useMe();
  const uid = me?.profile?.id;
  const { data: vehicles } = useQuery({
    queryKey: ["vehicles", uid],
    queryFn: async () => (await supabase.from("vehicles").select("*").eq("owner_id", uid!).order("is_primary", { ascending: false })).data ?? [],
    enabled: !!uid,
  });
  const { data: recent } = useQuery({
    queryKey: ["requests", uid, "recent"],
    queryFn: async () => (await supabase.from("requests").select("*").eq("customer_id", uid!).order("created_at", { ascending: false }).limit(4)).data ?? [],
    enabled: !!uid,
  });
  const primary = vehicles?.[0];
  const first = me?.profile?.full_name?.split(" ")[0] || "there";

  return (
    <PageShell title={`Hi ${first} 👋`} subtitle="Need a hand on the road? We're one tap away.">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl">
            <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="hero-overlay absolute inset-0" />
            <div className="relative p-8 text-ink-foreground">
              <h2 className="text-3xl font-extrabold">Stranded? We're ready.</h2>
              <p className="mt-2 max-w-sm text-ink-foreground/80">Get a nearby provider with upfront cost and ETA.</p>
              <Button variant="hero" size="xl" className="mt-6" asChild>
                <Link to="/request"><TriangleAlert className="!size-5" /> Request assistance</Link>
              </Button>
            </div>
          </div>
          <div className="card-surface p-5">
            <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Primary vehicle</h3>
              <Link to="/profile" className="text-sm font-semibold text-primary">Manage</Link></div>
            {primary ? (
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted"><Car className="h-6 w-6" /></span>
                <div className="min-w-0"><p className="truncate font-bold">{primary.make_model}</p>
                  <p className="truncate text-sm text-muted-foreground">{primary.colour} • {primary.registration} • {primary.category}</p></div>
              </div>
            ) : (
              <Button variant="outline" asChild><Link to="/profile"><Plus /> Add your first vehicle</Link></Button>
            )}
          </div>
        </div>
        <div className="card-surface p-5">
          <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Recent requests</h3>
            <Link to="/history" className="text-sm font-semibold text-primary">View all</Link></div>
          {!recent?.length && <p className="text-sm text-muted-foreground">No requests yet.</p>}
          <ul className="divide-y">
            {recent?.map((r) => (
              <li key={r.id}>
                <Link to="/requests/$id" params={{ id: r.id }} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">{serviceLabel(r.service_type)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-ZA")} • {rand(r.est_cost)}</p></div>
                  <StatusBadge status={r.status} />
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
