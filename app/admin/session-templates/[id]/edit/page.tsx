import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { SessionTemplateForm } from "@/components/admin/session-template-form";
import { requireAdmin } from "@/lib/auth";
import { getPrograms, getSessionTypes, getTrainers } from "@/lib/data";
import { getSessionTemplate } from "@/lib/session-templates";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditSessionTemplatePage({ params }: PageProps) {
  const profile = await requireAdmin();
  const { id } = await params;

  let template;
  try {
    template = await getSessionTemplate(id);
  } catch {
    notFound();
  }
  if (!template) notFound();

  const [programs, sessionTypes, trainers] = await Promise.all([
    getPrograms(),
    getSessionTypes(),
    getTrainers(),
  ]);

  return (
    <AdminShell profile={profile}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h2 className="font-heading text-3xl tracking-wide">Edit template</h2>
          <p className="text-sm text-muted-foreground">
            Changes apply to future scheduling only — existing sessions keep
            their snapshot.
          </p>
        </div>
        <SessionTemplateForm
          mode="edit"
          templateId={id}
          initial={template}
          programs={programs}
          sessionTypes={sessionTypes}
          trainers={trainers}
        />
      </div>
    </AdminShell>
  );
}
