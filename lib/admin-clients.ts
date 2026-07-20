import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { athleteAgeFromDob } from "@/lib/format";
import { normalizeEmail } from "@/lib/billing/verified-checkout-email";
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

export async function getClientFamilies(): Promise<ClientFamily[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }

  try {
    const supabase = createServiceClient();
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
          .select("parent_id, booked_at, status, session:dawg_sessions ( session_date )")
          .in("status", ["pending", "confirmed", "attended", "waitlisted"]),
        supabase
          .from(DAWG_TABLES.packagePurchases)
          .select(
            "parent_id, sessions_remaining, status, package:dawg_packages ( name )",
          )
          .eq("status", "paid"),
      ]);

    const athletesByParent = new Map<string, ClientAthleteSummary[]>();
    for (const raw of (athletes ?? []) as Athlete[]) {
      const list = athletesByParent.get(raw.parent_id) ?? [];
      list.push(mapAthlete(raw));
      athletesByParent.set(raw.parent_id, list);
    }

    const bookingStats = new Map<
      string,
      { count: number; lastBookedAt: string | null; lastSessionDate: string | null }
    >();
    for (const row of bookings ?? []) {
      const prev = bookingStats.get(row.parent_id) ?? {
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
      bookingStats.set(row.parent_id, prev);
    }

    const packageStats = new Map<
      string,
      { sessionsRemaining: number; names: string[] }
    >();
    for (const row of purchases ?? []) {
      if (!row.parent_id) continue;
      const prev = packageStats.get(row.parent_id) ?? {
        sessionsRemaining: 0,
        names: [],
      };
      const remaining = Number(row.sessions_remaining) || 0;
      prev.sessionsRemaining += remaining;
      const name = (row.package as { name?: string } | null)?.name;
      if (name && remaining > 0 && !prev.names.includes(name)) {
        prev.names.push(name);
      }
      packageStats.set(row.parent_id, prev);
    }

    return ((parents ?? []) as Parent[]).map((parent) => {
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
    const supabase = createServiceClient();
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
        .eq("parent_id", parentId)
        .order("first_name", { ascending: true }),
      supabase
        .from(DAWG_TABLES.bookings)
        .select(
          `
          *,
          session:dawg_sessions ( id, title, session_date, start_time ),
          athlete:dawg_athletes ( first_name, last_name )
        `,
        )
        .eq("parent_id", parentId)
        .order("booked_at", { ascending: false })
        .limit(50),
      supabase
        .from(DAWG_TABLES.packagePurchases)
        .select(
          "sessions_remaining, status, package:dawg_packages ( name )",
        )
        .eq("parent_id", parentId)
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

    let lastSessionDate: string | null = null;
    for (const row of bookingRows) {
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
      bookingCount: bookingRows.length,
      lastBookedAt: bookingRows[0]?.booked_at ?? null,
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

  const supabase = createServiceClient();
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
        parent_id: parent.id,
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
