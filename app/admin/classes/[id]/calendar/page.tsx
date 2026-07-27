import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ScheduleTemplateForm } from "@/components/admin/schedule-template-form";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { classCardHeading } from "@/lib/class-display";
import { getTrainers } from "@/lib/data";
import { getSessionTemplate } from "@/lib/session-templates";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ preset?: string }>;
};

export default async function AddClassToCalendarPage({
  params,
  searchParams,
}: PageProps) {
  const profile = await requireAdmin();
  const { id } = await params;
  const { preset } = await searchParams;
  const initialPreset =
    preset === "once" || preset === "weekdays" ? preset : undefined;

  let template;
  try {
    template = await getSessionTemplate(id);
  } catch {
    notFound();
  }
  if (!template || !template.is_active) notFound();

  const trainers = await getTrainers();

  return (
    <AdminShell profile={profile}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-3xl tracking-wide">
              Add to schedule
            </h2>
            <p className="text-sm text-muted-foreground">
              Tell us when{" "}
              <span className="font-medium text-foreground">
                {classCardHeading(template.program)}
              </span>{ " "}
              happens — parents book these dated sessions on the public schedule.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/classes">Back to classes</Link>
          </Button>
        </div>
        <ScheduleTemplateForm
          template={template}
          trainers={trainers}
          initialPreset={initialPreset}
        />
      </div>
    </AdminShell>
  );
}
