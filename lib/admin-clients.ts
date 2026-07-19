import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { athleteAgeFromDob } from "@/lib/format";
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
    const [{ data: parents }, { data: athletes }, { data: bookings }] =
      await Promise.all([
        supabase
          .from(DAWG_TABLES.parents)
          .select("*")
          .order("last_name", { ascending: true })
          .order("first_name", { ascending: true }),
        supabase.from(DAWG_TABLES.athletes).select("*"),
        supabase
          .from(DAWG_TABLES.bookings)
          .select("parent_id, booked_at, status")
          .in("status", ["pending", "confirmed", "attended", "waitlisted"]),
      ]);

    const athletesByParent = new Map<string, ClientAthleteSummary[]>();
    for (const raw of (athletes ?? []) as Athlete[]) {
      const list = athletesByParent.get(raw.parent_id) ?? [];
      list.push(mapAthlete(raw));
      athletesByParent.set(raw.parent_id, list);
    }

    const bookingStats = new Map<
      string,
      { count: number; lastBookedAt: string | null }
    >();
    for (const row of bookings ?? []) {
      const prev = bookingStats.get(row.parent_id) ?? {
        count: 0,
        lastBookedAt: null,
      };
      prev.count += 1;
      if (
        row.booked_at &&
        (!prev.lastBookedAt || row.booked_at > prev.lastBookedAt)
      ) {
        prev.lastBookedAt = row.booked_at;
      }
      bookingStats.set(row.parent_id, prev);
    }

    return ((parents ?? []) as Parent[]).map((parent) => {
      const stats = bookingStats.get(parent.id);
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

    const [{ data: athletes }, { data: bookings }] = await Promise.all([
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
    ]);

    const mappedAthletes = ((athletes ?? []) as Athlete[]).map(mapAthlete);
    const bookingRows =
      (bookings as ClientFamilyDetail["bookings"] | null) ?? [];

    return {
      parent: parent as Parent,
      athletes: mappedAthletes,
      bookingCount: bookingRows.length,
      lastBookedAt: bookingRows[0]?.booked_at ?? null,
      bookings: bookingRows,
    };
  } catch {
    return null;
  }
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
          escape(family.lastBookedAt),
        ].join(","),
      );
    }
  }

  return rows.join("\n");
}
