import { AdminShell } from "@/components/admin/admin-shell";
import { SessionForm } from "@/components/admin/session-form";
import { requireAdmin } from "@/lib/auth";
import { getPrograms, getSessionTypes, getTrainers } from "@/lib/data";

export default async function NewSessionPage() {
  const profile = await requireAdmin();
  const [programs, sessionTypes, trainers] = await Promise.all([
    getPrograms(),
    getSessionTypes(),
    getTrainers(),
  ]);

  return (
    <AdminShell profile={profile}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h2 className="font-heading text-3xl tracking-wide">
            New group session
          </h2>
          <p className="text-sm text-muted-foreground">
            Create recurring or one-time group classes booked with package
            credits. For Stripe-priced private lessons or one-off classes, use
            Programs.
          </p>
        </div>
        <SessionForm
          programs={programs}
          sessionTypes={sessionTypes}
          trainers={trainers}
        />
      </div>
    </AdminShell>
  );
}
