import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { SessionTemplateActions } from "@/components/admin/session-template-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import {
  classCardHeading,
  classCardMeta,
  classListSortKey,
} from "@/lib/class-display";
import { formatPrice } from "@/lib/format";
import { effectiveTemplateDefaults } from "@/lib/session-template-defaults";
import { listSessionTemplates } from "@/lib/session-templates";
import { visibilityLabel } from "@/lib/training-visibility";
import { isRosterCreditSession } from "@/lib/roster-credit-sessions";
import type { SessionTemplateWithRelations } from "@/lib/types/database";

export default async function ClassesPage() {
  const profile = await requireAdmin();

  let classes: SessionTemplateWithRelations[] = [];
  let loadError: string | null = null;
  try {
    classes = await listSessionTemplates({ includeInactive: true });
  } catch (err) {
    loadError =
      err instanceof Error ? err.message : "Could not load classes";
  }

  const sorted = [...classes].sort((a, b) =>
    classListSortKey(a).localeCompare(classListSortKey(b)),
  );

  return (
    <AdminShell profile={profile}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-3xl tracking-wide">Classes</h2>
            <p className="text-sm text-muted-foreground">
              Saved classes you offer — schedule them on the{" "}
              <Link href="/admin/sessions" className="text-brand underline">
                Schedule
              </Link>{ " "}
              page when parents should book.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/sessions/weekly">Schedule all M–F</Link>
            </Button>
            <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Link href="/admin/classes/new">New class</Link>
            </Button>
          </div>
        </div>

        {loadError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <p className="font-medium">Classes unavailable</p>
            <p className="mt-1 text-muted-foreground">{loadError}</p>
            <p className="mt-2 text-muted-foreground">
              Apply migration{" "}
              <code className="text-xs">013_training_session_templates.sql</code>{" "}
              on Signal Works Pro, then reload.
            </p>
          </div>
        ) : null}

        {!loadError && sorted.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
            <p className="font-medium">No saved classes yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create Little Dawgs and Big Dawgs at your usual times, then add
              them to the calendar.
            </p>
            <Button
              asChild
              className="mt-4 bg-brand text-brand-foreground hover:bg-brand/90"
            >
              <Link href="/admin/classes/new">Create a class</Link>
            </Button>
          </div>
        ) : null}

        <div className="grid gap-3">
          {sorted.map((template) => {
            const roster = isRosterCreditSession({ program: template.program });
            const effective = effectiveTemplateDefaults(
              template.program,
              template,
            );
            const color = effective.calendar_color;
            return (
              <div
                key={template.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {color ? (
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                    ) : null}
                    <h3 className="font-heading text-lg tracking-wide">
                      {classCardHeading(template.program)}
                    </h3>
                    <Badge variant={template.is_active ? "secondary" : "outline"}>
                      {template.is_active ? "Active" : "Archived"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {classCardMeta(template)}
                    {!roster && effective.price_cents > 0
                      ? ` · ${formatPrice(effective.price_cents)}`
                      : roster
                        ? " · package credit"
                        : ""}
                    · cap {effective.capacity}
                    · {visibilityLabel(effective.visibility)}
                  </p>
                </div>
                <SessionTemplateActions
                  templateId={template.id}
                  templateName={classCardHeading(template.program)}
                  isActive={template.is_active}
                />
              </div>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}
