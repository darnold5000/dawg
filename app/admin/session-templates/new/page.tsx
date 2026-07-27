import { AdminShell } from "@/components/admin/admin-shell";
import { SessionTemplateForm } from "@/components/admin/session-template-form";
import { requireAdmin } from "@/lib/auth";
import { getPrograms, getSessionTypes, getTrainers } from "@/lib/data";

export default async function NewSessionTemplatePage() {
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
          <h2 className="font-heading text-3xl tracking-wide">New template</h2>
          <p className="text-sm text-muted-foreground">
            Templates store reusable defaults. Scheduling creates real dated
            sessions on the calendar.
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
