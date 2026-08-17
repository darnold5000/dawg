import { format } from "date-fns";
import {
  createClient,
  createTrainingServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { getTrainingTenantIdOrNull } from "@/lib/tenant/deployment";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { COACH_AVERY } from "@/lib/content/coach-avery";
import { isPublicScheduleVisibility } from "@/lib/training-visibility";
import {
  FALLBACK_PROGRAMS,
  FALLBACK_REVIEWS,
  FALLBACK_SESSIONS,
  FALLBACK_SETTINGS,
  FALLBACK_TRAINERS,
  FALLBACK_SESSION_TYPES,
} from "@/lib/fallback-data";
import type {
  BusinessSettings,
  Program,
  Review,
  SessionType,
  SessionWithRelations,
  Trainer,
  TrainingSession,
} from "@/lib/types/database";
import { isActiveRosterBooking } from "@/lib/booking-roster";

function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

async function bookingCounts(
  sessionIds: string[],
): Promise<Record<string, number>> {
  if (!sessionIds.length || !isSupabaseConfigured()) return {};
  try {
    const supabase = createTrainingServiceClient();
    const { data } = await supabase
      .from(DAWG_TABLES.bookings)
      .select("session_id, status, booking_expires_at, attendance_status")
      .in("session_id", sessionIds)
      .in("status", ["pending", "confirmed"]);

    const now = Date.now();
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      if (
        !isActiveRosterBooking({
          status: row.status,
          attendance_status: row.attendance_status,
          booking_expires_at: row.booking_expires_at,
          nowMs: now,
        })
      ) {
        continue;
      }
      counts[row.session_id] = (counts[row.session_id] ?? 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}

function enrichSessions(
  sessions: TrainingSession[],
  extras: {
    programs: Program[];
    types: SessionType[];
    trainers: Trainer[];
    counts: Record<string, number>;
  },
): SessionWithRelations[] {
  return sessions.map((session) => {
    const booked = extras.counts[session.id] ?? 0;
    return {
      ...session,
      program: extras.programs.find((p) => p.id === session.program_id) ?? null,
      session_type:
        extras.types.find((t) => t.id === session.session_type_id) ?? null,
      trainer: extras.trainers.find((t) => t.id === session.trainer_id) ?? null,
      booked_count: booked,
      spots_remaining: Math.max(0, session.capacity - booked),
    };
  });
}

const HIDDEN_PROGRAM_SLUGS = new Set([
  "private-training",
  "small-group-training",
]);

const HIDDEN_TRAINER_NAMES = new Set(["Coach Jordan"]);

/** Tenant-scoped service reads for server catalog (avoids missing GRANT on authenticated). */
function trainingCatalogClient() {
  if (
    !isSupabaseConfigured() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !getTrainingTenantIdOrNull()
  ) {
    return null;
  }
  return createTrainingServiceClient();
}

export async function getPrograms(): Promise<Program[]> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_PROGRAMS.filter((p) => !HIDDEN_PROGRAM_SLUGS.has(p.slug));
  }
  const service = trainingCatalogClient();
  try {
    const supabase = service ?? (await createClient());
    const { data, error } = await supabase
      .from(DAWG_TABLES.programs)
      .select("*")
      .eq("active", true)
      .order("display_order");
    if (error) {
      console.error("[getPrograms]", error.message);
      return service ? [] : FALLBACK_PROGRAMS.filter((p) => !HIDDEN_PROGRAM_SLUGS.has(p.slug));
    }
    if (!data?.length) {
      return service ? [] : FALLBACK_PROGRAMS.filter((p) => !HIDDEN_PROGRAM_SLUGS.has(p.slug));
    }
    return (data as Program[]).filter(
      (p) => !HIDDEN_PROGRAM_SLUGS.has(p.slug),
    );
  } catch {
    return service ? [] : FALLBACK_PROGRAMS.filter((p) => !HIDDEN_PROGRAM_SLUGS.has(p.slug));
  }
}

function withCanonicalCoachCopy(trainers: Trainer[]): Trainer[] {
  return trainers.map((t) => {
    if (!t.name.toLowerCase().includes("avery")) return t;
    return {
      ...t,
      name: COACH_AVERY.name,
      title: COACH_AVERY.title,
      bio: COACH_AVERY.bio,
      photo_url: t.photo_url ?? COACH_AVERY.photoPath,
    };
  });
}

export async function getTrainers(): Promise<Trainer[]> {
  const visible = (list: Trainer[]) =>
    withCanonicalCoachCopy(
      list.filter((t) => !HIDDEN_TRAINER_NAMES.has(t.name)),
    );

  if (!isSupabaseConfigured()) {
    return visible(FALLBACK_TRAINERS);
  }
  const service = trainingCatalogClient();
  try {
    const supabase = service ?? (await createClient());
    const { data, error } = await supabase
      .from(DAWG_TABLES.trainers)
      .select("*")
      .eq("active", true)
      .order("display_order");
    if (error) {
      console.error("[getTrainers]", error.message);
      return service ? [] : visible(FALLBACK_TRAINERS);
    }
    if (!data?.length) {
      return service ? [] : visible(FALLBACK_TRAINERS);
    }
    return visible(data as Trainer[]);
  } catch {
    return service ? [] : visible(FALLBACK_TRAINERS);
  }
}

export async function getPublishedReviews(): Promise<Review[]> {
  if (!isSupabaseConfigured()) return FALLBACK_REVIEWS;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(DAWG_TABLES.reviews)
      .select("*")
      .eq("published", true)
      .order("display_order");
    if (error) return FALLBACK_REVIEWS;
    const rows = (data as Review[]) ?? [];
    if (rows.length === 0) return FALLBACK_REVIEWS;
    return rows;
  } catch {
    return FALLBACK_REVIEWS;
  }
}

export async function getBusinessSettings(): Promise<BusinessSettings> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_SETTINGS;
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(DAWG_TABLES.businessSettings)
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error || !data) return FALLBACK_SETTINGS;
    return data as BusinessSettings;
  } catch {
    return FALLBACK_SETTINGS;
  }
}

export async function getSessionTypes(): Promise<SessionType[]> {
  if (!isSupabaseConfigured()) return FALLBACK_SESSION_TYPES;
  const service = trainingCatalogClient();
  try {
    const supabase = service ?? (await createClient());
    const { data, error } = await supabase
      .from(DAWG_TABLES.sessionTypes)
      .select("*")
      .eq("active", true)
      .order("name");
    if (error) {
      console.error("[getSessionTypes]", error.message);
      return service ? [] : FALLBACK_SESSION_TYPES;
    }
    if (!data?.length) {
      return service ? [] : FALLBACK_SESSION_TYPES;
    }
    return data as SessionType[];
  } catch {
    return service ? [] : FALLBACK_SESSION_TYPES;
  }
}

export async function getUpcomingSessions(
  limit = 8,
): Promise<SessionWithRelations[]> {
  // Demo content only when Supabase env is missing. Never mix fake sess-* IDs
  // into a live project — booking API cannot create rows for those.
  if (!isSupabaseConfigured()) {
    return FALLBACK_SESSIONS.filter((s) => s.spots_remaining !== undefined).slice(
      0,
      limit,
    );
  }

  try {
    const supabase = await createClient();
    const today = todayISO();
    const { data, error } = await supabase
      .from(DAWG_TABLES.sessions)
      .select("*")
      .eq("status", "published")
      .gte("session_date", today)
      .order("session_date")
      .order("start_time")
      .limit(limit);

    if (error || !data?.length) {
      return [];
    }

    const [programs, types, trainers, counts] = await Promise.all([
      getPrograms(),
      getSessionTypes(),
      getTrainers(),
      bookingCounts(data.map((s) => s.id)),
    ]);

    return enrichSessions(data as TrainingSession[], {
      programs,
      types,
      trainers,
      counts,
    })
      .filter(
        (s) => !s.program || !HIDDEN_PROGRAM_SLUGS.has(s.program.slug),
      )
      .filter((s) => isPublicScheduleVisibility(s.visibility));
  } catch {
    return [];
  }
}

export interface SessionFilters {
  type?: string;
  age?: string;
  date?: string;
}

export async function getFilteredSessions(
  filters: SessionFilters = {},
): Promise<SessionWithRelations[]> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_SESSIONS.filter((session) => {
      if (session.program && HIDDEN_PROGRAM_SLUGS.has(session.program.slug)) {
        return false;
      }
      if (filters.type && session.session_type?.slug !== filters.type)
        return false;
      if (filters.date && session.session_date !== filters.date) return false;
      if (filters.age) {
        const age = Number(filters.age);
        if (
          Number.isFinite(age) &&
          ((session.minimum_age != null && age < session.minimum_age) ||
            (session.maximum_age != null && age > session.maximum_age))
        ) {
          return false;
        }
      }
      return true;
    });
  }

  try {
    const supabase = await createClient();
    let query = supabase
      .from(DAWG_TABLES.sessions)
      .select("*")
      .eq("status", "published")
      .gte("session_date", todayISO())
      .order("session_date")
      .order("start_time");

    if (filters.date) {
      query = query.eq("session_date", filters.date);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    const [programs, types, trainers, counts] = await Promise.all([
      getPrograms(),
      getSessionTypes(),
      getTrainers(),
      bookingCounts(data.map((s) => s.id)),
    ]);

    let sessions = enrichSessions(data as TrainingSession[], {
      programs,
      types,
      trainers,
      counts,
    });

    if (filters.type) {
      sessions = sessions.filter((s) => s.session_type?.slug === filters.type);
    }
    if (filters.age) {
      const age = Number(filters.age);
      if (Number.isFinite(age)) {
        sessions = sessions.filter(
          (s) =>
            (s.minimum_age == null || age >= s.minimum_age) &&
            (s.maximum_age == null || age <= s.maximum_age),
        );
      }
    }

    return sessions.filter(
      (s) =>
        (!s.program || !HIDDEN_PROGRAM_SLUGS.has(s.program.slug)) &&
        isPublicScheduleVisibility(s.visibility),
    );
  } catch {
    return [];
  }
}

export async function getSessionById(
  id: string,
): Promise<SessionWithRelations | null> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_SESSIONS.find((s) => s.id === id) ?? null;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(DAWG_TABLES.sessions)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const [programs, types, trainers, counts] = await Promise.all([
      getPrograms(),
      getSessionTypes(),
      getTrainers(),
      bookingCounts([data.id]),
    ]);

    return enrichSessions([data as TrainingSession], {
      programs,
      types,
      trainers,
      counts,
    })[0];
  } catch {
    return null;
  }
}
