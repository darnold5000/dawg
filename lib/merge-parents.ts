import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";

export type MergeParentsResult =
  | {
      ok: true;
      canonicalId: string;
      duplicateId: string;
      movedAthletes: number;
      movedBookings: number;
      movedPurchases: number;
      movedIntakes: number;
      movedDevices: number;
    }
  | { ok: false; error: string; code?: string };

export async function mergeParents(input: {
  canonicalParentId: string;
  duplicateParentId: string;
}): Promise<MergeParentsResult> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Database unavailable", code: "NO_DB" };
  }

  if (input.canonicalParentId === input.duplicateParentId) {
    return {
      ok: false,
      error: "Choose two different parent records to merge.",
      code: "SAME_PARENT",
    };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("dawg_merge_parents", {
    p_canonical_id: input.canonicalParentId,
    p_duplicate_id: input.duplicateParentId,
  });

  if (error) {
    const message = error.message ?? "Merge failed";
    if (message.includes("CANONICAL_PARENT_NOT_FOUND")) {
      return { ok: false, error: "Canonical parent not found.", code: "NOT_FOUND" };
    }
    if (message.includes("DUPLICATE_PARENT_NOT_FOUND")) {
      return {
        ok: false,
        error: "Duplicate parent not found.",
        code: "NOT_FOUND",
      };
    }
    return { ok: false, error: message, code: "MERGE_FAILED" };
  }

  const row = (data ?? {}) as Record<string, number | string>;
  return {
    ok: true,
    canonicalId: String(row.canonical_id),
    duplicateId: String(row.duplicate_id),
    movedAthletes: Number(row.moved_athletes) || 0,
    movedBookings: Number(row.moved_bookings) || 0,
    movedPurchases: Number(row.moved_purchases) || 0,
    movedIntakes: Number(row.moved_intakes) || 0,
    movedDevices: Number(row.moved_devices) || 0,
  };
}
