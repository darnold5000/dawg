import { format } from "date-fns";
import {
  createClient,
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
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

function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

async function bookingCounts(
  sessionIds: string[],
): Promise<Record<string, number>> {
  if (!sessionIds.length || !isSupabaseConfigured()) return {};
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from(DAWG_TABLES.bookings)
      .select("session_id, status, booking_expires_at")
      .in("session_id", sessionIds)
      .in("status", ["pending", "confirmed"]);

    const now = Date.now();
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      if (row.status === "pending") {
        if (
          row.booking_expires_at &&
          new Date(row.booking_expires_at).getTime() <= now
        ) {
          continue;
        }
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

export async function getPrograms(): Promise<Program[]> {
  if (!isSupabaseConfigured()) return FALLBACK_PROGRAMS;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(DAWG_TABLES.programs)
      .select("*")
      .eq("active", true)
      .order("display_order");
    if (error || !data?.length) return FALLBACK_PROGRAMS;
    return data as Program[];
  } catch {
    return FALLBACK_PROGRAMS;
  }
}

export async function getTrainers(): Promise<Trainer[]> {
  if (!isSupabaseConfigured()) return FALLBACK_TRAINERS;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(DAWG_TABLES.trainers)
      .select("*")
      .eq("active", true)
      .order("display_order");
    if (error || !data?.length) return FALLBACK_TRAINERS;
    return data as Trainer[];
  } catch {
    return FALLBACK_TRAINERS;
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
    if (!data?.length) return FALLBACK_REVIEWS;
    return (data as Review[]) ?? [];
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
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(DAWG_TABLES.sessionTypes)
      .select("*")
      .eq("active", true)
      .order("name");
    if (error || !data?.length) return FALLBACK_SESSION_TYPES;
    return data as SessionType[];
  } catch {
    return FALLBACK_SESSION_TYPES;
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
    });
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

    return sessions;
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
