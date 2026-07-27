import { createAuthLinkService } from "@/lib/signalworks/auth-recovery";
import { adminPasswordResetRedirectUrl } from "@/lib/auth/admin-password-reset";
import { sendStaffInviteEmail } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { trainingDbOrNull } from "@/lib/supabase/training-service";
import type { UserRole } from "@/lib/types/database";

export type StaffMemberRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const STAFF_SELECT =
  "user_id, full_name, email, phone, role, active, created_at, updated_at";

const INVITABLE_ROLES = ["admin", "trainer"] as const;
export type InvitableStaffRole = (typeof INVITABLE_ROLES)[number];

export function isInvitableStaffRole(role: string): role is InvitableStaffRole {
  return (INVITABLE_ROLES as readonly string[]).includes(role);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isUserAlreadyRegisteredError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("already been registered") ||
    m.includes("already registered") ||
    m.includes("user already exists")
  );
}

async function findAuthUserIdByEmail(
  email: string,
): Promise<string | null> {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("email", normalizeEmail(email))
    .maybeSingle();
  if (error) {
    console.error("[admin-staff] profiles lookup", error.message);
    return null;
  }
  return (data?.id as string | undefined) ?? null;
}

async function upsertStaffProfile(params: {
  tenantId: string;
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: InvitableStaffRole | UserRole;
  active: boolean;
}): Promise<StaffMemberRow> {
  const db = trainingDbOrNull();
  if (!db) {
    throw new Error("TRAINING_TENANT_ID is not configured");
  }

  const { data, error } = await db.client
    .from(DAWG_TABLES.profiles)
    .upsert(
      {
        tenant_id: db.tenantId,
        user_id: params.userId,
        email: normalizeEmail(params.email),
        full_name: params.fullName.trim(),
        phone: params.phone?.trim() || null,
        role: params.role,
        active: params.active,
      },
      { onConflict: "tenant_id,user_id" },
    )
    .select(STAFF_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not save staff profile");
  }

  return data as StaffMemberRow;
}

export async function listStaffMembers(): Promise<StaffMemberRow[]> {
  const db = trainingDbOrNull();
  if (!db) return [];

  const { data, error } = await db.client
    .from(DAWG_TABLES.profiles)
    .select(STAFF_SELECT)
    .eq("tenant_id", db.tenantId)
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as StaffMemberRow[];
}

export async function inviteStaffMember(input: {
  email: string;
  fullName: string;
  role: InvitableStaffRole;
  phone?: string | null;
}): Promise<{ staff: StaffMemberRow; delivery: "supabase_invite" | "resend_invite" }> {
  const db = trainingDbOrNull();
  if (!db) {
    throw new Error("TRAINING_TENANT_ID is not configured");
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to invite staff");
  }

  const email = normalizeEmail(input.email);
  const fullName = input.fullName.trim();
  const redirectTo = adminPasswordResetRedirectUrl();
  const admin = createServiceClient();

  const { data: inviteData, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { full_name: fullName },
    });

  if (!inviteError && inviteData.user?.id) {
    const staff = await upsertStaffProfile({
      tenantId: db.tenantId,
      userId: inviteData.user.id,
      email,
      fullName,
      phone: input.phone ?? null,
      role: input.role,
      active: true,
    });
    return { staff, delivery: "supabase_invite" };
  }

  if (
    inviteError &&
    !isUserAlreadyRegisteredError(inviteError.message ?? "")
  ) {
    throw new Error(inviteError.message);
  }

  let userId = await findAuthUserIdByEmail(email);

  const links = createAuthLinkService(admin);
  const link = await links.createInviteLink({
    email,
    redirectTo,
    userMetadata: { full_name: fullName },
  });
  userId = userId ?? link.userId;
  if (!userId) {
    throw new Error("Could not resolve user for this email");
  }

  const staff = await upsertStaffProfile({
    tenantId: db.tenantId,
    userId,
    email,
    fullName,
    phone: input.phone ?? null,
    role: input.role,
    active: true,
  });

  await sendStaffInviteEmail({
    email,
    fullName,
    actionLink: link.actionLink,
  });

  return { staff, delivery: "resend_invite" };
}

export async function updateStaffMember(input: {
  userId: string;
  fullName?: string;
  phone?: string | null;
  role?: InvitableStaffRole;
  actorUserId: string;
}): Promise<StaffMemberRow> {
  const db = trainingDbOrNull();
  if (!db) {
    throw new Error("TRAINING_TENANT_ID is not configured");
  }

  const { data: existing, error: loadError } = await db.client
    .from(DAWG_TABLES.profiles)
    .select(STAFF_SELECT)
    .eq("tenant_id", db.tenantId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (loadError || !existing) {
    throw new Error(loadError?.message ?? "Staff member not found");
  }

  const row = existing as StaffMemberRow;
  if (row.role === "owner") {
    throw new Error("Owner accounts cannot be edited here");
  }

  if (input.role && !isInvitableStaffRole(input.role)) {
    throw new Error("Invalid role");
  }

  const patch: Record<string, unknown> = {};
  if (input.fullName !== undefined) patch.full_name = input.fullName.trim();
  if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
  if (input.role !== undefined) patch.role = input.role;

  const { data, error } = await db.client
    .from(DAWG_TABLES.profiles)
    .update(patch)
    .eq("tenant_id", db.tenantId)
    .eq("user_id", input.userId)
    .select(STAFF_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not update staff");
  }

  return data as StaffMemberRow;
}

export async function revokeStaffMember(input: {
  userId: string;
  actorUserId: string;
}): Promise<void> {
  if (input.userId === input.actorUserId) {
    throw new Error("You cannot revoke your own access");
  }

  const db = trainingDbOrNull();
  if (!db) {
    throw new Error("TRAINING_TENANT_ID is not configured");
  }

  const { data: existing, error: loadError } = await db.client
    .from(DAWG_TABLES.profiles)
    .select("role, active")
    .eq("tenant_id", db.tenantId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (loadError || !existing) {
    throw new Error(loadError?.message ?? "Staff member not found");
  }

  if ((existing as { role: string }).role === "owner") {
    throw new Error("Owner access cannot be revoked");
  }

  const { error } = await db.client
    .from(DAWG_TABLES.profiles)
    .update({ active: false })
    .eq("tenant_id", db.tenantId)
    .eq("user_id", input.userId);

  if (error) {
    throw new Error(error.message);
  }
}
