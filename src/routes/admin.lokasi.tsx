import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, LocateFixed, MapPin, Save } from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { fetchOffice } from "@/lib/queries";
import { getCurrentPosition } from "@/lib/geo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/lokasi")({
  head: () => ({ meta: [{ title: "Lokasi Kantor — ABSENSI GPS" }] }),
  component: () => (
    <RoleGuard allow={["admin"]}>
      <AppLayout>
        <LokasiContent />
      </AppLayout>
    </RoleGuard>
  ),
});

function LokasiContent() {
  const qc = useQueryClient();
  const { data: office } = useQuery({ queryKey: ["office"], queryFn: fetchOffice });
  const [name, setName] = useState("Kantor Pusat");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState(100);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (office) {
      setName(office.name);
      setLat(String(office.latitude));
      setLng(String(office.longitude));
      setRadius(office.radius_meters);
    }
  }, [office]);

  async function useMyLocation() {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      setLat(pos.coords.latitude.toFixed(6));
      setLng(pos.coords.longitude.toFixed(6));
      toast.success("Lokasi saat ini diterapkan.");
    } catch {
      toast.error("Gagal mendapatkan lokasi.");
    } finally {
      setLocating(false);
    }
  }

  async function save() {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return toast.error("Latitude/Longitude tidak valid.");
    setSaving(true);
    try {
      if (office) {
        const { error } = await supabase
          .from("office_locations")
          .update({ name, latitude: latNum, longitude: lngNum, radius_meters: radius })
          .eq("id", office.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("office_locations")
          .insert({ name, latitude: latNum, longitude: lngNum, radius_meters: radius });
        if (error) throw error;
      }
      toast.success("Lokasi kantor disimpan.");
      qc.invalidateQueries({ queryKey: ["office"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  const mapSrc =
    lat && lng
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(lng) - 0.005}%2C${parseFloat(lat) - 0.004}%2C${parseFloat(lng) + 0.005}%2C${parseFloat(lat) + 0.004}&layer=mapnik&marker=${lat}%2C${lng}`
      : null;

  return (
    <>
      <PageHeader title="Lokasi Kantor" description="Atur titik kantor dan radius absensi (geofencing)." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="space-y-4 p-5 shadow-card">
          <div className="space-y-2">
            <Label>Nama Lokasi</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Latitude</Label>
              <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-6.175392" />
            </div>
            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="106.827153" />
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={useMyLocation} disabled={locating}>
            {locating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
            Gunakan Lokasi Saya
          </Button>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Radius Absensi</Label>
              <span className="text-sm font-semibold text-primary">{radius} meter</span>
            </div>
            <Slider value={[radius]} min={20} max={1000} step={10} onValueChange={(v) => setRadius(v[0])} />
          </div>
          <Button className="w-full" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Lokasi
          </Button>
        </Card>

        <Card className="overflow-hidden shadow-card">
          {mapSrc ? (
            <iframe title="Peta Kantor" src={mapSrc} className="h-full min-h-[320px] w-full border-0" />
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 text-muted-foreground">
              <MapPin className="h-8 w-8" />
              <p className="text-sm">Masukkan koordinat untuk melihat peta.</p>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
