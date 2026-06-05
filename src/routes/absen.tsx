import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LogIn, LogOut, MapPin, Loader2, CheckCircle2, Navigation } from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SelfieCapture } from "@/components/SelfieCapture";
import { useAuth } from "@/lib/auth";
import { fetchOffice, fetchTodayAttendance } from "@/lib/queries";
import { distanceMeters, getCurrentPosition, reverseGeocode, getDeviceInfo } from "@/lib/geo";
import { uploadAndSign, dataURLtoBlob } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { todayISO, formatTime, lateThreshold } from "@/lib/format";

export const Route = createFileRoute("/absen")({
  head: () => ({ meta: [{ title: "Absensi — ABSENSI GPS" }] }),
  component: () => (
    <RoleGuard allow={["karyawan", "admin"]}>
      <AppLayout>
        <AbsenContent />
      </AppLayout>
    </RoleGuard>
  ),
});

type Mode = "in" | "out";

function AbsenContent() {
  const { user, employee } = useAuth();
  const qc = useQueryClient();
  const { data: office } = useQuery({ queryKey: ["office"], queryFn: fetchOffice });
  const { data: attendance } = useQuery({
    queryKey: ["today-attendance", user?.id],
    queryFn: () => fetchTodayAttendance(user!.id),
    enabled: !!user,
  });

  const [locating, setLocating] = useState<Mode | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<{
    mode: Mode;
    lat: number;
    lng: number;
    distance: number;
  } | null>(null);

  const checkedIn = !!attendance?.check_in_at;
  const checkedOut = !!attendance?.check_out_at;

  async function startAttendance(mode: Mode) {
    if (!office) {
      toast.error("Lokasi kantor belum diatur. Hubungi admin.");
      return;
    }
    setLocating(mode);
    try {
      const pos = await getCurrentPosition();
      const { latitude, longitude, accuracy } = pos.coords;
      if (accuracy && accuracy > 500) {
        toast.warning("Akurasi GPS rendah. Pastikan GPS aktif & sinyal baik.");
      }
      const dist = distanceMeters(latitude, longitude, office.latitude, office.longitude);
      if (dist > office.radius_meters) {
        toast.error(
          `Di luar radius kantor. Jarak Anda ${dist} m (maks ${office.radius_meters} m).`,
        );
        setLocating(null);
        return;
      }
      setPending({ mode, lat: latitude, lng: longitude, distance: dist });
      setCameraOpen(true);
    } catch {
      toast.error("Gagal mendapatkan lokasi. Aktifkan izin GPS dan coba lagi.");
    } finally {
      setLocating(null);
    }
  }

  async function handleCapture(dataUrl: string) {
    if (!pending || !user || !employee) return;
    setSubmitting(true);
    try {
      const blob = dataURLtoBlob(dataUrl);
      const photoUrl = await uploadAndSign("selfies", user.id, blob);
      const address = await reverseGeocode(pending.lat, pending.lng);
      const device = getDeviceInfo();

      if (pending.mode === "in") {
        const now = new Date();
        const { h, m } = lateThreshold();
        const isLate = now.getHours() > h || (now.getHours() === h && now.getMinutes() > m);
        const { error } = await supabase.from("attendance").upsert(
          {
            employee_id: employee.id,
            user_id: user.id,
            date: todayISO(),
            check_in_at: now.toISOString(),
            check_in_lat: pending.lat,
            check_in_lng: pending.lng,
            check_in_distance: pending.distance,
            check_in_photo_url: photoUrl,
            check_in_address: address,
            check_in_device: device,
            status: isLate ? "terlambat" : "hadir",
          },
          { onConflict: "user_id,date" },
        );
        if (error) throw error;
        toast.success("Absensi masuk berhasil!");
      } else {
        if (!attendance) throw new Error("Belum ada absen masuk.");
        const { error } = await supabase
          .from("attendance")
          .update({
            check_out_at: new Date().toISOString(),
            check_out_lat: pending.lat,
            check_out_lng: pending.lng,
            check_out_distance: pending.distance,
            check_out_photo_url: photoUrl,
            check_out_address: address,
            check_out_device: device,
          })
          .eq("id", attendance.id);
        if (error) throw error;
        toast.success("Absensi pulang berhasil!");
      }

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: pending.mode === "in" ? "absen_masuk" : "absen_pulang",
        detail: `Jarak ${pending.distance} m`,
      });

      setCameraOpen(false);
      setPending(null);
      qc.invalidateQueries({ queryKey: ["today-attendance", user.id] });
      qc.invalidateQueries({ queryKey: ["my-attendance", user.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan absensi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="Absensi" description="Lakukan absensi masuk dan pulang di lokasi kantor." />

      <Card className="mb-5 flex items-center gap-3 p-4 shadow-card">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MapPin className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{office?.name ?? "Lokasi kantor belum diatur"}</p>
          <p className="text-xs text-muted-foreground">
            Radius absensi: {office?.radius_meters ?? "-"} meter
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AbsenCard
          mode="in"
          done={checkedIn}
          time={attendance?.check_in_at}
          loading={locating === "in"}
          disabled={checkedIn || locating !== null}
          onClick={() => startAttendance("in")}
        />
        <AbsenCard
          mode="out"
          done={checkedOut}
          time={attendance?.check_out_at}
          loading={locating === "out"}
          disabled={!checkedIn || checkedOut || locating !== null}
          onClick={() => startAttendance("out")}
        />
      </div>

      <Card className="mt-5 space-y-2 p-4 text-sm text-muted-foreground shadow-card">
        <p className="font-medium text-foreground">Ketentuan Absensi</p>
        <ul className="list-inside list-disc space-y-1">
          <li>GPS wajib aktif dan berada dalam radius kantor.</li>
          <li>Foto selfie diambil langsung dari kamera (tanpa upload galeri).</li>
          <li>Waktu absensi menggunakan jam server.</li>
        </ul>
      </Card>

      <SelfieCapture
        open={cameraOpen}
        onOpenChange={(v) => {
          setCameraOpen(v);
          if (!v) setPending(null);
        }}
        onCapture={handleCapture}
        submitting={submitting}
        title={pending?.mode === "in" ? "Selfie Absen Masuk" : "Selfie Absen Pulang"}
      />
    </>
  );
}

function AbsenCard({
  mode,
  done,
  time,
  loading,
  disabled,
  onClick,
}: {
  mode: Mode;
  done: boolean;
  time?: string | null;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const isIn = mode === "in";
  return (
    <Card className="flex flex-col items-center p-6 text-center shadow-card">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
          isIn ? "bg-success/15 text-success" : "bg-warning/20 text-warning"
        }`}
      >
        {isIn ? <LogIn className="h-7 w-7" /> : <LogOut className="h-7 w-7" />}
      </div>
      <h3 className="mt-3 text-lg font-semibold">{isIn ? "Absen Masuk" : "Absen Pulang"}</h3>
      {done ? (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> Tercatat {formatTime(time)}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">Belum tercatat</p>
      )}
      <Button onClick={onClick} disabled={disabled} className="mt-4 w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mendeteksi lokasi…
          </>
        ) : (
          <>
            <Navigation className="mr-2 h-4 w-4" /> {done ? "Selesai" : "Mulai Absen"}
          </>
        )}
      </Button>
    </Card>
  );
}
