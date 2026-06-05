import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, MapPin, Camera } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAllAttendance, type AttendanceWithEmployee } from "@/lib/queries";
import { DetailDialog } from "@/routes/riwayat";
import { formatDateShort, formatTime, todayISO } from "@/lib/format";

export const Route = createFileRoute("/admin/monitoring")({
  head: () => ({ meta: [{ title: "Monitoring Absensi — ABSENSI GPS" }] }),
  component: () => (
    <RoleGuard allow={["admin"]}>
      <AppLayout>
        <MonitoringContent />
      </AppLayout>
    </RoleGuard>
  ),
});

type Filter = "today" | "week" | "month" | "all";

function MonitoringContent() {
  const { data: rows = [] } = useQuery({ queryKey: ["all-attendance"], queryFn: fetchAllAttendance });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("today");
  const [selected, setSelected] = useState<AttendanceWithEmployee | null>(null);

  const filtered = useMemo(() => {
    const now = new Date();
    return rows.filter((r) => {
      const d = new Date(r.date);
      let okDate = true;
      if (filter === "today") okDate = r.date === todayISO();
      else if (filter === "week") {
        const w = new Date();
        w.setDate(now.getDate() - 7);
        okDate = d >= w;
      } else if (filter === "month") {
        okDate = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      const okSearch = (r.employees?.full_name ?? "").toLowerCase().includes(search.toLowerCase());
      return okDate && okSearch;
    });
  }, [rows, filter, search]);

  const filters: { key: Filter; label: string }[] = [
    { key: "today", label: "Hari Ini" },
    { key: "week", label: "Minggu Ini" },
    { key: "month", label: "Bulan Ini" },
    { key: "all", label: "Semua" },
  ];

  return (
    <>
      <PageHeader title="Monitoring Absensi" description="Pantau kehadiran seluruh karyawan." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)}>
            {f.label}
          </Button>
        ))}
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari karyawan…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filtered.map((r) => (
          <Card key={r.id} className="p-4 shadow-card" onClick={() => setSelected(r)}>
            <div className="flex items-center justify-between">
              <p className="font-medium">{r.employees?.full_name ?? "—"}</p>
              <StatusBadge status={r.status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateShort(r.date)} · Masuk {formatTime(r.check_in_at)} · Pulang {formatTime(r.check_out_at)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Jarak: {r.check_in_distance ?? "-"} m</p>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground shadow-card">Tidak ada data.</Card>
        )}
      </div>

      {/* Desktop table */}
      <Card className="hidden overflow-x-auto shadow-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Karyawan</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Masuk</TableHead>
              <TableHead>Pulang</TableHead>
              <TableHead>Jarak</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.employees?.full_name ?? "—"}</TableCell>
                <TableCell>{formatDateShort(r.date)}</TableCell>
                <TableCell>{formatTime(r.check_in_at)}</TableCell>
                <TableCell>{formatTime(r.check_out_at)}</TableCell>
                <TableCell>{r.check_in_distance != null ? `${r.check_in_distance} m` : "-"}</TableCell>
                <TableCell>
                  {r.check_in_lat != null ? (
                    <a
                      href={`https://www.google.com/maps?q=${r.check_in_lat},${r.check_in_lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <MapPin className="h-3.5 w-3.5" /> Maps
                    </a>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setSelected(r)}>
                    <Camera className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  Tidak ada data absensi.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <DetailDialog row={selected} onClose={() => setSelected(null)} />
    </>
  );
}
