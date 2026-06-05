import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Check, X, Paperclip, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { fetchAllLeaves, type LeaveWithEmployee } from "@/lib/queries";
import { formatDateShort } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/izin")({
  head: () => ({ meta: [{ title: "Izin & Cuti — Admin — ABSENSI GPS" }] }),
  component: () => (
    <RoleGuard allow={["admin"]}>
      <AppLayout>
        <AdminIzinContent />
      </AppLayout>
    </RoleGuard>
  ),
});

type Filter = "menunggu" | "disetujui" | "ditolak" | "all";

function AdminIzinContent() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("menunggu");
  const { data: leaves = [] } = useQuery({ queryKey: ["all-leaves"], queryFn: fetchAllLeaves });

  const filtered = useMemo(
    () => leaves.filter((l) => (filter === "all" ? true : l.status === filter)),
    [leaves, filter],
  );

  async function review(leave: LeaveWithEmployee, status: "disetujui" | "ditolak") {
    const { error } = await supabase
      .from("leave_requests")
      .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq("id", leave.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Pengajuan ${status}.`);
      qc.invalidateQueries({ queryKey: ["all-leaves"] });
    }
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "menunggu", label: "Menunggu" },
    { key: "disetujui", label: "Disetujui" },
    { key: "ditolak", label: "Ditolak" },
    { key: "all", label: "Semua" },
  ];

  return (
    <>
      <PageHeader title="Persetujuan Izin & Cuti" description="Tinjau pengajuan karyawan." />

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)}>
            {f.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground shadow-card">
          Tidak ada pengajuan pada kategori ini.
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((l) => (
            <Card key={l.id} className="p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{l.employees?.full_name ?? "—"}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {l.type} · {formatDateShort(l.start_date)} — {formatDateShort(l.end_date)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={l.status} />
              </div>
              {l.reason && <p className="mt-2 text-sm text-muted-foreground">{l.reason}</p>}
              {l.attachment_url && (
                <a href={l.attachment_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  <Paperclip className="h-3 w-3" /> Lampiran
                </a>
              )}
              {l.status === "menunggu" && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => review(l, "disetujui")}>
                    <Check className="mr-1.5 h-4 w-4" /> Setujui
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={() => review(l, "ditolak")}>
                    <X className="mr-1.5 h-4 w-4" /> Tolak
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
