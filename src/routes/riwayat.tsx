import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MapPin, Camera, Clock } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { fetchMyAttendance, type AttendanceRow } from "@/lib/queries";
import { formatDateShort, formatTime } from "@/lib/format";

export const Route = createFileRoute("/riwayat")({
  head: () => ({ meta: [{ title: "Riwayat Absensi — ABSENSI GPS" }] }),
  component: () => (
    <RoleGuard allow={["karyawan", "admin"]}>
      <AppLayout>
        <RiwayatContent />
      </AppLayout>
    </RoleGuard>
  ),
});

type Filter = "today" | "week" | "month" | "all";

function inRange(dateStr: string, filter: Filter): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  if (filter === "all") return true;
  if (filter === "today") return d.toDateString() === now.toDateString();
  if (filter === "week") {
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo;
  }
  if (filter === "month") {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  return true;
}

function RiwayatContent() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("month");
  const [selected, setSelected] = useState<AttendanceRow | null>(null);

  const { data: rows = [] } = useQuery({
    queryKey: ["my-attendance", user?.id],
    queryFn: () => fetchMyAttendance(user!.id),
    enabled: !!user,
  });

  const filtered = useMemo(() => rows.filter((r) => inRange(r.date, filter)), [rows, filter]);

  const filters: { key: Filter; label: string }[] = [
    { key: "today", label: "Hari Ini" },
    { key: "week", label: "Minggu Ini" },
    { key: "month", label: "Bulan Ini" },
    { key: "all", label: "Semua" },
  ];

  return (
    <>
      <PageHeader title="Riwayat Absensi" description="Catatan kehadiran Anda." />

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground shadow-card">
          Belum ada data absensi pada periode ini.
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card
              key={r.id}
              className="flex cursor-pointer items-center gap-4 p-4 shadow-card transition-shadow hover:shadow-soft"
              onClick={() => setSelected(r)}
            >
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="text-[10px] font-medium uppercase">
                  {new Date(r.date).toLocaleDateString("id-ID", { month: "short" })}
                </span>
                <span className="text-lg font-bold leading-none">{new Date(r.date).getDate()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{formatDateShort(r.date)}</p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> Masuk {formatTime(r.check_in_at)} · Pulang{" "}
                  {formatTime(r.check_out_at)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <DetailDialog row={selected} onClose={() => setSelected(null)} />
    </>
  );
}

export function DetailDialog({ row, onClose }: { row: AttendanceRow | null; onClose: () => void }) {
  return (
    <Dialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Absensi — {row && formatDateShort(row.date)}</DialogTitle>
        </DialogHeader>
        {row && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <DetailBlock
                label="Masuk"
                time={formatTime(row.check_in_at)}
                photo={row.check_in_photo_url}
                distance={row.check_in_distance}
                address={row.check_in_address}
                lat={row.check_in_lat}
                lng={row.check_in_lng}
              />
              <DetailBlock
                label="Pulang"
                time={formatTime(row.check_out_at)}
                photo={row.check_out_photo_url}
                distance={row.check_out_distance}
                address={row.check_out_address}
                lat={row.check_out_lat}
                lng={row.check_out_lng}
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              Status: <StatusBadge status={row.status} />
            </div>
            {row.check_in_device && (
              <p className="text-xs text-muted-foreground">Perangkat: {row.check_in_device}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailBlock({
  label,
  time,
  photo,
  distance,
  address,
  lat,
  lng,
}: {
  label: string;
  time: string;
  photo: string | null;
  distance: number | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{time}</p>
      <div className="mt-2 aspect-square overflow-hidden rounded-lg bg-muted">
        {photo ? (
          <img src={photo} alt={`Selfie ${label}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Camera className="h-6 w-6" />
          </div>
        )}
      </div>
      {distance != null && (
        <p className="mt-2 text-xs text-muted-foreground">Jarak: {distance} m</p>
      )}
      {address && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{address}</p>}
      {lat != null && lng != null && (
        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <MapPin className="h-3 w-3" /> Lihat peta
        </a>
      )}
    </div>
  );
}
