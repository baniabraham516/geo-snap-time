import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPinned, Loader2, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Masuk — ABSENSI GPS" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, session, role, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [forgot, setForgot] = useState(false);

  useEffect(() => {
    const saved = typeof localStorage !== "undefined" && localStorage.getItem("absensi-email");
    if (saved) setEmail(saved);
  }, []);

  useEffect(() => {
    if (!loading && session && role) {
      navigate({ to: role === "admin" ? "/admin" : "/dashboard" });
    }
  }, [loading, session, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Email dan password wajib diisi.");
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      toast.error("Login gagal: email atau password salah.");
      return;
    }
    if (remember) localStorage.setItem("absensi-email", email.trim());
    else localStorage.removeItem("absensi-email");
    toast.success("Berhasil masuk!");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Masukkan email terlebih dahulu.");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Tautan reset password telah dikirim ke email Anda.");
      setForgot(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-primary-foreground shadow-soft">
            <MapPinned className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold">ABSENSI GPS</span>
        </Link>

        <Card className="p-6 shadow-soft md:p-8">
          <h1 className="text-xl font-bold">{forgot ? "Reset Password" : "Selamat Datang"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {forgot
              ? "Masukkan email untuk menerima tautan reset password."
              : "Masuk untuk melakukan absensi dan melihat data Anda."}
          </p>

          <form onSubmit={forgot ? handleReset : handleLogin} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@perusahaan.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  autoComplete="email"
                />
              </div>
            </div>

            {!forgot && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    autoComplete="current-password"
                  />
                </div>
              </div>
            )}

            {!forgot && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={remember}
                    onCheckedChange={(v) => setRemember(Boolean(v))}
                  />
                  Ingat saya
                </label>
                <button
                  type="button"
                  onClick={() => setForgot(true)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Lupa password?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {forgot ? "Kirim Tautan Reset" : "Masuk"}
            </Button>

            {forgot && (
              <button
                type="button"
                onClick={() => setForgot(false)}
                className="w-full text-center text-sm text-muted-foreground hover:underline"
              >
                Kembali ke login
              </button>
            )}
          </form>

          {!forgot && (
            <div className="mt-6 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Akun demo:</p>
              <p>Admin: admin@absensi.test / Admin#123</p>
              <p>Karyawan: budi@absensi.test / Karyawan#123</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
