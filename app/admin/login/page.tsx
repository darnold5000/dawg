import { AdminLoginForm } from "@/components/admin/login-form";
import { SITE } from "@/lib/constants";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-md rounded-2xl bg-background p-8 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand">
          {SITE.shortName}
        </p>
        <h1 className="mt-2 font-heading text-3xl tracking-wide">Staff login</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to manage sessions, bookings, and website content.
        </p>
        <div className="mt-6">
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
