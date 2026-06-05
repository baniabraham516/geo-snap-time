export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateShort(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  return `${formatDateShort(value)} ${formatTime(value)}`;
}

const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export function dayName(value: string | Date = new Date()): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return dayNames[d.getDay()];
}

// Status pukul 08:00 sebagai batas tepat waktu
export function lateThreshold(): { h: number; m: number } {
  return { h: 8, m: 0 };
}
