import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { parentHasAnyIntake } from "@/lib/intake";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type ParentAccountStatus = "claimed" | "invited" | "new";

export type ParentRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  account_claimed_at: string | null;
  account_invite_sent_at: string | null;
};

export async function getParentById(
  parentId: string,
): Promise<ParentRow | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const supabase = createServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.parents)
    .select(
      "id, first_name, last_name, email, phone, account_claimed_at, account_invite_sent_at",
    )
    .eq("id", parentId)
    .maybeSingle();
  return (data as ParentRow) ?? null;
}

export async function getParentByEmail(
  email: string,
): Promise<ParentRow | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.parents)
    .select(
      "id, first_name, last_name, email, phone, account_claimed_at, account_invite_sent_at",
    )
    .ilike("email", normalized)
    .maybeSingle();
  return (data as ParentRow) ?? null;
}

export async function isParentAccountClaimed(parentId: string): Promise<boolean> {
  const parent = await getParentById(parentId);
  if (!parent) return false;
  if (parent.account_claimed_at) return true;
  return parentHasAnyIntake(parentId);
}

export async function getParentAccountStatus(
  parentId: string,
): Promise<ParentAccountStatus> {
  const parent = await getParentById(parentId);
  if (!parent) return "new";
  if (await isParentAccountClaimed(parentId)) return "claimed";
  if (parent.account_invite_sent_at) return "invited";
  return "new";
}

export async function markParentAccountClaimed(parentId: string): Promise<void> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }
  const supabase = createServiceClient();
  await supabase
    .from(DAWG_TABLES.parents)
    .update({
      account_claimed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parentId)
    .is("account_claimed_at", null);
}

export async function markParentInviteSent(parentId: string): Promise<void> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }
  const supabase = createServiceClient();
  await supabase
    .from(DAWG_TABLES.parents)
    .update({
      account_invite_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parentId);
}

export async function findOrCreateParentByEmail(input: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}): Promise<ParentRow | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  const email = normalizeEmail(input.email);
  if (!email) return null;

  const supabase = createServiceClient();
  const existing = await getParentByEmail(email);
  if (existing) {
    await supabase
      .from(DAWG_TABLES.parents)
      .update({
        first_name: input.firstName.trim() || existing.first_name,
        last_name: input.lastName.trim() || existing.last_name,
        phone: input.phone.trim() || existing.phone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return (await getParentById(existing.id)) ?? existing;
  }

  const { data, error } = await supabase
    .from(DAWG_TABLES.parents)
    .insert({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      email,
      phone: input.phone.trim(),
    })
    .select(
      "id, first_name, last_name, email, phone, account_claimed_at, account_invite_sent_at",
    )
    .single();

  if (error || !data) {
    console.error("[parent-account] create parent", error);
    return null;
  }
  return data as ParentRow;
}

export async function reassignPackagePurchaseParent(
  purchaseId: string,
  parentId: string,
): Promise<void> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }
  const supabase = createServiceClient();
  await supabase
    .from(DAWG_TABLES.packagePurchases)
    .update({
      parent_id: parentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", purchaseId);
}
