import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, FileText, Printer, Sheet } from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAllAttendance } from "@/lib/queries";
import { formatDateShort, formatTime, todayISO } from "@/lib/format";

export const Route = createFileRoute("/admin/laporan")({
  head: () => ({ meta: [{ title: "Laporan — ABSENSI GPS" }] }),
  component: () => (
    <RoleGuard allow={["admin"]}>
      <AppLayout>
        <LaporanContent />
      </AppLayout>
    </RoleGuard>
  ),
});

type Period = "daily" | "weekly" | "monthly";

function LaporanContent() {
  const { data: rows = [] } = useQuery({ queryKey: ["all-attendance"], queryFn: fetchAllAttendance });
  const [period, setPeriod] = useState<Period>("monthly");

  const filtered = useMemo(() => {
    const now = new Date();
    return rows.filter((r) => {
      const d = new Date(r.date);
      if (period === "daily") return r.date === todayISO();
      if (period === "weekly") {
        const w = new Date();
        w.setDate(now.getDate() - 7);
        return d >= w;
      }
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [rows, period]);

  function buildRows() {
    return filtered.map((r) => ({
      Nama: r.employees?.full_name ?? "",
      NIK: r.employees?.nik ?? "",
      Divisi: r.employees?.division ?? "",
      Tanggal: r.date,
      "Jam Masuk": formatTime(r.check_in_at),
      "Jam Pulang": formatTime(r.check_out_at),
      "Jarak (m)": r.check_in_distance ?? "",
      Status: r.status,
    }));
  }

  function exportExcel() {
    if (filtered.length === 0) return toast.error("Tidak ada data untuk diekspor.");
    const ws = XLSX.utils.json_to_sheet(buildRows());
    ws["!cols"] = [
      { wch: 24 },
      { wch: 16 },
      { wch: 16 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Absensi");
    XLSX.writeFile(wb, `laporan-absensi-${period}-${todayISO()}.xlsx`);
    toast.success("Laporan Excel (.xlsx) diunduh.");
  }

  function exportCSV() {
    if (filtered.length === 0) return toast.error("Tidak ada data untuk diekspor.");
    const ws = XLSX.utils.json_to_sheet(buildRows());
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-absensi-${period}-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Laporan CSV diunduh.");
  }

  function exportPDF() {
    window.print();
  }

  const periods: { key: Period; label: string }[] = [
    { key: "daily", label: "Harian" },
    { key: "weekly", label: "Mingguan" },
    { key: "monthly", label: "Bulanan" },
  ];

  return (
    <>
      <PageHeader
        title="Laporan Absensi"
        description="Ekspor laporan kehadiran karyawan."
        action={
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={exportCSV}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" onClick={exportPDF}>
              <FileText className="mr-2 h-4 w-4" /> PDF
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        {periods.map((p) => (
          <Button key={p.key} size="sm" variant={period === p.key ? "default" : "outline"} onClick={() => setPeriod(p.key)}>
            {p.label}
          </Button>
        ))}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={exportPDF}>
          <Printer className="mr-2 h-4 w-4" /> Cetak
        </Button>
      </div>

      <Card className="overflow-x-auto shadow-card">
        <div className="hidden p-4 print:block">
          <h2 className="text-lg font-bold">Laporan Absensi ({period})</h2>
          <p className="text-sm text-muted-foreground">Dicetak: {formatDateShort(new Date())}</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Divisi</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Masuk</TableHead>
              <TableHead>Pulang</TableHead>
              <TableHead>Jarak</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.employees?.full_name ?? "—"}</TableCell>
                <TableCell>{r.employees?.division ?? "-"}</TableCell>
                <TableCell>{formatDateShort(r.date)}</TableCell>
                <TableCell>{formatTime(r.check_in_at)}</TableCell>
                <TableCell>{formatTime(r.check_out_at)}</TableCell>
                <TableCell>{r.check_in_distance != null ? `${r.check_in_distance} m` : "-"}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Tidak ada data pada periode ini.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
