import {
  createTrainingServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { athleteAgeFromDob } from "@/lib/format";
import { normalizeEmail } from "@/lib/billing/verified-checkout-email";
import { parentIdFromRow, mapAthleteRow } from "@/lib/supabase/tenant-row-map";
import { isConfirmedRosterBooking } from "@/lib/booking-roster";
import type { Athlete, Booking, Parent } from "@/lib/types/database";

export type ClientAthleteSummary = Pick<
  Athlete,
  | "id"
  | "first_name"
  | "last_name"
  | "date_of_birth"
  | "primary_sport"
  | "experience_level"
  | "medical_notes"
> & {
  age: number | null;
};

export type ClientFamily = {
  parent: Parent;
  athletes: ClientAthleteSummary[];
  bookingCount: number;
  lastBookedAt: string | null;
  /** Total sessions remaining across paid packages. */
  sessionsRemaining: number;
  /** Active paid package names (e.g. "10 sessions, Single session"). */
  packageSummary: string | null;
  /** Most recent training session date (from roster). */
  lastSessionDate: string | null;
};

export type ClientFamilyDetail = ClientFamily & {
  bookings: Array<
    Booking & {
      session: {
        id: string;
        title: string;
        session_date: string;
        start_time: string;
      } | null;
      athlete: { first_name: string; last_name: string } | null;
    }
  >;
};

function mapAthlete(a: Athlete): ClientAthleteSummary {
  const dob = String(a.date_of_birth ?? "").slice(0, 10);
  return {
    id: a.id,
    first_name: a.first_name,
    last_name: a.last_name,
    date_of_birth: dob,
    primary_sport: a.primary_sport,
    experience_level: a.experience_level,
    medical_notes: a.medical_notes,
    age: dob ? athleteAgeFromDob(dob) : null,
  };
}

/** One row per email in admin list; sums credits/bookings across duplicate parent records. */
function dedupeFamiliesByEmail(families: ClientFamily[]): ClientFamily[] {
  const byEmail = new Map<string, ClientFamily>();

  for (const family of families) {
    const key = normalizeEmail(family.parent.email) || family.parent.id;
    const existing = byEmail.get(key);
    if (!existing) {
      byEmail.set(key, family);
      continue;
    }

    const keepCurrent =
      family.parent.created_at < existing.parent.created_at
        ? family
        : existing;
    const other = keepCurrent === family ? existing : family;

    const athleteIds = new Set(keepCurrent.athletes.map((a) => a.id));
    const mergedAthletes = [
      ...keepCurrent.athletes,
      ...other.athletes.filter((a) => !athleteIds.has(a.id)),
    ];
    mergedAthletes.sort((a, b) =>
      a.first_name.localeCompare(b.first_name, undefined, {
        sensitivity: "base",
      }),
    );

    const names = new Set<string>();
    for (const n of [
      keepCurrent.packageSummary,
      other.packageSummary,
    ].filter(Boolean) as string[]) {
      for (const part of n.split(",").map((s) => s.trim())) {
        if (part) names.add(part);
      }
    }

    const lastBookedAt =
      [keepCurrent.lastBookedAt, other.lastBookedAt]
        .filter(Boolean)
        .sort()
        .pop() ?? null;
    const lastSessionDate =
      [keepCurrent.lastSessionDate, other.lastSessionDate]
        .filter(Boolean)
        .sort()
        .pop() ?? null;

    byEmail.set(key, {
      parent: keepCurrent.parent,
      athletes: mergedAthletes,
      bookingCount: keepCurrent.bookingCount + other.bookingCount,
      lastBookedAt,
      sessionsRemaining:
        keepCurrent.sessionsRemaining + other.sessionsRemaining,
      packageSummary: names.size ? [...names].join(", ") : null,
      lastSessionDate,
    });
  }

  return [...byEmail.values()].sort((a, b) =>
    a.parent.last_name.localeCompare(b.parent.last_name, undefined, {
      sensitivity: "base",
    }),
  );
}

export async function getClientFamilies(): Promise<ClientFamily[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }

  try {
    const supabase = createTrainingServiceClient();
    const [{ data: parents }, { data: athletes }, { data: bookings }, { data: purchases }] =
      await Promise.all([
        supabase
          .from(DAWG_TABLES.parents)
          .select("*")
          .order("last_name", { ascending: true })
          .order("first_name", { ascending: true }),
        supabase.from(DAWG_TABLES.athletes).select("*"),
        supabase
          .from(DAWG_TABLES.bookings)
          .select(
            "guardian_id, booked_at, status, attendance_status, session:training_sessions ( session_date )",
          )
          .in("status", ["pending", "confirmed", "attended", "waitlisted"]),
        supabase
          .from(DAWG_TABLES.packagePurchases)
          .select(
            "guardian_id, sessions_remaining, status, package:training_packages ( name )",
          )
          .eq("status", "paid"),
      ]);

    const athletesByParent = new Map<string, ClientAthleteSummary[]>();
    for (const raw of (athletes ?? []) as Record<string, unknown>[]) {
      const athlete = mapAthleteRow(raw);
      const list = athletesByParent.get(athlete.parent_id) ?? [];
      list.push(mapAthlete(athlete));
      athletesByParent.set(athlete.parent_id, list);
    }

    const bookingStats = new Map<
      string,
      { count: number; lastBookedAt: string | null; lastSessionDate: string | null }
    >();
    for (const row of bookings ?? []) {
      const pid = parentIdFromRow(row as { guardian_id?: string });
      if (!pid) continue;
      if (
        !isConfirmedRosterBooking({
          status: row.status,
          attendance_status: row.attendance_status,
        })
      ) {
        continue;
      }
      const prev = bookingStats.get(pid) ?? {
        count: 0,
        lastBookedAt: null,
        lastSessionDate: null,
      };
      prev.count += 1;
      if (
        row.booked_at &&
        (!prev.lastBookedAt || row.booked_at > prev.lastBookedAt)
      ) {
        prev.lastBookedAt = row.booked_at;
      }
      const sessionDate = (row.session as { session_date?: string } | null)
        ?.session_date;
      if (
        sessionDate &&
        (!prev.lastSessionDate || sessionDate > prev.lastSessionDate)
      ) {
        prev.lastSessionDate = sessionDate;
      }
      bookingStats.set(pid, prev);
    }

    const packageStats = new Map<
      string,
      { sessionsRemaining: number; names: string[] }
    >();
    for (const row of purchases ?? []) {
      const pid = parentIdFromRow(row as { guardian_id?: string });
      if (!pid) continue;
      const prev = packageStats.get(pid) ?? {
        sessionsRemaining: 0,
        names: [],
      };
      const remaining = Number(row.sessions_remaining) || 0;
      prev.sessionsRemaining += remaining;
      const name = (row.package as { name?: string } | null)?.name;
      if (name && remaining > 0 && !prev.names.includes(name)) {
        prev.names.push(name);
      }
      packageStats.set(pid, prev);
    }

    const families = ((parents ?? []) as Parent[]).map((parent) => {
      const stats = bookingStats.get(parent.id);
      const pkg = packageStats.get(parent.id);
      const familyAthletes = athletesByParent.get(parent.id) ?? [];
      familyAthletes.sort((a, b) =>
        a.first_name.localeCompare(b.first_name, undefined, {
          sensitivity: "base",
        }),
      );
      return {
        parent,
        athletes: familyAthletes,
        bookingCount: stats?.count ?? 0,
        lastBookedAt: stats?.lastBookedAt ?? null,
        sessionsRemaining: pkg?.sessionsRemaining ?? 0,
        packageSummary: pkg?.names.length ? pkg.names.join(", ") : null,
        lastSessionDate: stats?.lastSessionDate ?? null,
      };
    });

    return dedupeFamiliesByEmail(families);
  } catch {
    return [];
  }
}

export async function getClientFamily(
  parentId: string,
): Promise<ClientFamilyDetail | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  try {
    const supabase = createTrainingServiceClient();
    const { data: parent } = await supabase
      .from(DAWG_TABLES.parents)
      .select("*")
      .eq("id", parentId)
      .maybeSingle();

    if (!parent) return null;

    const [{ data: athletes }, { data: bookings }, { data: purchases }] =
      await Promise.all([
      supabase
        .from(DAWG_TABLES.athletes)
        .select("*")
        .eq("guardian_id", parentId)
        .order("first_name", { ascending: true }),
      supabase
        .from(DAWG_TABLES.bookings)
        .select(
          `
          *,
          session:training_sessions ( id, title, session_date, start_time ),
          athlete:training_athletes ( first_name, last_name )
        `,
        )
        .eq("guardian_id", parentId)
        .order("booked_at", { ascending: false })
        .limit(50),
      supabase
        .from(DAWG_TABLES.packagePurchases)
        .select(
          "sessions_remaining, status, package:training_packages ( name )",
        )
        .eq("guardian_id", parentId)
        .eq("status", "paid"),
    ]);

    const mappedAthletes = ((athletes ?? []) as Athlete[]).map(mapAthlete);
    const bookingRows =
      (bookings as ClientFamilyDetail["bookings"] | null) ?? [];

    let sessionsRemaining = 0;
    const packageNames: string[] = [];
    for (const row of purchases ?? []) {
      const remaining = Number(row.sessions_remaining) || 0;
      sessionsRemaining += remaining;
      const name = (row.package as { name?: string } | null)?.name;
      if (name && remaining > 0 && !packageNames.includes(name)) {
        packageNames.push(name);
      }
    }

    const confirmedBookingRows = bookingRows.filter((row) =>
      isConfirmedRosterBooking({
        status: row.status,
        attendance_status: row.attendance_status,
      }),
    );

    let lastSessionDate: string | null = null;
    for (const row of confirmedBookingRows) {
      const sessionDate = row.session?.session_date;
      if (
        sessionDate &&
        (!lastSessionDate || sessionDate > lastSessionDate)
      ) {
        lastSessionDate = sessionDate;
      }
    }

    return {
      parent: parent as Parent,
      athletes: mappedAthletes,
      bookingCount: confirmedBookingRows.length,
      lastBookedAt: confirmedBookingRows[0]?.booked_at ?? null,
      sessionsRemaining,
      packageSummary: packageNames.length ? packageNames.join(", ") : null,
      lastSessionDate,
      bookings: bookingRows,
    };
  } catch {
    return null;
  }
}

export async function createClientFamily(input: {
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
  athleteFirstName?: string;
  athleteLastName?: string;
  athleteDob?: string;
}): Promise<
  | { ok: true; parentId: string; athleteId?: string }
  | { ok: false; error: string; code?: string }
> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Database unavailable", code: "NO_DB" };
  }

  const email = normalizeEmail(input.parentEmail);
  if (!email) {
    return { ok: false, error: "Enter a valid email address.", code: "INVALID_EMAIL" };
  }

  const supabase = createTrainingServiceClient();
  const { data: existing } = await supabase
    .from(DAWG_TABLES.parents)
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      error: "A client with this email already exists.",
      code: "DUPLICATE_EMAIL",
    };
  }

  const { data: parent, error: parentError } = await supabase
    .from(DAWG_TABLES.parents)
    .insert({
      first_name: input.parentFirstName.trim(),
      last_name: input.parentLastName.trim(),
      email,
      phone: input.parentPhone.trim(),
      account_claimed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (parentError || !parent) {
    return {
      ok: false,
      error: parentError?.message ?? "Could not create client.",
      code: "CREATE_FAILED",
    };
  }

  let athleteId: string | undefined;
  const athleteFirst = input.athleteFirstName?.trim();
  const athleteLast = input.athleteLastName?.trim();
  const athleteDob = input.athleteDob?.trim().slice(0, 10);

  if (athleteFirst && athleteLast && athleteDob) {
    const { data: athlete, error: athleteError } = await supabase
      .from(DAWG_TABLES.athletes)
      .insert({
        guardian_id: parent.id,
        first_name: athleteFirst,
        last_name: athleteLast,
        date_of_birth: athleteDob,
      })
      .select("id")
      .single();

    if (athleteError || !athlete) {
      return {
        ok: false,
        error: athleteError?.message ?? "Client created but athlete failed.",
        code: "ATHLETE_FAILED",
      };
    }
    athleteId = athlete.id;
  }

  return { ok: true, parentId: parent.id, athleteId };
}

export async function deleteClientFamily(
  parentId: string,
): Promise<
  | { ok: true; bookingCount: number; parentsRemoved: number }
  | { ok: false; error: string; code?: string }
> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true, bookingCount: 0, parentsRemoved: 0 };
  }

  const supabase = createTrainingServiceClient();

  const { data: anchor, error: anchorError } = await supabase
    .from(DAWG_TABLES.parents)
    .select("id, email")
    .eq("id", parentId)
    .maybeSingle();

  if (anchorError) {
    return {
      ok: false,
      error: anchorError.message,
      code: "DELETE_FAILED",
    };
  }

  if (!anchor) {
    return { ok: false, error: "Client not found.", code: "NOT_FOUND" };
  }

  const emailKey = normalizeEmail(String(anchor.email ?? ""));
  const { data: siblingRows, error: siblingError } = await supabase
    .from(DAWG_TABLES.parents)
    .select("id")
    .ilike("email", emailKey || String(anchor.email));

  if (siblingError) {
    return {
      ok: false,
      error: siblingError.message,
      code: "DELETE_FAILED",
    };
  }

  const parentIds = [
    ...new Set([
      parentId,
      ...((siblingRows ?? []) as { id: string }[]).map((r) => r.id),
    ]),
  ];

  const { data: bookingRows, error: bookingListError } = await supabase
    .from(DAWG_TABLES.bookings)
    .select("id")
    .in("guardian_id", parentIds);

  if (bookingListError) {
    return {
      ok: false,
      error: bookingListError.message,
      code: "DELETE_FAILED",
    };
  }

  const bookingIds = (bookingRows ?? []).map((row) => row.id as string);

  const { data: purchaseRows, error: purchaseListError } = await supabase
    .from(DAWG_TABLES.packagePurchases)
    .select("id")
    .in("guardian_id", parentIds);

  if (purchaseListError) {
    return {
      ok: false,
      error: purchaseListError.message,
      code: "DELETE_FAILED",
    };
  }

  const purchaseIds = (purchaseRows ?? []).map((row) => row.id as string);

  if (purchaseIds.length > 0) {
    const { error: redemptionByPurchaseError } = await supabase
      .from(DAWG_TABLES.packageRedemptions)
      .delete()
      .in("purchase_id", purchaseIds);

    if (redemptionByPurchaseError) {
      return {
        ok: false,
        error: redemptionByPurchaseError.message,
        code: "DELETE_FAILED",
      };
    }
  }

  if (bookingIds.length > 0) {
    const { error: redemptionByBookingError } = await supabase
      .from(DAWG_TABLES.packageRedemptions)
      .delete()
      .in("booking_id", bookingIds);

    if (redemptionByBookingError) {
      return {
        ok: false,
        error: redemptionByBookingError.message,
        code: "DELETE_FAILED",
      };
    }

    const { error: paymentTxError } = await supabase
      .from(DAWG_TABLES.paymentTransactions)
      .delete()
      .in("booking_id", bookingIds);

    if (paymentTxError) {
      return {
        ok: false,
        error: paymentTxError.message,
        code: "DELETE_FAILED",
      };
    }

    const { error: bookingError } = await supabase
      .from(DAWG_TABLES.bookings)
      .delete()
      .in("guardian_id", parentIds);

    if (bookingError) {
      return {
        ok: false,
        error: bookingError.message,
        code: "DELETE_FAILED",
      };
    }
  }

  const { error: purchaseError } = await supabase
    .from(DAWG_TABLES.packagePurchases)
    .delete()
    .in("guardian_id", parentIds);

  if (purchaseError) {
    return {
      ok: false,
      error: purchaseError.message,
      code: "DELETE_FAILED",
    };
  }

  const { error: guardianError } = await supabase
    .from(DAWG_TABLES.parents)
    .delete()
    .in("id", parentIds);

  if (guardianError) {
    return {
      ok: false,
      error: guardianError.message,
      code: "DELETE_FAILED",
    };
  }

  return {
    ok: true,
    bookingCount: bookingIds.length,
    parentsRemoved: parentIds.length,
  };
}

export function clientsToCsv(families: ClientFamily[]): string {
  const header = [
    "Parent first name",
    "Parent last name",
    "Email",
    "Phone",
    "Athlete first name",
    "Athlete last name",
    "DOB",
    "Age",
    "Primary sport",
    "Experience",
    "Medical notes",
    "Family booking count",
    "Package",
    "Sessions remaining",
    "Last session",
    "Last booked at",
  ];

  const escape = (value: string | number | null | undefined) => {
    const s = String(value ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const rows: string[] = [header.join(",")];

  for (const family of families) {
    const athletes =
      family.athletes.length > 0
        ? family.athletes
        : [
            {
              first_name: "",
              last_name: "",
              date_of_birth: "",
              age: null,
              primary_sport: null,
              experience_level: null,
              medical_notes: null,
            },
          ];

    for (const athlete of athletes) {
      rows.push(
        [
          escape(family.parent.first_name),
          escape(family.parent.last_name),
          escape(family.parent.email),
          escape(family.parent.phone),
          escape(athlete.first_name),
          escape(athlete.last_name),
          escape(athlete.date_of_birth),
          escape(athlete.age),
          escape(athlete.primary_sport),
          escape(athlete.experience_level),
          escape(athlete.medical_notes),
          escape(family.bookingCount),
          escape(family.packageSummary),
          escape(family.sessionsRemaining),
          escape(family.lastSessionDate),
          escape(family.lastBookedAt),
        ].join(","),
      );
    }
  }

  return rows.join("\n");
}
