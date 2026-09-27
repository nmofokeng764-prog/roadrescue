import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Phone, Check, Banknote, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/RoleGate";
import { StatusBadge } from "@/components/StatusBadge";
import { LazyMap } from "@/components/LazyMap";
import { SafetyAlertButton } from "@/components/SafetyAlertButton";
import { ProviderReviews, ReviewForm, Stars, useProviderReviews } from "@/components/ProviderReviews";
import { supabase } from "@/integrations/supabase/client";
import { rand, serviceLabel, haversineKm, estimate } from "@/lib/services";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/requests/$id")({
  head: () => ({ meta: [{ title: "Track request — RoadRescue" }, { name: "description", content: "Track your roadside assistance and pay online." }] }),
  component: Tracking,
});

const STEPS = ["pending", "matched", "en_route", "arrived", "completed"];

function Tracking() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState<"cash" | "instant_eft">("cash");

  const { data: r, isLoading } = useQuery({
    queryKey: ["request", id],
    queryFn: async () => (await supabase.from("requests").select("*, vehicles(*), providers(*)").eq("id", id).maybeSingle()).data,
  });

  const providerId = r?.provider_id ?? null;

  const { data: payment } = useQuery({
    queryKey: ["payment", id],
    queryFn: async () => (await supabase.from("payments").select("*").eq("request_id", id).maybeSingle()).data,
  });

  const { data: reviews } = useProviderReviews(providerId);

  useEffect(() => {
    const ch = supabase.channel(`req-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "requests", filter: `id=eq.${id}` }, (p) => {
        const s = (p.new as { status?: string }).status;
        if (s) toast.info(`Status: ${s?.replace("_", " ")}`);
        qc.invalidateQueries({ queryKey: ["request", id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: `request_id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["payment", id] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "providers" }, () => qc.invalidateQueries({ queryKey: ["request", id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  if (isLoading) return <PageShell title="Loading…"><div /></PageShell>;
  if (!r) return <PageShell title="Request not found"><Link to="/history" className="text-primary">Back to history</Link></PageShell>;

  const pv = r.providers;
  const ppos = pv && (pv.current_lat ?? pv.base_lat) != null ? { lat: (pv.current_lat ?? pv.base_lat)!, lng: (pv.current_lng ?? pv.base_lng)! } : null;
  const live = ppos && ["matched", "en_route"].includes(r.status) ? haversineKm(ppos, { lat: r.lat, lng: r.lng }) : null;
  const idx = STEPS.indexOf(r.status);
  const amount = Number(r.est_cost ?? 0);
  const avgRating = reviews?.length ? reviews.reduce((s, x) => s + x.rating, 0) / reviews.length : 0;

  async function cancel() {
    const { error } = await supabase.from("requests").update({ status: "cancelled" }).eq("id", id);
    if (error) toast.error(error.message);
  }

  async function choosePayment() {
    setPaying(true);
    const transactionRef = `RR-${Date.now().toString(36).toUpperCase()}`;
    const isCash = method === "cash";
    const { error } = await supabase.from("payments").insert({
      request_id: id,
      customer_id: r!.customer_id,
      amount,
      method,
      status: isCash ? "pending" : "paid",
      transaction_ref: transactionRef,
      paid_at: isCash ? null : new Date().toISOString(),
    });
    setPaying(false);
    if (error) return toast.error(error.message);
    toast.success(isCash ? "Cash payment selected" : `Instant EFT payment successful • ${transactionRef}`);
    qc.invalidateQueries({ queryKey: ["payment", id] });
  }

  return (
    <PageShell title={serviceLabel(r.service_type)} subtitle={new Date(r.created_at).toLocaleString("en-ZA")} action={<StatusBadge status={r.status} />}>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <LazyMap center={{ lat: r.lat, lng: r.lng }} provider={ppos && r.status !== "completed" ? ppos : null} height={420} />
        <div className="space-y-4">
          <div className="card-surface p-5">
            <ol className="space-y-3">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-3">
                  <span className={cn("grid h-7 w-7 place-items-center rounded-full border text-xs font-bold", i <= idx ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground")}>
                    {i < idx ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={cn("text-sm font-semibold", i > idx && "text-muted-foreground")}>
                    {{ pending: "Finding a provider", matched: "Provider matched", en_route: "En route", arrived: "Provider arrived", completed: "Completed" }[s]}
                  </span>
                </li>
              ))}
            </ol>
            {r.status === "cancelled" && <p className="mt-3 text-sm text-destructive">This request was cancelled.</p>}
          </div>

          <div className="card-surface grid grid-cols-3 gap-2 p-4 text-center">
            <div><p className="text-xs text-muted-foreground">Distance</p><p className="font-extrabold">{live != null ? `${live.toFixed(1)} km` : r.distance_km ? `${r.distance_km} km` : "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">ETA</p><p className="font-extrabold">{live != null ? estimate(r.service_type, live).eta : r.eta_min ?? "—"} min</p></div>
            <div><p className="text-xs text-muted-foreground">Cost</p><p className="font-extrabold text-primary">{rand(r.est_cost)}</p></div>
          </div>

          {!payment && r.status !== "cancelled" && (
            <div className="card-surface p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Banknote className="h-5 w-5" /></div>
                <div><p className="font-bold">Choose payment method</p><p className="text-sm text-muted-foreground">Select how you want to pay for this RoadRescue service.</p></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  ["cash", "Cash", "Pay the verified service provider when the job is completed."],
                  ["instant_eft", "Instant EFT", "Pay instantly online using a secure Instant EFT checkout."],
                ].map(([value, label, description]) => (
                  <button key={value} type="button" onClick={() => setMethod(value as typeof method)}
                    className={cn("rounded-xl border p-4 text-left", method === value && "border-primary bg-accent text-accent-foreground")}>
                    <p className="font-bold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p>
                  </button>
                ))}
              </div>
              {method === "instant_eft" && <div className="mt-4 rounded-xl bg-muted p-4 text-sm">
                <p className="font-bold">RoadRescue Instant EFT</p>
                <p className="mt-1 text-muted-foreground">Instant EFT checkout • Secure online payment</p>
                <p className="mt-2 text-xs text-muted-foreground">This prototype records the payment as successful. For production, connect a South African Instant EFT provider such as Ozow, Stitch or another approved gateway.</p>
              </div>}
              {method === "cash" && <p className="mt-4 rounded-xl bg-muted p-3 text-sm">No online charge will be made. You will pay the provider in cash after receiving the service.</p>}
              <Button className="mt-4 w-full" size="lg" onClick={choosePayment} disabled={paying || amount <= 0}>
                {paying ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                {paying ? "Saving…" : method === "cash" ? "Choose Cash" : `Pay ${rand(amount)} with Instant EFT`}
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">Instant EFT is simulated in this prototype; connect a live South African Instant EFT gateway before production.</p>
            </div>
          )}

          {payment && (
            <div className="card-surface border-primary/30 p-5">
              <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-primary" /><p className="font-bold">{payment.status === "paid" ? "Payment recorded" : "Cash payment selected"}</p></div>
              <p className="mt-2 text-sm text-muted-foreground">{rand(payment.amount)} • {payment.method.replace("_", " ")} • {payment.transaction_ref}</p>
            </div>
          )}

          {pv && (
            <div className="card-surface p-5">
              <p className="text-xs font-bold uppercase text-muted-foreground">Your provider</p>
              <p className="mt-1 text-lg font-bold">{pv.business_name}</p>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <Stars value={avgRating} />
                <span className="font-semibold">{reviews?.length ? `${avgRating.toFixed(1)} (${reviews.length} reviews)` : "No reviews yet"}</span>
              </div>
              {pv.contact_phone && <Button variant="outline" className="mt-3" asChild><a href={`tel:${pv.contact_phone}`}><Phone /> {pv.contact_phone}</a></Button>}
            </div>
          )}
          {r.vehicles && (
            <div className="card-surface p-5 text-sm">
              <p className="font-bold">{r.vehicles.make_model}</p>
              <p className="text-muted-foreground">{r.vehicles.colour} • {r.vehicles.registration}</p>
              {r.instructions && <p className="mt-2">“{r.instructions}”</p>}
            </div>
          )}
          {!["completed", "cancelled"].includes(r.status) && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
              <p className="font-bold text-destructive">Feeling unsafe?</p>
              <p className="mt-1 text-sm text-muted-foreground">Your name and location go straight to our agents, who alert the police.</p>
              <SafetyAlertButton location={{ lat: r.lat, lng: r.lng }} requestId={r.id} className="mt-3 w-full" />
            </div>
          )}

          {r.status === "completed" && pv && <ReviewForm requestId={r.id} providerId={pv.id} customerId={r.customer_id} />}
          {pv && <ProviderReviews providerId={pv.id} title={`Reviews for ${pv.business_name}`} />}

          {r.status === "pending" && <Button variant="outline" className="w-full" onClick={cancel}>Cancel request</Button>}
        </div>
      </div>
    </PageShell>
  );
}
