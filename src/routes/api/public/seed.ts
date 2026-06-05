import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// One-time seeding endpoint. Idempotent: re-running won't duplicate users.
// Call: GET /api/public/seed
export const Route = createFileRoute("/api/public/seed")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const result = await seed();
          return Response.json({ ok: true, ...result });
        } catch (e) {
          return Response.json(
            { ok: false, error: e instanceof Error ? e.message : String(e) },
            { status: 500 },
          );
        }
      },
    },
  },
});

const OFFICE = { name: "Kantor Pusat — Jakarta", lat: -6.175392, lng: 106.827153, radius: 100 };

async function ensureUser(email: string, password: string, fullName: string) {
  // Try to find existing user by listing (small dataset)
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users.find((u) => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  return data.user!.id;
}

async function seed() {
  // Office location
  const { data: offices } = await supabaseAdmin.from("office_locations").select("id").limit(1);
  if (!offices || offices.length === 0) {
    await supabaseAdmin.from("office_locations").insert({
      name: OFFICE.name,
      latitude: OFFICE.lat,
      longitude: OFFICE.lng,
      radius_meters: OFFICE.radius,
    });
  }

  // Settings
  await supabaseAdmin
    .from("settings")
    .upsert({ key: "company", value: { name: "PT Maju Bersama", work_start: "08:00" } });

  const admins = [
    { email: "admin@absensi.test", name: "Admin Utama", nik: "ADM001", pos: "HR Manager", div: "HRD" },
    { email: "admin2@absensi.test", name: "Admin Kedua", nik: "ADM002", pos: "Operasional", div: "Operasional" },
  ];
  const employees = [
    { email: "budi@absensi.test", name: "Budi Santoso", nik: "EMP101", pos: "Staff IT", div: "Teknologi", phone: "081200000001" },
    { email: "siti@absensi.test", name: "Siti Aminah", nik: "EMP102", pos: "Akuntan", div: "Keuangan", phone: "081200000002" },
    { email: "agus@absensi.test", name: "Agus Wijaya", nik: "EMP103", pos: "Marketing", div: "Pemasaran", phone: "081200000003" },
    { email: "dewi@absensi.test", name: "Dewi Lestari", nik: "EMP104", pos: "Desainer", div: "Kreatif", phone: "081200000004" },
    { email: "rudi@absensi.test", name: "Rudi Hartono", nik: "EMP105", pos: "Sales", div: "Pemasaran", phone: "081200000005" },
  ];

  const created: string[] = [];

  for (const a of admins) {
    const uid = await ensureUser(a.email, "Admin#123", a.name);
    await supabaseAdmin.from("user_roles").upsert({ user_id: uid, role: "admin" }, { onConflict: "user_id,role" });
    await supabaseAdmin
      .from("employees")
      .upsert(
        { user_id: uid, nik: a.nik, full_name: a.name, position: a.pos, division: a.div, email: a.email, is_active: true },
        { onConflict: "user_id" },
      );
    created.push(a.email);
  }

  const empRows: { id: string; user_id: string }[] = [];
  for (const e of employees) {
    const uid = await ensureUser(e.email, "Karyawan#123", e.name);
    await supabaseAdmin.from("user_roles").upsert({ user_id: uid, role: "karyawan" }, { onConflict: "user_id,role" });
    const { data: emp } = await supabaseAdmin
      .from("employees")
      .upsert(
        { user_id: uid, nik: e.nik, full_name: e.name, position: e.pos, division: e.div, phone: e.phone, email: e.email, is_active: true },
        { onConflict: "user_id" },
      )
      .select("id, user_id")
      .single();
    if (emp && emp.user_id) empRows.push({ id: emp.id, user_id: emp.user_id });
    created.push(e.email);
  }

  // Attendance for the last 7 days
  const statuses = ["hadir", "hadir", "hadir", "terlambat", "hadir"];
  for (let d = 1; d <= 7; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().slice(0, 10);
    for (let i = 0; i < empRows.length; i++) {
      const emp = empRows[i];
      // skip some to create variety
      if (d === 3 && i === 1) continue;
      const late = (d + i) % 5 === 0;
      const inH = late ? 8 : 7;
      const inM = late ? 25 : 45 + (i % 10);
      const checkIn = new Date(`${dateStr}T${String(inH).padStart(2, "0")}:${String(inM).padStart(2, "0")}:00Z`);
      const checkOut = new Date(`${dateStr}T17:${String(5 + i).padStart(2, "0")}:00Z`);
      const dist = 10 + ((d * 7 + i * 3) % 80);
      await supabaseAdmin.from("attendance").upsert(
        {
          employee_id: emp.id,
          user_id: emp.user_id,
          date: dateStr,
          check_in_at: checkIn.toISOString(),
          check_in_lat: OFFICE.lat + (Math.random() - 0.5) * 0.0006,
          check_in_lng: OFFICE.lng + (Math.random() - 0.5) * 0.0006,
          check_in_distance: dist,
          check_in_address: "Jl. Medan Merdeka, Jakarta Pusat",
          check_in_device: "Android 13 — Chrome Mobile",
          check_out_at: checkOut.toISOString(),
          check_out_lat: OFFICE.lat + (Math.random() - 0.5) * 0.0006,
          check_out_lng: OFFICE.lng + (Math.random() - 0.5) * 0.0006,
          check_out_distance: dist + 5,
          check_out_address: "Jl. Medan Merdeka, Jakarta Pusat",
          check_out_device: "Android 13 — Chrome Mobile",
          status: late ? "terlambat" : statuses[i % statuses.length],
        },
        { onConflict: "user_id,date" },
      );
    }
  }

  // Leave requests
  if (empRows.length >= 3) {
    const today = new Date().toISOString().slice(0, 10);
    const next = new Date();
    next.setDate(next.getDate() + 2);
    const nextStr = next.toISOString().slice(0, 10);
    const { data: existingLeaves } = await supabaseAdmin.from("leave_requests").select("id").limit(1);
    if (!existingLeaves || existingLeaves.length === 0) {
      await supabaseAdmin.from("leave_requests").insert([
        { employee_id: empRows[0].id, user_id: empRows[0].user_id, type: "izin", start_date: today, end_date: today, reason: "Keperluan keluarga", status: "menunggu" },
        { employee_id: empRows[1].id, user_id: empRows[1].user_id, type: "cuti", start_date: today, end_date: nextStr, reason: "Cuti tahunan", status: "disetujui" },
        { employee_id: empRows[2].id, user_id: empRows[2].user_id, type: "sakit", start_date: today, end_date: today, reason: "Demam", status: "ditolak" },
      ]);
    }
  }

  return { users: created, office: OFFICE.name };
}
