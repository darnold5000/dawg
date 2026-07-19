import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { SessionForm } from "@/components/admin/session-form";
import { requireAdmin } from "@/lib/auth";
import { getAdminSessions } from "@/lib/admin-data";
import { getPrograms, getSessionTypes, getTrainers } from "@/lib/data";

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireAdmin();
  const { id } = await params;
  const [sessions, programs, sessionTypes, trainers] = await Promise.all([
    getAdminSessions(),
    getPrograms(),
    getSessionTypes(),
    getTrainers(),
  ]);
  const session = sessions.find((s) => s.id === id);
  if (!session) notFound();

  return (
    <AdminShell profile={profile}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h2 className="font-heading text-3xl tracking-wide">Edit session</h2>
          <p className="text-sm text-muted-foreground">{session.title}</p>
        </div>
        <SessionForm
          mode="edit"
          sessionId={session.id}
          programs={programs}
          sessionTypes={sessionTypes}
          trainers={trainers}
          initial={{
            title: session.title,
            program_id: session.program_id ?? undefined,
            session_type_id: session.session_type_id ?? undefined,
            trainer_id: session.trainer_id ?? undefined,
            description: session.description ?? undefined,
            session_date: session.session_date,
            start_time: session.start_time,
            end_time: session.end_time,
            minimum_age: session.minimum_age,
            maximum_age: session.maximum_age,
            skill_level: session.skill_level ?? undefined,
            capacity: session.capacity,
            price: Number(session.price_cents) / 100,
            payment_requirement: session.payment_requirement,
            status: session.status,
            what_to_bring: session.what_to_bring ?? undefined,
            cancellation_policy: session.cancellation_policy ?? undefined,
          }}
        />
      </div>
    </AdminShell>
  );
}
