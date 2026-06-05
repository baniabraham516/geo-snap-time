import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { MapPinned, Camera, ShieldCheck, BarChart3, Clock, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ABSENSI GPS — Absensi Karyawan Berbasis GPS & Selfie" },
      {
        name: "description",
        content:
          "Sistem absensi karyawan modern dengan GPS geofencing, verifikasi foto selfie, dan dashboard real-time untuk admin dan karyawan.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: MapPinned, title: "GPS Geofencing", desc: "Absensi hanya valid di dalam radius kantor yang ditentukan." },
  { icon: Camera, title: "Foto Selfie", desc: "Verifikasi kehadiran langsung dari kamera, tanpa upload galeri." },
  { icon: ShieldCheck, title: "Anti Manipulasi", desc: "Timestamp server, info perangkat, dan deteksi lokasi palsu." },
  { icon: BarChart3, title: "Dashboard Real-time", desc: "Statistik kehadiran, grafik, dan monitoring untuk admin." },
  { icon: Clock, title: "Izin & Cuti", desc: "Pengajuan izin, sakit, dan cuti dengan alur persetujuan." },
  { icon: Smartphone, title: "Mobile First", desc: "Dioptimalkan untuk smartphone karena absensi dari lapangan." },
];

function Landing() {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session && role) {
      navigate({ to: role === "admin" ? "/admin" : "/dashboard" });
    }
  }, [loading, session, role, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-primary-foreground shadow-soft">
            <MapPinned className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">ABSENSI GPS</span>
        </div>
        <Button asChild>
          <Link to="/login">Masuk</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-12 pt-10 text-center md:pt-20">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Absensi tanpa Face Recognition
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          Absensi Karyawan <span className="text-gradient-primary">Berbasis GPS</span> & Foto Selfie
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
          Pastikan karyawan hadir di lokasi yang tepat dengan geofencing radius kantor dan verifikasi
          foto langsung dari kamera. Cepat, aman, dan transparan.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/login">Mulai Absen Sekarang</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ABSENSI GPS — Sistem Absensi Karyawan
      </footer>
    </div>
  );
}
