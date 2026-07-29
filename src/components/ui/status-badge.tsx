import { cn } from "@/lib/utils";
import { TERMS } from "@/lib/terms";
import { CheckCircle2, Clock, AlertTriangle, Loader2, XCircle, type LucideIcon } from "lucide-react";

export type StatusKind =
  | "paid"
  | "due"
  | "overdue"
  | "partial"
  | "scheduled"
  | "cancelled"
  | "active"
  | "inactive";

const CONFIG: Record<
  StatusKind,
  { label: string; icon: LucideIcon; className: string }
> = {
  paid:      { label: TERMS.statusPaid,      icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30" },
  due:       { label: TERMS.statusDue,       icon: Clock,        className: "bg-sky-500/10 text-sky-300 ring-sky-500/30" },
  overdue:   { label: TERMS.statusOverdue,   icon: AlertTriangle,className: "bg-destructive/10 text-destructive ring-destructive/30" },
  partial:   { label: TERMS.statusPartial,   icon: Loader2,      className: "bg-amber-500/10 text-amber-400 ring-amber-500/30" },
  scheduled: { label: TERMS.statusScheduled, icon: Clock,        className: "bg-muted/40 text-muted-foreground ring-border" },
  cancelled: { label: TERMS.contractCancelled, icon: XCircle,    className: "bg-muted/40 text-muted-foreground ring-border" },
  active:    { label: TERMS.contractActive,  icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30" },
  inactive:  { label: TERMS.clientInactive,  icon: XCircle,      className: "bg-muted/40 text-muted-foreground ring-border" },
};

interface StatusBadgeProps {
  kind: StatusKind;
  label?: string;
  size?: "sm" | "md";
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge = ({ kind, label, size = "sm", className, showIcon = true }: StatusBadgeProps) => {
  const cfg = CONFIG[kind];
  const Icon = cfg.icon;
  const sz = size === "md" ? "text-[12px] px-2.5 py-1" : "text-[11px] px-2 py-0.5";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full ring-1 font-medium whitespace-nowrap",
        cfg.className,
        sz,
        className,
      )}
    >
      {showIcon && <Icon size={size === "md" ? 12 : 11} className="shrink-0" />}
      {label ?? cfg.label}
    </span>
  );
};
