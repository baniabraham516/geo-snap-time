import { type ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    hadir: "bg-success/15 text-success",
    terlambat: "bg-warning/20 text-warning",
    izin: "bg-primary/10 text-primary",
    cuti: "bg-primary/10 text-primary",
    sakit: "bg-accent text-accent-foreground",
    alpha: "bg-destructive/10 text-destructive",
    menunggu: "bg-warning/20 text-warning",
    disetujui: "bg-success/15 text-success",
    ditolak: "bg-destructive/10 text-destructive",
  };
  const cls = map[status] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}
