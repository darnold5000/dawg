import { AdminShell } from "@/components/admin/admin-shell";
import { ClientsTable } from "@/components/admin/clients-table";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { clientsToCsv, getClientFamilies } from "@/lib/admin-clients";

export default async function AdminClientsPage() {
  const profile = await requireStaff();
  const families = await getClientFamilies();
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
    clientsToCsv(families),
  )}`;

  return (
    <AdminShell profile={profile}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-3xl tracking-wide">Clients</h2>
            <p className="text-sm text-muted-foreground">
              Families, packages, and session history
            </p>
          </div>
          {families.length > 0 ? (
            <Button asChild variant="outline" size="sm">
              <a href={csvHref} download="dawg-clients.csv">
                Export CSV
              </a>
            </Button>
          ) : null}
        </div>

        <ClientsTable families={families} />
      </div>
    </AdminShell>
  );
}
