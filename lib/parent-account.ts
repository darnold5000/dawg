import {
  createTrainingServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { normalizeEmail } from "@/lib/billing/verified-checkout-email";
import { normalizePhone, phonesMatch } from "@/lib/normalize-phone";

export { normalizeEmail };

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

export type FindOrCreateParentResult =
  | { ok: true; parent: ParentRow; matchedBy: "email" | "phone" | "both" }
  | {
      ok: false;
      code: "INVALID_EMAIL" | "INVALID_PHONE" | "CONTACT_MISMATCH" | "CREATE_FAILED";
      error: string;
    };

export async function getParentById(
  parentId: string,
): Promise<ParentRow | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const supabase = createTrainingServiceClient();
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

  const supabase = createTrainingServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.parents)
    .select(
      "id, first_name, last_name, email, phone, account_claimed_at, account_invite_sent_at",
    )
    .ilike("email", normalized)
    .order("created_at", { ascending: true })
    .limit(1);
  const row = Array.isArray(data) ? data[0] : data;
  return (row as ParentRow) ?? null;
}

async function findParentsByPhoneSuffix(
  phoneNorm: string,
): Promise<ParentRow[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }
  if (phoneNorm.length < 10) return [];

  const supabase = createTrainingServiceClient();
  const suffix = phoneNorm.slice(-10);
  const { data } = await supabase
    .from(DAWG_TABLES.parents)
    .select(
      "id, first_name, last_name, email, phone, account_claimed_at, account_invite_sent_at",
    )
    .ilike("phone", `%${suffix}%`);

  const rows = (data as ParentRow[]) ?? [];
  return rows.filter((row) => phonesMatch(row.phone, phoneNorm));
}

export async function findParentByPhone(
  phone: string,
): Promise<ParentRow | null> {
  const phoneNorm = normalizePhone(phone);
  const matches = await findParentsByPhoneSuffix(phoneNorm);
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  // Multiple rows share this phone — prefer exact normalized match
  const exact = matches.filter((m) => normalizePhone(m.phone) === phoneNorm);
  return exact[0] ?? matches[0];
}

export async function isParentAccountClaimed(parentId: string): Promise<boolean> {
  const parent = await getParentById(parentId);
  if (!parent) return false;
  return Boolean(parent.account_claimed_at);
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
  const supabase = createTrainingServiceClient();
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
  const supabase = createTrainingServiceClient();
  await supabase
    .from(DAWG_TABLES.parents)
    .update({
      account_invite_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parentId);
}

/**
 * Resolve a family/client row by email and phone together.
 * - Same email → same parent (update name/phone).
 * - Same phone (even different email) → same parent (keeps stored email; avoids duplicate packages).
 * - Email matches one parent and phone another → reject (CONTACT_MISMATCH).
 */
export async function findOrCreateParentByContact(
  input: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    /** Public checkout/booking always requires phone; magic-link login may omit. */
    requirePhone?: boolean;
  },
): Promise<FindOrCreateParentResult> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: false,
      code: "CREATE_FAILED",
      error: "Database not configured",
    };
  }

  const email = normalizeEmail(input.email);
  if (!email) {
    return {
      ok: false,
      code: "INVALID_EMAIL",
      error: "Enter a valid email address.",
    };
  }

  const phoneNorm = normalizePhone(input.phone.trim());
  const hasPhone = phoneNorm.length >= 10;
  const requirePhone = input.requirePhone ?? true;

  const byEmail = await getParentByEmail(email);
  const byPhone = hasPhone ? await findParentByPhone(input.phone) : null;

  if (requirePhone && !hasPhone && !byEmail && !byPhone) {
    return {
      ok: false,
      code: "INVALID_PHONE",
      error: "Enter a valid phone number.",
    };
  }

  if (byEmail && byPhone && byEmail.id !== byPhone.id) {
    console.warn(
      "[parent-account] email and phone matched different parents; using email match",
      { emailParent: byEmail.id, phoneParent: byPhone.id },
    );
  }

  const supabase = createTrainingServiceClient();
  const existing = byEmail ?? byPhone;

  if (existing) {
    await supabase
      .from(DAWG_TABLES.parents)
      .update({
        first_name: input.firstName.trim() || existing.first_name,
        last_name: input.lastName.trim() || existing.last_name,
        phone: input.phone.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    const refreshed = await getParentById(existing.id);
    return {
      ok: true,
      parent: refreshed ?? existing,
      matchedBy: byEmail && byPhone ? "both" : byEmail ? "email" : "phone",
    };
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
    return {
      ok: false,
      code: "CREATE_FAILED",
      error: "Could not save parent information.",
    };
  }
  return { ok: true, parent: data as ParentRow, matchedBy: "email" };
}

/** @deprecated Prefer findOrCreateParentByContact for explicit errors. */
export async function findOrCreateParentByEmail(input: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  requirePhone?: boolean;
}): Promise<ParentRow | null> {
  const result = await findOrCreateParentByContact(input);
  if (!result.ok) {
    console.error("[parent-account] findOrCreateParentByEmail", result.code, result.error);
    return null;
  }
  return result.parent;
}

export async function reassignPackagePurchaseParent(
  purchaseId: string,
  parentId: string,
): Promise<void> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }
  const supabase = createTrainingServiceClient();
  await supabase
    .from(DAWG_TABLES.packagePurchases)
    .update({
      guardian_id: parentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", purchaseId);
}
