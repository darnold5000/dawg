import Link from "next/link";
import { Button } from "@/components/ui/button";
import { claimPath } from "@/lib/family-auth-url";

export function IntakeAlreadyComplete({
  returnTo,
  athleteName,
  showAccountPrompt = true,
}: {
  returnTo: string;
  athleteName?: string;
  showAccountPrompt?: boolean;
}) {
  const isBookingReturn = returnTo.startsWith("/book/");
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-brand/40 bg-brand/10 p-6">
        <h2 className="font-heading text-2xl tracking-wide">You&apos;re already set</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {athleteName
            ? `Intake for ${athleteName} is already on file.`
            : "Your athlete intake is already on file."}{" "}
          {isBookingReturn
            ? "Continue to confirm payment and book this session."
            : "You can continue — no need to fill this out again."}
        </p>
        <Button
          asChild
          className="mt-4 bg-brand text-brand-foreground hover:bg-brand/90"
        >
          <Link href={returnTo}>
            {isBookingReturn ? "Continue to booking" : "Continue"}
          </Link>
        </Button>
      </div>

      {showAccountPrompt && !isBookingReturn ? (
        <IntakeAccountPrompt returnTo={returnTo} />
      ) : null}
    </div>
  );
}

export function IntakeAccountPrompt({ returnTo }: { returnTo: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-sm">
      <p className="text-muted-foreground">
        Optional: sign in to the family portal at{" "}
        <strong className="font-medium text-foreground">My account</strong> to
        view bookings, package credits, and athletes anytime (magic link — no
        password required).
      </p>
      <Button asChild variant="outline" className="mt-3 border-slate-300 bg-white text-slate-900">
        <Link href={claimPath(returnTo)}>Email me a sign-in link</Link>
      </Button>
    </div>
  );
}
