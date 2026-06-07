import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  Users,
  UserCheck,
  Clock,
  CalendarDays,
  Plane,
  UserX,
  TrendingUp,
  Hourglass,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RoleGuard } from "@/components/RoleGuard";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchAllEmployees,
  fetchAllAttendance,
  fetchAllLeaves,
} from "@/lib/queries";
import { todayISO, formatTime, dayName } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard Admin — ABSENSI GPS" }] }),
  component: () => (
    <RoleGuard allow={["admin"]}>
      <AppLayout>
        <AdminDashboard />
      </AppLayout>
    </RoleGuard>
  ),
});

function AdminDashboard() {
  const { data: employees = [] } = useQuery({ queryKey: ["all-employees"], queryFn: fetchAllEmployees });
  const { data: attendance = [] } = useQuery({ queryKey: ["all-attendance"], queryFn: fetchAllAttendance });
  const { data: leaves = [] } = useQuery({ queryKey: ["all-leaves"], queryFn: fetchAllLeaves });
  const { data: company } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("value").eq("key", "company").maybeSingle();
      return (data?.value as { name?: string; work_start?: string; work_end?: string }) ?? {};
    },
  });

  const today = todayISO();
  const todayRows = attendance.filter((a) => a.date === today);
  const activeEmployees = employees.filter((e) => e.is_active);

  const present = todayRows.length;
  const late = todayRows.filter((a) => a.status === "terlambat").length;
  const todayLeaves = leaves.filter(
    (l) => l.status === "disetujui" && l.start_date <= today && l.end_date >= today,
  );
  const izinCount = todayLeaves.filter((l) => l.type === "izin" || l.type === "sakit").length;
  const cutiCount = todayLeaves.filter((l) => l.type === "cuti").length;
  const alpha = Math.max(0, activeEmployees.length - present - izinCount - cutiCount);
  const pendingLeaves = leaves.filter((l) => l.status === "menunggu").length;
  const attendanceRate =
    activeEmployees.length > 0 ? Math.round((present / activeEmployees.length) * 100) : 0;

  const chartData = useMemo(() => {
    const days: { name: string; hadir: number; terlambat: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const rows = attendance.filter((a) => a.date === ds);
      days.push({
        name: dayName(d).slice(0, 3),
        hadir: rows.filter((r) => r.status === "hadir").length,
        terlambat: rows.filter((r) => r.status === "terlambat").length,
      });
    }
    return days;
  }, [attendance]);

  const recent = [...attendance]
    .filter((a) => a.check_in_at)
    .sort((a, b) => (b.check_in_at! > a.check_in_at! ? 1 : -1))
    .slice(0, 6);

  return (
    <>
      <PageHeader title="Dashboard Admin" description="Ringkasan kehadiran karyawan hari ini." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Karyawan" value={activeEmployees.length} icon={<Users className="h-6 w-6" />} tone="primary" />
        <StatCard label="Hadir Hari Ini" value={present} icon={<UserCheck className="h-6 w-6" />} tone="success" />
        <StatCard label="Terlambat" value={late} icon={<Clock className="h-6 w-6" />} tone="warning" />
        <StatCard label="Izin" value={izinCount} icon={<CalendarDays className="h-6 w-6" />} tone="primary" />
        <StatCard label="Cuti" value={cutiCount} icon={<Plane className="h-6 w-6" />} tone="primary" />
        <StatCard label="Alpha" value={alpha} icon={<UserX className="h-6 w-6" />} tone="destructive" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 shadow-card lg:col-span-2">
          <h3 className="mb-4 font-semibold">Grafik Kehadiran (7 Hari)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--popover-foreground)",
                  }}
                />
                <Bar dataKey="hadir" name="Hadir" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="terlambat" name="Terlambat" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 shadow-card">
          <h3 className="mb-4 font-semibold">Aktivitas Terbaru</h3>
          <div className="space-y-3">
            {recent.length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
            )}
            {recent.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.employees?.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Masuk {formatTime(a.check_in_at)}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
