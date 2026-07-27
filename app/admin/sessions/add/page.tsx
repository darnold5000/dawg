import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import {
  classCardHeading,
  classCardMeta,
  classListSortKey,
} from "@/lib/class-display";
import { listSessionTemplates } from "@/lib/session-templates";

export default async function AddExistingClassPage() {
  const profile = await requireAdmin();
  const classes = await listSessionTemplates({ includeInactive: false });
  const sorted = [...classes].sort((a, b) =>
    classListSortKey(a).localeCompare(classListSortKey(b)),
  );

  return (
    <AdminShell profile={profile}>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h2 className="font-heading text-3xl tracking-wide">
            Add existing class
          </h2>
          <p className="text-sm text-muted-foreground">
            Pick a saved class, then choose how often it runs on the calendar.
          </p>
        </div>

        {sorted.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
            <p className="font-medium">No classes saved yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your classes first, then add them to the calendar.
            </p>
            <Button
              asChild
              className="mt-4 bg-brand text-brand-foreground hover:bg-brand/90"
            >
              <Link href="/admin/classes/new">Create a class</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {sorted.map((template) => {
              const color = template.program?.calendar_color;
              return (
                <li key={template.id}>
                  <Link
                    href={`/admin/classes/${template.id}/calendar`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-brand/40 hover:bg-muted/30"
                  >
                    {color ? (
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="font-heading text-lg tracking-wide">
                        {classCardHeading(template.program)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {classCardMeta(template)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <Button asChild variant="outline">
          <Link href="/admin/sessions">Back to calendar</Link>
        </Button>
      </div>
    </AdminShell>
  );
}
