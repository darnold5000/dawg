import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ScheduleTemplateForm } from "@/components/admin/schedule-template-form";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { getSessionTemplate } from "@/lib/session-templates";

type PageProps = { params: Promise<{ id: string }> };

export default async function CalendarAddTemplatePage({ params }: PageProps) {
  const profile = await requireAdmin();
  const { id } = await params;

  let template;
  try {
    template = await getSessionTemplate(id);
  } catch {
    notFound();
  }
  if (!template || !template.is_active) notFound();

  return (
    <AdminShell profile={profile}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-3xl tracking-wide">
              Add to calendar
            </h2>
            <p className="text-sm text-muted-foreground">
              Preview, then place occurrences on the{" "}
              <Link href="/admin/sessions" className="text-brand underline">
                calendar
              </Link>{" "}
              (parents book dated sessions, not templates).
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/session-templates">Back to templates</Link>
          </Button>
        </div>
        <ScheduleTemplateForm template={template} />
      </div>
    </AdminShell>
  );
}
