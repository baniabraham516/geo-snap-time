import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const createSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(72),
  full_name: z.string().min(1).max(120),
  nik: z.string().max(50).optional().nullable(),
  position: z.string().max(120).optional().nullable(),
  division: z.string().max(120).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  role: z.enum(["admin", "karyawan"]).default("karyawan"),
});

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Akses ditolak: hanya admin.");
}

export const createEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Gagal membuat akun.");
    const uid = created.user.id;

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: uid, role: data.role }, { onConflict: "user_id,role" });
    if (roleErr) throw new Error(roleErr.message);

    const { error: empErr } = await supabaseAdmin.from("employees").upsert(
      {
        user_id: uid,
        full_name: data.full_name,
        nik: data.nik ?? null,
        position: data.position ?? null,
        division: data.division ?? null,
        phone: data.phone ?? null,
        email: data.email,
        is_active: true,
      },
      { onConflict: "user_id" },
    );
    if (empErr) throw new Error(empErr.message);

    return { ok: true, user_id: uid };
  });

const deleteSchema = z.object({ user_id: z.string().uuid() });

export const deleteEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deleteSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("Tidak dapat menghapus akun sendiri.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
