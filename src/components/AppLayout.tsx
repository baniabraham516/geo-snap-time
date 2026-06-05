import { type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  LogIn,
  LogOut,
  History,
  CalendarDays,
  User,
  Users,
  MapPin,
  FileBarChart,
  Settings,
  Moon,
  Sun,
  MapPinned,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const employeeNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/absen", label: "Absensi", icon: LogIn },
  { to: "/riwayat", label: "Riwayat", icon: History },
  { to: "/izin", label: "Izin & Cuti", icon: CalendarDays },
  { to: "/profil", label: "Profil", icon: User },
];

const adminNav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/karyawan", label: "Data Karyawan", icon: Users },
  { to: "/admin/monitoring", label: "Monitoring", icon: MapPinned },
  { to: "/admin/izin", label: "Izin & Cuti", icon: CalendarDays },
  { to: "/admin/lokasi", label: "Lokasi Kantor", icon: MapPin },
  { to: "/admin/laporan", label: "Laporan", icon: FileBarChart },
  { to: "/admin/pengaturan", label: "Pengaturan", icon: Settings },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { role, employee, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const nav = role === "admin" ? adminNav : employeeNav;
  const isActive = (to: string) =>
    to === "/admin" || to === "/dashboard" ? pathname === to : pathname.startsWith(to);

  const initials = (employee?.full_name ?? "U")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex items-center gap-2 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-primary-foreground shadow-soft">
            <MapPinned className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-sidebar-foreground">ABSENSI GPS</p>
            <p className="text-[11px] text-muted-foreground capitalize">{role}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {nav.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-primary-foreground">
              <MapPinned className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold">ABSENSI GPS</span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm text-muted-foreground">Selamat datang,</p>
            <p className="-mt-0.5 font-semibold">{employee?.full_name ?? "Pengguna"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Ganti tema">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src={employee?.photo_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              aria-label="Logout"
              className="text-destructive md:hidden"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="px-4 pb-24 pt-5 md:px-8 md:pb-10">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-border bg-background/95 backdrop-blur md:hidden">
        {nav.slice(0, 5).map((item) => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition-transform`} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
