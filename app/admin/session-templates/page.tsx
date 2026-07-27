import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { SessionTemplateActions } from "@/components/admin/session-template-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { formatPrice, formatSessionTime } from "@/lib/format";
import { effectiveTemplateDefaults } from "@/lib/session-template-defaults";
import { listSessionTemplates } from "@/lib/session-templates";
import { visibilityLabel } from "@/lib/training-visibility";
import { isRosterCreditSession } from "@/lib/roster-credit-sessions";
import type { SessionTemplateWithRelations } from "@/lib/types/database";

export default async function SessionTemplatesPage() {
  const profile = await requireAdmin();

  let templates: SessionTemplateWithRelations[] = [];
  let loadError: string | null = null;
  try {
    templates = await listSessionTemplates({ includeInactive: true });
  } catch (err) {
    loadError =
      err instanceof Error ? err.message : "Could not load session templates";
  }

  return (
    <AdminShell profile={profile}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-3xl tracking-wide">
              Session templates
            </h2>
            <p className="text-sm text-muted-foreground">
              Reusable class defaults — schedule dated sessions parents book on
              the public calendar.
            </p>
          </div>
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href="/admin/session-templates/new">New template</Link>
          </Button>
        </div>

        {loadError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <p className="font-medium">Templates unavailable</p>
            <p className="mt-1 text-muted-foreground">{loadError}</p>
            <p className="mt-2 text-muted-foreground">
              Apply migration{" "}
              <code className="text-xs">013_training_session_templates.sql</code>{" "}
              on Signal Works Pro, then reload.
            </p>
          </div>
        ) : null}

        {!loadError && templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
            <p className="font-medium">No templates yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create templates for Little Dawgs and Big Dawgs time slots, then
              use Add to calendar.
            </p>
          </div>
        ) : null}

        <div className="grid gap-3">
          {templates.map((template) => {
            const roster = isRosterCreditSession({ program: template.program });
            const effective = effectiveTemplateDefaults(
              template.program,
              template,
            );
            return (
              <div
                key={template.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {effective.calendar_color ? (
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: effective.calendar_color }}
                        aria-hidden
                      />
                    ) : null}
                    <h3 className="font-heading text-lg tracking-wide">
                      {template.program?.name
                        ? `${template.program.name} · ${template.name}`
                        : template.name}
                    </h3>
                    <Badge variant={template.is_active ? "secondary" : "outline"}>
                      {template.is_active ? "Active" : "Archived"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {template.program?.name ?? "No program"} ·{" "}
                    {formatSessionTime(template.default_start_time)} ·{" "}
                    {template.default_duration_minutes} min · cap{" "}
                    {effective.capacity}
                    {!roster && effective.price_cents > 0
                      ? ` · ${formatPrice(effective.price_cents)}`
                      : roster
                        ? " · package credit"
                        : ""}
                    · {visibilityLabel(effective.visibility)}
                    {template.trainer ? ` · ${template.trainer.name}` : ""}
                  </p>
                </div>
                <SessionTemplateActions
                  templateId={template.id}
                  templateName={template.name}
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
