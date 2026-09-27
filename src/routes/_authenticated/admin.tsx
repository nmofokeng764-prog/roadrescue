import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleGate, PageShell } from "@/components/RoleGate";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { rand, serviceLabel } from "@/lib/services";
import { Phone, ShieldCheck, PhoneCall, CreditCard, ShieldAlert, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — RoadRescue" }, { name: "description", content: "RoadRescue platform administration." }] }),
  component: () => <RoleGate allow={["admin"]}><Admin /></RoleGate>,
});

function Admin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin"],
    queryFn: async () => {
      const [pr, rq, us, ro, py, sa] = await Promise.all([
        supabase.from("providers").select("*").order("created_at", { ascending: false }),
        supabase.from("requests").select("*, providers(business_name)").order("created_at", { ascending: false }).limit(200),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
        supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("safety_alerts").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
      return { providers: pr.data ?? [], requests: rq.data ?? [], users: us.data ?? [], roles: ro.data ?? [], payments: py.data ?? [], alerts: sa.data ?? [] };
    },
  });

  useEffect(() => {
    const ch = supabase.channel("admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => qc.invalidateQueries({ queryKey: ["admin"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "providers" }, () => qc.invalidateQueries({ queryKey: ["admin"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => qc.invalidateQueries({ queryKey: ["admin"] }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "safety_alerts" }, () => {
        toast.error("Safety alert raised — a customer does not feel safe");
        qc.invalidateQueries({ queryKey: ["admin"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  async function markPaymentPaid(id: string) {
    const { error } = await supabase.from("payments").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Payment marked as paid");
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  async function setStatus(id: string, status: "approved" | "rejected" | "pending") {
    const { error } = await supabase.from("providers").update({
      status,
      is_verified: status === "approved",
      verified_at: status === "approved" ? new Date().toISOString() : null,
      ...(status !== "approved" ? { is_online: false } : {}),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Service provider verified" : `Provider ${status}`);
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  async function setAlertStatus(id: string, status: "acknowledged" | "police_notified" | "resolved") {
    const { error } = await supabase.from("safety_alerts").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  const d = data ?? { providers: [], requests: [], users: [], roles: [], payments: [], alerts: [] };
  const pending = d.providers.filter((p) => p.status === "pending");
  const activeReq = d.requests.filter((r) => ["pending", "matched", "en_route", "arrived"].includes(r.status));
  const paid = d.payments.filter((p) => p.status === "paid");
  const openAlerts = d.alerts.filter((a) => a.status !== "resolved");
  const roleOf = (id: string) => d.roles.filter((r) => r.user_id === id).map((r) => r.role).join(", ");
  const profileOf = (id: string) => d.users.find((u) => u.id === id);

  return (
    <PageShell title="Admin dashboard" subtitle="Verify providers, monitor requests, payments and contact customers.">
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-6">
        {[["Users", d.users.length], ["Providers", d.providers.length], ["Pending verification", pending.length], ["Active requests", activeReq.length], ["Paid requests", paid.length], ["Safety alerts", openAlerts.length]].map(([k, v]) => (
          <div key={k} className="card-surface p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="text-2xl font-extrabold">{v}</p></div>
        ))}
      </div>

      <Tabs defaultValue="apps">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="apps">Verify providers ({pending.length})</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="requests">Customer calls</TabsTrigger>
          <TabsTrigger value="alerts">Safety alerts ({openAlerts.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="apps" className="mt-4 space-y-3">
          {!pending.length && <p className="text-muted-foreground">No provider applications waiting for verification.</p>}
          {pending.map((p) => (
            <div key={p.id} className="card-surface grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
              <div className="min-w-0 text-sm">
                <div className="flex items-center gap-2"><p className="text-lg font-bold">{p.business_name}</p><StatusBadge status={p.status} label="Pending verification" /></div>
                <p className="mt-1 text-muted-foreground">{p.contact_phone} • {p.service_area}</p>
                <p className="mt-1">Services: {p.services.map(serviceLabel).join(", ")}</p>
                {p.description && <p className="mt-1 text-muted-foreground">{p.description}</p>}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setStatus(p.id, "approved")}><ShieldCheck /> Verify & approve</Button>
                <Button variant="outline" onClick={() => setStatus(p.id, "rejected")}>Reject</Button>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="providers" className="mt-4">
          <div className="card-surface divide-y">
            {d.providers.map((p) => (
              <div key={p.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold">{p.business_name}</p>{p.is_verified && <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs font-bold"><ShieldCheck className="h-3 w-3" /> Verified</span>}</div>
                  <p className="truncate text-xs text-muted-foreground">{p.service_area} • {p.is_online ? "Online" : "Offline"} • {p.contact_phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.status} label={p.status} />
                  {p.status === "approved"
                    ? <Button size="sm" variant="outline" onClick={() => setStatus(p.id, "rejected")}>Suspend</Button>
                    : <Button size="sm" onClick={() => setStatus(p.id, "approved")}><ShieldCheck /> Verify</Button>}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <div className="card-surface divide-y">
            {d.requests.map((r) => {
              const customer = profileOf(r.customer_id);
              return (
                <div key={r.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{serviceLabel(r.service_type)} • {rand(r.est_cost)}</p>
                    <p className="truncate text-xs text-muted-foreground">{customer?.full_name || "Customer"} • {customer?.phone || "No phone number"} • {new Date(r.created_at).toLocaleString("en-ZA")}</p>
                    <p className="truncate text-xs text-muted-foreground">Provider: {r.providers?.business_name ?? "Unassigned"} • Status: {r.status.replace("_", " ")}</p>
                  </div>
                  <div className="flex gap-2">
                    {customer?.phone ? <Button asChild><a href={`tel:${customer.phone}`}><PhoneCall /> Call customer</a></Button> : <Button disabled><Phone /> No number</Button>}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4 space-y-3">
          {!d.alerts.length && <p className="text-muted-foreground">No safety alerts.</p>}
          {d.alerts.map((a) => (
            <div key={a.id} className="card-surface border-destructive/40 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-lg font-bold text-destructive"><ShieldAlert className="h-5 w-5" /> {a.full_name}</p>
                <StatusBadge status={a.status} label={a.status.replace("_", " ")} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{a.phone || "No phone number"} • {new Date(a.created_at).toLocaleString("en-ZA")}</p>
              {a.note && <p className="mt-2 text-sm">“{a.note}”</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {a.phone && <Button size="sm" asChild><a href={`tel:${a.phone}`}><PhoneCall /> Call customer</a></Button>}
                <Button size="sm" variant="outline" asChild>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`} target="_blank" rel="noreferrer"><MapPin /> Location</a>
                </Button>
                <Button size="sm" variant="destructive" asChild><a href="tel:10111"><PhoneCall /> Police 10111</a></Button>
                {a.status === "open" && <Button size="sm" variant="outline" onClick={() => setAlertStatus(a.id, "acknowledged")}>Acknowledge</Button>}
                {a.status !== "police_notified" && a.status !== "resolved" && <Button size="sm" variant="outline" onClick={() => setAlertStatus(a.id, "police_notified")}>Police notified</Button>}
                {a.status !== "resolved" && <Button size="sm" variant="outline" onClick={() => setAlertStatus(a.id, "resolved")}>Resolve</Button>}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <div className="card-surface divide-y">
            {d.payments.map((p) => (
              <div key={p.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0"><p className="font-semibold">{rand(p.amount)} • {p.method === "instant_eft" ? "Instant EFT" : "Cash"}</p><p className="text-xs text-muted-foreground">{p.transaction_ref || "No transaction reference"} • {new Date(p.created_at).toLocaleString("en-ZA")}</p></div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.status} label={p.status} />
                  {p.status === "pending" && <Button size="sm" onClick={() => markPaymentPaid(p.id)}>Mark paid</Button>}
                </div>
              </div>
            ))}
            {!d.payments.length && <p className="p-4 text-muted-foreground">No payments yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <div className="card-surface divide-y">
            {d.users.map((u) => (
              <div key={u.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
                <div className="min-w-0"><p className="truncate font-semibold">{u.full_name || "—"}</p><p className="truncate text-xs text-muted-foreground">{u.email}</p></div>
                <span className="text-xs font-bold uppercase text-accent-foreground">{roleOf(u.id)}</span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
