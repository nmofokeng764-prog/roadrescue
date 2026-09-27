import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, PhoneCall, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { useEmergencyContacts, telHref } from "@/components/EmergencyCall";

type Props = { location: { lat: number; lng: number }; requestId?: string; className?: string };

const POLICE_FALLBACK = "10111";

export function SafetyAlertButton({ location, requestId, className }: Props) {
  const { data: me } = useMe();
  const { data: contacts } = useEmergencyContacts();
  const police = contacts?.find((c) => c.kind === "police")?.phone ?? POLICE_FALLBACK;
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function send() {
    if (!me?.profile) return toast.error("Please sign in again");
    setBusy(true);
    const { error } = await supabase.from("safety_alerts").insert({
      customer_id: me.profile.id,
      request_id: requestId ?? null,
      full_name: me.profile.full_name || me.profile.email,
      phone: me.profile.phone,
      lat: location.lat,
      lng: location.lng,
      note: note.trim().slice(0, 500) || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Alert sent. Our agents are escalating to the police — call 10111 now if you can.");
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="lg" className={className}>
          <ShieldAlert className="!size-5" /> I don't feel safe
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send a safety alert to the police</AlertDialogTitle>
          <AlertDialogDescription>
            We will share your full name, phone number and exact location ({location.lat.toFixed(5)},{" "}
            {location.lng.toFixed(5)}) with our 24/7 agents, who escalate it to the South African Police Service
            immediately.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Textarea
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What is happening? (optional — e.g. a car has stopped next to me)"
        />

        <div className="rounded-xl bg-destructive/10 p-3 text-sm">
          <p className="font-bold text-destructive">In immediate danger?</p>
          <Button variant="destructive" size="sm" className="mt-2" asChild>
            <a href={telHref(police)}>
              <PhoneCall /> Call police {police}
            </a>
          </Button>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void send();
            }}
            disabled={busy || sent}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy ? <Loader2 className="animate-spin" /> : <ShieldAlert />}
            {sent ? "Alert sent" : busy ? "Sending…" : "Send alert to police"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
