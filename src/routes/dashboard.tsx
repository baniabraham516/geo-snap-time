import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, LogIn, LogOut, CalendarCheck, History, CalendarDays, MapPin } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { fetchTodayAttendance, fetchOffice } from "@/lib/queries";
import { formatDate, formatTime, dayName } from "@/lib/format";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ABSENSI GPS" }] }),
  component: () => (
    <RoleGuard allow={["karyawan", "admin"]}>
      <AppLayout>
        <DashboardContent />
      </AppLayout>
    </RoleGuard>
  ),
});

function DashboardContent() {
  const { user, employee } = useAuth();
  const today = new Date();

  const { data: attendance } = useQuery({
    queryKey: ["today-attendance", user?.id],
    queryFn: () => fetchTodayAttendance(user!.id),
    enabled: !!user,
  });
  const { data: office } = useQuery({ queryKey: ["office"], queryFn: fetchOffice });

  const checkedIn = !!attendance?.check_in_at;
  const checkedOut = !!attendance?.check_out_at;

  return (
    <>
      <PageHeader
        title={`Halo, ${employee?.full_name?.split(" ")[0] ?? "Karyawan"} 👋`}
        description={`${dayName(today)}, ${formatDate(today)}`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Status Hari Ini"
          value={
            <span className="text-base">
              {attendance ? <StatusBadge status={attendance.status} /> : "Belum Absen"}
            </span>
          }
          icon={<CalendarCheck className="h-6 w-6" />}
          tone={attendance ? "success" : "muted"}
        />
        <StatCard label="Jam Masuk" value={formatTime(attendance?.check_in_at)} icon={<LogIn className="h-6 w-6" />} tone="primary" />
        <StatCard label="Jam Pulang" value={formatTime(attendance?.check_out_at)} icon={<LogOut className="h-6 w-6" />} tone="warning" />
        <StatCard label="Radius Kantor" value={`${office?.radius_meters ?? 100} m`} icon={<MapPin className="h-6 w-6" />} tone="muted" />
      </div>

      <Card className="mt-5 overflow-hidden shadow-card">
        <div className="gradient-primary p-6 text-primary-foreground">
          <div className="flex items-center gap-2 text-sm opacity-90">
            <Clock className="h-4 w-4" /> Absensi Hari Ini
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs opacity-80">Masuk</p>
              <p className="text-2xl font-bold">{formatTime(attendance?.check_in_at)}</p>
            </div>
            <div>
              <p className="text-xs opacity-80">Pulang</p>
              <p className="text-2xl font-bold">{formatTime(attendance?.check_out_at)}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <Button asChild disabled={checkedIn} variant={checkedIn ? "secondary" : "default"}>
            <Link to="/absen">
              <LogIn className="mr-2 h-4 w-4" />
              {checkedIn ? "Sudah Masuk" : "Absen Masuk"}
            </Link>
          </Button>
          <Button asChild disabled={!checkedIn || checkedOut} variant={!checkedIn || checkedOut ? "secondary" : "default"}>
            <Link to="/absen">
              <LogOut className="mr-2 h-4 w-4" />
              {checkedOut ? "Sudah Pulang" : "Absen Pulang"}
            </Link>
          </Button>
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <QuickLink to="/riwayat" icon={History} title="Riwayat Absensi" desc="Lihat catatan kehadiran" />
        <QuickLink to="/izin" icon={CalendarDays} title="Izin & Cuti" desc="Ajukan izin atau cuti" />
        <QuickLink to="/profil" icon={CalendarCheck} title="Profil Saya" desc="Kelola data pribadi" />
      </div>
    </>
  );
}

function QuickLink({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: string;
  icon: typeof History;
  title: string;
  desc: string;
}) {
  return (
    <Link to={to}>
      <Card className="flex items-center gap-3 p-4 shadow-card transition-shadow hover:shadow-soft">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium leading-tight">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </Card>
    </Link>
  );
}
