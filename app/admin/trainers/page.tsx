import { AdminShell } from "@/components/admin/admin-shell";
import {
  TrainerCreateForm,
  TrainerEditCard,
} from "@/components/admin/trainer-forms";
import { requireAdmin } from "@/lib/auth";
import { getAdminTrainers } from "@/lib/admin-trainers";

export default async function AdminTrainersPage() {
  const profile = await requireAdmin();
  const trainers = await getAdminTrainers();

  return (
    <AdminShell profile={profile}>
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-3xl tracking-wide">Trainers</h2>
          <p className="text-sm text-muted-foreground">
            Edit coach bios and photos shown on the home page and About page.
          </p>
        </div>

        <TrainerCreateForm />

        <div className="space-y-4">
          <h3 className="font-heading text-xl tracking-wide">Current trainers</h3>
          {trainers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trainers yet.</p>
          ) : (
            trainers.map((trainer) => (
              <TrainerEditCard key={trainer.id} trainer={trainer} />
            ))
          )}
        </div>
      </div>
    </AdminShell>
  );
}
