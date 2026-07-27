import { AdminShell } from "@/components/admin/admin-shell";
import { ProgramsAdminPanel } from "@/components/admin/programs-admin-panel";
import { ProgramsAdminSections } from "@/components/admin/programs-admin-sections";
import { requireAdmin } from "@/lib/auth";
import { getAdminPrograms } from "@/lib/admin-programs";
import { getSessionTypes, getTrainers } from "@/lib/data";

export default async function AdminProgramsPage() {
  const profile = await requireAdmin();
  const [programs, sessionTypes, trainers] = await Promise.all([
    getAdminPrograms(),
    getSessionTypes(),
    getTrainers(),
  ]);

  const activePrograms = programs.filter((p) => p.active);

  return (
    <AdminShell profile={profile}>
      <div className="space-y-8">
        <div>
          <h2 className="font-heading text-3xl tracking-wide">Programs</h2>
          <p className="text-sm text-muted-foreground">
            Add and edit group programs (Little Dawgs, Big Dawgs, and any new
            offerings). Package-credit programs book at $0 online; use the
            sections below for paid private lessons or one-off classes.
          </p>
        </div>

        <ProgramsAdminPanel programs={programs} />

        <ProgramsAdminSections
          programs={activePrograms}
          sessionTypes={sessionTypes}
          trainers={trainers}
        />
      </div>
    </AdminShell>
  );
}
