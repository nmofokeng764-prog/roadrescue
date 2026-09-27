import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function useProviderReviews(providerId?: string | null) {
  return useQuery({
    queryKey: ["reviews", providerId],
    enabled: !!providerId,
    queryFn: async () =>
      (
        await supabase
          .from("reviews")
          .select("id, rating, comment, created_at")
          .eq("provider_id", providerId!)
          .order("created_at", { ascending: false })
          .limit(50)
      ).data ?? [],
  });
}

export function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn(size, i <= Math.round(value) ? "fill-primary text-primary" : "text-muted-foreground")} />
      ))}
    </span>
  );
}

export function ProviderReviews({ providerId, title = "Reviews" }: { providerId?: string | null; title?: string }) {
  const { data: reviews } = useProviderReviews(providerId);
  const avg = reviews?.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold">{title}</p>
        {!!reviews?.length && (
          <span className="flex items-center gap-2 text-sm font-bold">
            <Stars value={avg} /> {avg.toFixed(1)} ({reviews.length})
          </span>
        )}
      </div>
      {!reviews?.length && <p className="mt-2 text-sm text-muted-foreground">No reviews yet.</p>}
      <ul className="mt-3 space-y-3">
        {reviews?.slice(0, 10).map((r) => (
          <li key={r.id} className="rounded-xl border p-3">
            <div className="flex items-center justify-between">
              <Stars value={r.rating} />
              <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-ZA")}</span>
            </div>
            {r.comment && <p className="mt-2 text-sm">“{r.comment}”</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReviewForm({
  requestId,
  providerId,
  customerId,
}: {
  requestId: string;
  providerId: string;
  customerId: string;
}) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ["review", requestId],
    queryFn: async () => (await supabase.from("reviews").select("*").eq("request_id", requestId).maybeSingle()).data,
  });

  if (existing)
    return (
      <div className="card-surface p-5">
        <p className="font-bold">Your review</p>
        <div className="mt-2 flex items-center gap-2">
          <Stars value={existing.rating} />
        </div>
        {existing.comment && <p className="mt-2 text-sm text-muted-foreground">“{existing.comment}”</p>}
      </div>
    );

  async function submit() {
    setBusy(true);
    const { error } = await supabase.from("reviews").insert({
      request_id: requestId,
      provider_id: providerId,
      customer_id: customerId,
      rating,
      comment: comment.trim().slice(0, 600) || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Thanks for rating your provider");
    qc.invalidateQueries({ queryKey: ["review", requestId] });
    qc.invalidateQueries({ queryKey: ["reviews", providerId] });
  }

  return (
    <div className="card-surface p-5">
      <p className="font-bold">Rate your provider</p>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" aria-label={`${i} star`} onClick={() => setRating(i)}>
            <Star className={cn("h-7 w-7", i <= rating ? "fill-primary text-primary" : "text-muted-foreground")} />
          </button>
        ))}
      </div>
      <Textarea
        className="mt-3"
        maxLength={600}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="How was the service?"
      />
      <Button className="mt-3 w-full" onClick={submit} disabled={busy}>
        {busy ? "Sending…" : "Submit review"}
      </Button>
    </div>
  );
}
