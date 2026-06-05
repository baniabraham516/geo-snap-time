import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Paperclip, Loader2, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { fetchMyLeaves } from "@/lib/queries";
import { formatDateShort } from "@/lib/format";
import { uploadAndSign } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/izin")({
  head: () => ({ meta: [{ title: "Izin & Cuti — ABSENSI GPS" }] }),
  component: () => (
    <RoleGuard allow={["karyawan", "admin"]}>
      <AppLayout>
        <IzinContent />
      </AppLayout>
    </RoleGuard>
  ),
});

function IzinContent() {
  const { user, employee } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState("izin");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: leaves = [] } = useQuery({
    queryKey: ["my-leaves", user?.id],
    queryFn: () => fetchMyLeaves(user!.id),
    enabled: !!user,
  });

  async function submit() {
    if (!user || !employee) return;
    if (!startDate || !endDate) return toast.error("Tanggal mulai & selesai wajib diisi.");
    if (endDate < startDate) return toast.error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
    setSubmitting(true);
    try {
      let attachmentUrl: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "pdf";
        attachmentUrl = await uploadAndSign("attachments", user.id, file, ext);
      }
      const { error } = await supabase.from("leave_requests").insert({
        employee_id: employee.id,
        user_id: user.id,
        type,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim() || null,
        attachment_url: attachmentUrl,
        status: "menunggu",
      });
      if (error) throw error;
      toast.success("Pengajuan berhasil dikirim.");
      setOpen(false);
      setType("izin");
      setStartDate("");
      setEndDate("");
      setReason("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["my-leaves", user.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengirim pengajuan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Izin & Cuti"
        description="Ajukan dan pantau status pengajuan Anda."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Ajukan
          </Button>
        }
      />

      {leaves.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground shadow-card">
          Belum ada pengajuan izin atau cuti.
        </Card>
      ) : (
        <div className="space-y-3">
          {leaves.map((l) => (
            <Card key={l.id} className="p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium capitalize">{l.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateShort(l.start_date)} — {formatDateShort(l.end_date)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={l.status} />
              </div>
              {l.reason && <p className="mt-2 text-sm text-muted-foreground">{l.reason}</p>}
              {l.attachment_url && (
                <a
                  href={l.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Paperclip className="h-3 w-3" /> Lihat lampiran
                </a>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajukan Izin / Cuti</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Jenis</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="izin">Izin</SelectItem>
                  <SelectItem value="sakit">Sakit</SelectItem>
                  <SelectItem value="cuti">Cuti</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Selesai</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Alasan pengajuan…"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Lampiran (opsional)</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Batal
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kirim Pengajuan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
