import { addDays, format, parseISO } from "date-fns";
import {
  createClient,
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { FALLBACK_SESSIONS } from "@/lib/fallback-data";
import type {
  BookingWithRelations,
  SessionWithRelations,
  TrainingSession,
} from "@/lib/types/database";
import { getPrograms, getSessionTypes, getTrainers } from "@/lib/data";

export async function getAdminSessions(): Promise<SessionWithRelations[]> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_SESSIONS;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(DAWG_TABLES.sessions)
      .select("*")
      .order("session_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error || !data) return FALLBACK_SESSIONS;

    const supabaseService = createServiceClient();
    const ids = data.map((s) => s.id);
    const { data: bookings } = await supabaseService
      .from(DAWG_TABLES.bookings)
      .select("session_id")
      .in("session_id", ids)
      .in("status", ["pending", "confirmed", "attended"]);

    const counts: Record<string, number> = {};
    for (const row of bookings ?? []) {
      counts[row.session_id] = (counts[row.session_id] ?? 0) + 1;
    }

    const [programs, types, trainers] = await Promise.all([
      getPrograms(),
      getSessionTypes(),
      getTrainers(),
    ]);

    return (data as TrainingSession[]).map((session) => {
      const booked = counts[session.id] ?? 0;
      return {
        ...session,
        program: programs.find((p) => p.id === session.program_id) ?? null,
        session_type: types.find((t) => t.id === session.session_type_id) ?? null,
        trainer: trainers.find((t) => t.id === session.trainer_id) ?? null,
        booked_count: booked,
        spots_remaining: Math.max(0, session.capacity - booked),
      };
    });
  } catch {
    return FALLBACK_SESSIONS;
  }
}

export async function getDashboardMetrics() {
  const sessions = await getAdminSessions();
  const today = format(new Date(), "yyyy-MM-dd");
  const weekEnd = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const todaysSessions = sessions.filter(
    (s) => s.session_date === today && s.status !== "cancelled",
  );
  const weekSessions = sessions.filter(
    (s) =>
      s.session_date >= today &&
      s.session_date <= weekEnd &&
      s.status !== "cancelled",
  );
  const weekBookings = weekSessions.reduce(
    (sum, s) => sum + (s.booked_count ?? 0),
    0,
  );
  const availableSpots = weekSessions.reduce(
    (sum, s) => sum + (s.spots_remaining ?? 0),
    0,
  );
  const privateUpcoming = sessions.filter(
    (s) =>
      s.session_date >= today &&
      s.session_type?.slug === "private-lesson" &&
      s.status === "published",
  ).length;

  return {
    todaysSessions,
    weekBookings,
    availableSpots,
    privateUpcoming,
    revenueThisMonth: 0,
    waitlisted: 0,
  };
}

export async function getSessionRoster(
  sessionId: string,
): Promise<{ session: SessionWithRelations | null; bookings: BookingWithRelations[] }> {
  const sessions = await getAdminSessions();
  const session = sessions.find((s) => s.id === sessionId) ?? null;

  if (!isSupabaseConfigured()) {
    return { session, bookings: [] };
  }

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from(DAWG_TABLES.bookings)
      .select("*")
      .eq("session_id", sessionId)
      .order("booked_at");

    const bookings = (data ?? []) as BookingWithRelations[];
    const parentIds = [...new Set(bookings.map((b) => b.parent_id))];
    const athleteIds = [...new Set(bookings.map((b) => b.athlete_id))];

    const [{ data: parents }, { data: athletes }] = await Promise.all([
      supabase.from(DAWG_TABLES.parents).select("*").in("id", parentIds),
      supabase.from(DAWG_TABLES.athletes).select("*").in("id", athleteIds),
    ]);

    const enriched = bookings.map((b) => ({
      ...b,
      parent: parents?.find((p) => p.id === b.parent_id),
      athlete: athletes?.find((a) => a.id === b.athlete_id),
      session: session ?? undefined,
    }));

    return { session, bookings: enriched };
  } catch {
    return { session, bookings: [] };
  }
}

export function sessionsByDate(sessions: SessionWithRelations[]) {
  const map = new Map<string, SessionWithRelations[]>();
  for (const session of sessions) {
    const key = session.session_date;
    const list = map.get(key) ?? [];
    list.push(session);
    map.set(key, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function isPastSession(sessionDate: string): boolean {
  return parseISO(sessionDate) < parseISO(format(new Date(), "yyyy-MM-dd"));
}
