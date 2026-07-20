import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { loadRememberedFamily } from "@/lib/family-device";
import type {
  Athlete,
  PackagePurchaseWithPackage,
} from "@/lib/types/database";

export type FamilyRedemption = {
  id: string;
  redeemedAt: string;
  packageName: string;
  athleteName: string;
  sessionTitle: string;
  sessionDate: string;
  startTime: string;
  confirmationNumber: string;
};

export type FamilyPortalData = {
  parent: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  athletes: Athlete[];
  purchases: PackagePurchaseWithPackage[];
  redemptions: FamilyRedemption[];
  totalCreditsRemaining: number;
};

export async function getAuthenticatedFamily(): Promise<FamilyPortalData | null> {
  const family = await loadRememberedFamily();
  if (!family) return null;
  return getFamilyPortalData(family.parentId);
}

export async function getFamilyPortalData(
  parentId: string,
): Promise<FamilyPortalData | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  const supabase = createServiceClient();

  const { data: parent } = await supabase
    .from(DAWG_TABLES.parents)
    .select("id, first_name, last_name, email, phone")
    .eq("id", parentId)
    .maybeSingle();

  if (!parent) return null;

  const [{ data: athletes }, { data: purchases }] = await Promise.all([
      supabase
        .from(DAWG_TABLES.athletes)
        .select("*")
        .eq("parent_id", parentId)
        .order("first_name", { ascending: true }),
      supabase
        .from(DAWG_TABLES.packagePurchases)
        .select(`*, package:dawg_packages (*)`)
        .eq("parent_id", parentId)
        .order("created_at", { ascending: false }),
    ]);

  const purchaseRows = (purchases as PackagePurchaseWithPackage[]) ?? [];
  const totalCreditsRemaining = purchaseRows
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.sessions_remaining, 0);

  const paidPurchaseIds = purchaseRows.map((p) => p.id);
  let redemptionRows: FamilyRedemption[] = [];

  if (paidPurchaseIds.length > 0) {
    const { data: redemptionData } = await supabase
      .from(DAWG_TABLES.packageRedemptions)
      .select(
        `
        id,
        redeemed_at,
        purchase_id,
        booking:dawg_bookings (
          confirmation_number,
          athlete:dawg_athletes ( first_name, last_name ),
          session:dawg_sessions ( title, session_date, start_time )
        )
      `,
      )
      .in("purchase_id", paidPurchaseIds)
      .order("redeemed_at", { ascending: false });

    const purchaseNameById = new Map(
      purchaseRows.map((p) => [p.id, p.package?.name ?? "Package"]),
    );

    redemptionRows = (redemptionData ?? [])
      .map((row) => {
        const booking = row.booking as {
          confirmation_number?: string;
          athlete?: { first_name?: string; last_name?: string } | null;
          session?: {
            title?: string;
            session_date?: string;
            start_time?: string;
          } | null;
        } | null;
        const athlete = booking?.athlete;
        const session = booking?.session;
        if (!session) return null;
        return {
          id: row.id as string,
          redeemedAt: row.redeemed_at as string,
          packageName:
            purchaseNameById.get(row.purchase_id as string) ?? "Package",
          athleteName: athlete
            ? `${athlete.first_name ?? ""} ${athlete.last_name ?? ""}`.trim()
            : "—",
          sessionTitle: session.title ?? "Session",
          sessionDate: session.session_date ?? "",
          startTime: session.start_time ?? "",
          confirmationNumber: booking?.confirmation_number ?? "",
        };
      })
      .filter((r): r is FamilyRedemption => r !== null);
  }

  return {
    parent: {
      id: parent.id,
      firstName: parent.first_name ?? "",
      lastName: parent.last_name ?? "",
      email: parent.email ?? "",
      phone: parent.phone ?? "",
    },
    athletes: (athletes as Athlete[]) ?? [],
    purchases: purchaseRows,
    redemptions: redemptionRows,
    totalCreditsRemaining,
  };
}
