import { useQuery } from "@tanstack/react-query";
import { PhoneCall, MessageSquare, Hash, SignalLow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export function useEmergencyContacts() {
  return useQuery({
    queryKey: ["emergency-contacts"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () =>
      (await supabase.from("emergency_contacts").select("*").eq("is_active", true).order("sort_order")).data ?? [],
  });
}

export const telHref = (n: string) => `tel:${n.replace(/[^+\d*#]/g, "")}`;

export function EmergencyCall({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const { data: contacts } = useEmergencyContacts();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" className={className} onClick={onNavigate}>
          <PhoneCall /> Emergency call
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Call a RoadRescue agent</DialogTitle>
          <DialogDescription>
            No internet or weak signal? These options work on any phone, even without data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {contacts?.map((c) => (
            <div key={c.id} className="card-surface p-4">
              <p className="font-bold">{c.label}</p>
              <p className="text-sm text-muted-foreground">{c.phone}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" asChild>
                  <a href={telHref(c.phone)}>
                    <PhoneCall /> Call now
                  </a>
                </Button>
                {c.sms_number && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`sms:${c.sms_number}?&body=${encodeURIComponent("RoadRescue: I need help. My location: ")}`}>
                      <MessageSquare /> SMS {c.sms_number}
                    </a>
                  </Button>
                )}
                {c.ussd_code && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={telHref(c.ussd_code)}>
                      <Hash /> Dial {c.ussd_code}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
          <p className="flex gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
            <SignalLow className="h-4 w-4 shrink-0" />
            With no data, a voice call, an SMS or the dial code still reaches our agents. Save these numbers on your
            phone now so you have them when you break down.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
