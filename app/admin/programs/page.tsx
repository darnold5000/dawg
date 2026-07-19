import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { getPrograms } from "@/lib/data";
import { ageRangeLabel, formatPrice } from "@/lib/format";

export default async function AdminProgramsPage() {
  const profile = await requireAdmin();
  const programs = await getPrograms();

  return (
    <AdminShell profile={profile}>
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-3xl tracking-wide">Programs</h2>
          <p className="text-sm text-muted-foreground">
            Public program catalog. Full CMS editing can expand here; seed data
            is editable in Supabase today.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {programs.map((program) => (
            <article
              key={program.id}
              className="rounded-xl border border-border bg-card p-5"
            >
              <h3 className="font-heading text-xl tracking-wide">
                {program.name}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {program.short_description}
              </p>
              <p className="mt-3 text-sm">
                {ageRangeLabel(program.minimum_age, program.maximum_age)} ·{" "}
                {program.default_duration_minutes} min · from{" "}
                {program.default_price_cents != null
                  ? formatPrice(Number(program.default_price_cents))
                  : "TBD"}
              </p>
            </article>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
