import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, LogOut, Camera, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { uploadAndSign } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profil")({
  head: () => ({ meta: [{ title: "Profil Saya — ABSENSI GPS" }] }),
  component: () => (
    <RoleGuard allow={["karyawan", "admin"]}>
      <AppLayout>
        <ProfilContent />
      </AppLayout>
    </RoleGuard>
  ),
});

function ProfilContent() {
  const { user, employee, refresh, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const initials = (employee?.full_name ?? "U")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  async function savePhone() {
    if (!employee) return;
    setSaving(true);
    const { error } = await supabase.from("employees").update({ phone }).eq("id", employee.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Profil diperbarui.");
      await refresh();
    }
  }

  async function uploadAvatar(file: File) {
    if (!user || !employee) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const url = await uploadAndSign("avatars", user.id, file, ext);
      const { error } = await supabase.from("employees").update({ photo_url: url }).eq("id", employee.id);
      if (error) throw error;
      toast.success("Foto profil diperbarui.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal unggah foto.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <PageHeader title="Profil Saya" description="Kelola data pribadi Anda." />

      <Card className="mb-5 flex flex-col items-center p-6 text-center shadow-card">
        <div className="relative">
          <Avatar className="h-24 w-24 border-2 border-border">
            <AvatarImage src={employee?.photo_url ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <label className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-soft">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
            />
          </label>
        </div>
        <h2 className="mt-3 text-xl font-bold">{employee?.full_name}</h2>
        <p className="text-sm text-muted-foreground">{employee?.position ?? "-"}</p>
      </Card>

      <Card className="space-y-4 p-5 shadow-card">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="NIK" value={employee?.nik ?? "-"} />
          <Field label="Divisi" value={employee?.division ?? "-"} />
          <Field label="Jabatan" value={employee?.position ?? "-"} />
          <Field label="Email" value={employee?.email ?? user?.email ?? "-"} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Nomor HP</Label>
          <div className="flex gap-2">
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08…" />
            <Button onClick={savePhone} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="mt-5 p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Tema Tampilan</p>
            <p className="text-sm text-muted-foreground">Mode {theme === "dark" ? "Gelap" : "Terang"}</p>
          </div>
          <Button variant="outline" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            Ubah
          </Button>
        </div>
      </Card>

      <Button
        variant="destructive"
        className="mt-5 w-full"
        onClick={async () => {
          await signOut();
          navigate({ to: "/login" });
        }}
      >
        <LogOut className="mr-2 h-4 w-4" /> Logout
      </Button>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
