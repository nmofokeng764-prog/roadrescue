import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { RoleGate, PageShell } from "@/components/RoleGate";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { rand, serviceLabel } from "@/lib/services";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "History — RoadRescue" }, { name: "description", content: "Your assistance request history." }] }),
  component: () => <RoleGate allow={["customer"]}><History /></RoleGate>,
});

function History() {
  const { data: me } = useMe();
  const uid = me?.profile?.id;
  const { data } = useQuery({
    queryKey: ["requests", uid, "all"],
    enabled: !!uid,
    queryFn: async () => (await supabase.from("requests").select("*, providers(business_name)").eq("customer_id", uid!).order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <PageShell title="History" subtitle="Your previous and active assistance requests.">
      {!data?.length && <p className="text-muted-foreground">No requests yet.</p>}
      <div className="space-y-3">
        {data?.map((r) => (
          <Link key={r.id} to="/requests/$id" params={{ id: r.id }} className="card-surface flex items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{serviceLabel(r.service_type)}</p>
              <p className="truncate text-sm text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString("en-ZA")} • {r.providers?.business_name ?? "No provider yet"} • {rand(r.est_cost)}
              </p>
            </div>
            <StatusBadge status={r.status} />
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
