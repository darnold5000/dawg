import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { getTrainers } from "@/lib/data";

export default async function AdminTrainersPage() {
  const profile = await requireAdmin();
  const trainers = await getTrainers();

  return (
    <AdminShell profile={profile}>
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-3xl tracking-wide">Trainers</h2>
          <p className="text-sm text-muted-foreground">
            Trainer bios shown on the public site. Manage rows in Supabase or
            expand this screen later.
          </p>
        </div>
        <div className="grid gap-4">
          {trainers.map((trainer) => (
            <article
              key={trainer.id}
              className="rounded-xl border border-border bg-card p-5"
            >
              <h3 className="font-heading text-xl tracking-wide">
                {trainer.name}
              </h3>
              <p className="text-sm text-brand">{trainer.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{trainer.bio}</p>
            </article>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
