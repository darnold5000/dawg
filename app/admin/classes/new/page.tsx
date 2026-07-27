import { AdminShell } from "@/components/admin/admin-shell";
import { SessionTemplateForm } from "@/components/admin/session-template-form";
import { requireAdmin } from "@/lib/auth";
import { getPrograms, getSessionTypes, getTrainers } from "@/lib/data";

export default async function NewClassPage() {
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
          <h2 className="font-heading text-3xl tracking-wide">New class</h2>
          <p className="text-sm text-muted-foreground">
            Set up the class once — program, time, coach, and defaults. Then add
            it to the calendar when parents should book.
          </p>
        </div>
        <SessionTemplateForm
          programs={programs}
          sessionTypes={sessionTypes}
          trainers={trainers}
        />
      </div>
    </AdminShell>
  );
}
