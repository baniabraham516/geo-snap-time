import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, LogOut, Moon, Sun, Building2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/pengaturan")({
  head: () => ({ meta: [{ title: "Pengaturan — ABSENSI GPS" }] }),
  component: () => (
    <RoleGuard allow={["admin"]}>
      <AppLayout>
        <PengaturanContent />
      </AppLayout>
    </RoleGuard>
  ),
});

async function fetchCompany() {
  const { data } = await supabase.from("settings").select("value").eq("key", "company").maybeSingle();
  return (data?.value as { name?: string; work_start?: string }) ?? {};
}

function PengaturanContent() {
  const { user, employee, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: company } = useQuery({ queryKey: ["company-settings"], queryFn: fetchCompany });
  const [name, setName] = useState("");
  const [workStart, setWorkStart] = useState("08:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setName(company.name ?? "");
      setWorkStart(company.work_start ?? "08:00");
    }
  }, [company]);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("settings")
      .upsert({ key: "company", value: { name, work_start: workStart } });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Pengaturan disimpan.");
      qc.invalidateQueries({ queryKey: ["company-settings"] });
    }
  }

  return (
    <>
      <PageHeader title="Pengaturan" description="Konfigurasi aplikasi dan akun admin." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="space-y-4 p-5 shadow-card">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Profil Perusahaan</h3>
          </div>
          <div className="space-y-2">
            <Label>Nama Perusahaan</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="PT Maju Bersama" />
          </div>
          <div className="space-y-2">
            <Label>Jam Masuk (batas tepat waktu)</Label>
            <Input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} />
          </div>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
          </Button>
        </Card>

        <Card className="space-y-4 p-5 shadow-card">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Akun Admin</h3>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Nama</p>
            <p className="font-medium">{employee?.full_name ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="font-medium">{employee?.email ?? user?.email ?? "-"}</p>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <p className="font-medium">Tema</p>
              <p className="text-sm text-muted-foreground">Mode {theme === "dark" ? "Gelap" : "Terang"}</p>
            </div>
            <Button variant="outline" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              Ubah
            </Button>
          </div>
          <Button
            variant="destructive"
            className="w-full"
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </Card>
      </div>
    </>
  );
}
