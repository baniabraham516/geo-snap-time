import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "@/lib/format";

export interface OfficeLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
}

export interface AttendanceRow {
  id: string;
  employee_id: string;
  user_id: string;
  date: string;
  check_in_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_in_distance: number | null;
  check_in_photo_url: string | null;
  check_in_address: string | null;
  check_in_device: string | null;
  check_out_at: string | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  check_out_distance: number | null;
  check_out_photo_url: string | null;
  check_out_address: string | null;
  check_out_device: string | null;
  status: string;
}

export interface LeaveRow {
  id: string;
  employee_id: string;
  user_id: string;
  type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  attachment_url: string | null;
  status: string;
  reviewed_at: string | null;
  created_at: string;
}

export async function fetchOffice(): Promise<OfficeLocation | null> {
  const { data } = await supabase
    .from("office_locations")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as OfficeLocation) ?? null;
}

export async function fetchTodayAttendance(userId: string): Promise<AttendanceRow | null> {
  const { data } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .eq("date", todayISO())
    .maybeSingle();
  return (data as AttendanceRow) ?? null;
}

export async function fetchMyAttendance(userId: string): Promise<AttendanceRow[]> {
  const { data } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  return (data as AttendanceRow[]) ?? [];
}

export async function fetchMyLeaves(userId: string): Promise<LeaveRow[]> {
  const { data } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data as LeaveRow[]) ?? [];
}
