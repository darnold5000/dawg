import { ResetPasswordForm } from "@/components/admin/reset-password-form";
import { SITE } from "@/lib/constants";

export default function AdminResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="admin-app w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand">
          {SITE.shortName}
        </p>
        <h1 className="mt-2 font-heading text-3xl tracking-wide">
          Choose a new password
        </h1>
        <div className="mt-6">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
