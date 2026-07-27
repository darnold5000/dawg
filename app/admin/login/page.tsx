import { AdminLoginForm } from "@/components/admin/login-form";
import { SITE } from "@/lib/constants";

type Props = {
  searchParams: Promise<{ reason?: string }>;
};

export default async function AdminLoginPage({ searchParams }: Props) {
  const { reason } = await searchParams;
  const staffAccessDenied = reason === "no_staff";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="admin-app w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand">
          {SITE.shortName}
        </p>
        <h1 className="mt-2 font-heading text-3xl tracking-wide">Staff login</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to manage sessions, bookings, and website content.
        </p>
        {staffAccessDenied ? (
          <p
            className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            Signed in, but this account is not authorized for DAWG staff admin.
            Use an account with a{" "}
            <code className="text-xs">training_staff_profiles</code> row for the
            DAWG tenant, and confirm{" "}
            <code className="text-xs">TRAINING_TENANT_ID</code> in{" "}
            <code className="text-xs">.env.local</code>.
          </p>
        ) : null}
        <div className="mt-6">
          <AdminLoginForm staffAccessDenied={staffAccessDenied} />
        </div>
      </div>
    </div>
  );
}
