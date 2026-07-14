import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import type { Profile } from "@/lib/types/database";
import { isAdminRole, isOwnerRole, isStaffRole } from "@/lib/roles";

export async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured()) {
    return {
      id: "demo-owner",
      full_name: "Demo Owner",
      email: "demo@dawg.local",
      phone: null,
      role: "owner",
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from(DAWG_TABLES.profiles)
    .select("*")
    .eq("id", user.id)
    .eq("active", true)
    .single();

  return (data as Profile) ?? null;
}

export async function requireStaff(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || !isStaffRole(profile.role)) {
    redirect("/admin/login");
  }
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || !isAdminRole(profile.role)) {
    redirect("/admin");
  }
  return profile;
}

export async function requireOwner(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || !isOwnerRole(profile.role)) {
    redirect("/admin");
  }
  return profile;
}

export async function requireStaffApi(): Promise<Profile | NextResponse> {
  const profile = await getCurrentProfile();
  if (!profile || !isStaffRole(profile.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return profile;
}

export async function requireAdminApi(): Promise<Profile | NextResponse> {
  const profile = await getCurrentProfile();
  if (!profile || !isAdminRole(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return profile;
}
