import { STATUS_LABEL } from "@/lib/services";
import { cn } from "@/lib/utils";

const tone: Record<string, string> = {
  pending: "bg-accent text-accent-foreground",
  matched: "bg-info text-info-foreground",
  en_route: "bg-info text-info-foreground",
  arrived: "bg-primary text-primary-foreground",
  completed: "bg-success text-success-foreground",
  cancelled: "bg-muted text-muted-foreground",
  approved: "bg-success text-success-foreground",
  rejected: "bg-destructive text-destructive-foreground",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide", tone[status] ?? "bg-muted text-muted-foreground")}>
      {label ?? STATUS_LABEL[status] ?? status}
    </span>
  );
}
