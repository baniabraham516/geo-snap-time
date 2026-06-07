import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Plus, Trash2, Loader2, Search, Power } from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fetchAllEmployees, type EmployeeFull } from "@/lib/queries";
import { createEmployee, deleteEmployee } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/karyawan")({
  head: () => ({ meta: [{ title: "Data Karyawan — ABSENSI GPS" }] }),
  component: () => (
    <RoleGuard allow={["admin"]}>
      <AppLayout>
        <KaryawanContent />
      </AppLayout>
    </RoleGuard>
  ),
});

const empty = { email: "", password: "", full_name: "", nik: "", position: "", division: "", phone: "" };

function KaryawanContent() {
  const qc = useQueryClient();
  const createFn = useServerFn(createEmployee);
  const deleteFn = useServerFn(deleteEmployee);
  const { data: employees = [] } = useQuery({ queryKey: ["all-employees"], queryFn: fetchAllEmployees });

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<EmployeeFull | null>(null);

  const filtered = useMemo(
    () =>
      employees.filter(
        (e) =>
          e.full_name.toLowerCase().includes(search.toLowerCase()) ||
          (e.nik ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (e.division ?? "").toLowerCase().includes(search.toLowerCase()),
      ),
    [employees, search],
  );

  async function submit() {
    const email = form.email.trim();
    const full_name = form.full_name.trim();
    if (!email || !form.password || !full_name)
      return toast.error("Nama, email, dan password wajib diisi.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return toast.error("Format email tidak valid.");
    if (form.password.length < 6) return toast.error("Password minimal 6 karakter.");
    setSaving(true);
    try {
      await createFn({
        data: {
          ...form,
          email,
          full_name,
          nik: form.nik.trim() || null,
          position: form.position.trim() || null,
          division: form.division.trim() || null,
          phone: form.phone.trim() || null,
          role: "karyawan",
        },
      });
      toast.success("Karyawan berhasil ditambahkan.");
      setOpen(false);
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["all-employees"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menambah karyawan.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(emp: EmployeeFull) {
    const { error } = await supabase
      .from("employees")
      .update({ is_active: !emp.is_active })
      .eq("id", emp.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Karyawan ${emp.is_active ? "dinonaktifkan" : "diaktifkan"}.`);
      qc.invalidateQueries({ queryKey: ["all-employees"] });
    }
  }

  async function confirmDelete() {
    if (!toDelete?.user_id) {
      setToDelete(null);
      return;
    }
    try {
      await deleteFn({ data: { user_id: toDelete.user_id } });
      toast.success("Karyawan dihapus.");
      qc.invalidateQueries({ queryKey: ["all-employees"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus.");
    } finally {
      setToDelete(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Data Karyawan"
        description={`${employees.length} karyawan terdaftar.`}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Tambah
          </Button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari nama, NIK, divisi…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((e) => {
          const initials = e.full_name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
          return (
            <Card key={e.id} className="p-4 shadow-card">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 border border-border">
                  <AvatarImage src={e.photo_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{e.full_name}</p>
                  <p className="text-xs text-muted-foreground">{e.position ?? "-"} · {e.division ?? "-"}</p>
                  <p className="text-xs text-muted-foreground">NIK: {e.nik ?? "-"}</p>
                  <span
                    className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      e.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {e.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => toggleActive(e)}>
                  <Power className="mr-1.5 h-3.5 w-3.5" />
                  {e.is_active ? "Nonaktifkan" : "Aktifkan"}
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setToDelete(e)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="col-span-full p-10 text-center text-sm text-muted-foreground shadow-card">
            Tidak ada karyawan ditemukan.
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Karyawan</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Nama Lengkap" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} className="sm:col-span-2" />
            <FormField label="NIK" value={form.nik} onChange={(v) => setForm({ ...form, nik: v })} />
            <FormField label="Nomor HP" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <FormField label="Jabatan" value={form.position} onChange={(v) => setForm({ ...form, position: v })} />
            <FormField label="Divisi" value={form.division} onChange={(v) => setForm({ ...form, division: v })} />
            <FormField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <FormField label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus karyawan?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun dan seluruh data absensi {toDelete?.full_name} akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
