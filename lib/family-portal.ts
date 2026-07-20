import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { getAuthenticatedParentId } from "@/lib/family-auth";
import { isParentAccountClaimed } from "@/lib/parent-account";
import type {
  Athlete,
  AttendanceStatus,
  BookingStatus,
  PackagePurchaseWithPackage,
  PaymentStatus,
} from "@/lib/types/database";

export type FamilyBooking = {
  id: string;
  confirmationNumber: string;
  status: BookingStatus;
  attendanceStatus: AttendanceStatus;
  paymentStatus: PaymentStatus;
  athleteName: string;
  sessionTitle: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  locationName: string | null;
  bookedAt: string;
  isUpcoming: boolean;
};

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
  upcomingBookings: FamilyBooking[];
  pastBookings: FamilyBooking[];
  redemptions: FamilyRedemption[];
  totalCreditsRemaining: number;
};

export async function getFamilyPortalForSession(): Promise<FamilyPortalData | null> {
  const parentId = await getAuthenticatedParentId();
  if (!parentId) return null;
  if (!(await isParentAccountClaimed(parentId))) return null;
  return getFamilyPortalData(parentId);
}

function sessionStartTimestamp(sessionDate: string, startTime: string): number {
  const time = startTime.slice(0, 5);
  return new Date(`${sessionDate}T${time}:00`).getTime();
}

function mapFamilyBooking(row: {
  id: string;
  confirmation_number: string;
  status: BookingStatus;
  attendance_status: AttendanceStatus;
  payment_status: PaymentStatus;
  booked_at: string;
  athlete?: { first_name?: string; last_name?: string } | null;
  session?: {
    title?: string;
    session_date?: string;
    start_time?: string;
    end_time?: string;
    location_name?: string | null;
  } | null;
}): FamilyBooking | null {
  const session = row.session;
  if (!session?.session_date || !session.start_time) return null;

  const athlete = row.athlete;
  const sessionDate = session.session_date;
  const startTime = session.start_time;
  const isUpcoming =
    sessionStartTimestamp(sessionDate, startTime) >= Date.now() &&
    row.attendance_status !== "cancelled" &&
    row.status !== "cancelled";

  return {
    id: row.id,
    confirmationNumber: row.confirmation_number,
    status: row.status,
    attendanceStatus: row.attendance_status,
    paymentStatus: row.payment_status,
    athleteName: athlete
      ? `${athlete.first_name ?? ""} ${athlete.last_name ?? ""}`.trim()
      : "—",
    sessionTitle: session.title ?? "Session",
    sessionDate,
    startTime,
    endTime: session.end_time ?? startTime,
    locationName: session.location_name ?? null,
    bookedAt: row.booked_at,
    isUpcoming,
  };
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

  const [{ data: athletes }, { data: purchases }, { data: bookingData }] =
    await Promise.all([
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
      supabase
        .from(DAWG_TABLES.bookings)
        .select(
          `
          id,
          confirmation_number,
          status,
          attendance_status,
          payment_status,
          booked_at,
          athlete:dawg_athletes ( first_name, last_name ),
          session:dawg_sessions (
            title,
            session_date,
            start_time,
            end_time,
            location_name
          )
        `,
        )
        .eq("parent_id", parentId)
        .neq("status", "cancelled")
        .neq("status", "expired")
        .order("booked_at", { ascending: false }),
    ]);

  const purchaseRows = (purchases as PackagePurchaseWithPackage[]) ?? [];
  const totalCreditsRemaining = purchaseRows
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.sessions_remaining, 0);

  const familyBookings = (bookingData ?? [])
    .map((row) =>
      mapFamilyBooking(
        row as Parameters<typeof mapFamilyBooking>[0],
      ),
    )
    .filter((booking): booking is FamilyBooking => booking !== null);

  const upcomingBookings = familyBookings
    .filter((booking) => booking.isUpcoming)
    .sort(
      (a, b) =>
        sessionStartTimestamp(a.sessionDate, a.startTime) -
        sessionStartTimestamp(b.sessionDate, b.startTime),
    );

  const pastBookings = familyBookings
    .filter((booking) => !booking.isUpcoming)
    .sort(
      (a, b) =>
        sessionStartTimestamp(b.sessionDate, b.startTime) -
        sessionStartTimestamp(a.sessionDate, a.startTime),
    )
    .slice(0, 12);

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
    upcomingBookings,
    pastBookings,
    redemptions: redemptionRows,
    totalCreditsRemaining,
  };
}
