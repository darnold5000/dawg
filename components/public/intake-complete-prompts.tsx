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
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-brand/40 bg-brand/10 p-6">
        <h2 className="font-heading text-2xl tracking-wide">You&apos;re already set</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {athleteName
            ? `Intake for ${athleteName} is already on file.`
            : "Your athlete intake is already on file."}{" "}
          You can continue to your booking — no need to fill this out again.
        </p>
        <Button
          asChild
          className="mt-4 bg-brand text-brand-foreground hover:bg-brand/90"
        >
          <Link href={returnTo}>Continue</Link>
        </Button>
      </div>

      {showAccountPrompt ? <IntakeAccountPrompt returnTo={returnTo} /> : null}
    </div>
  );
}

export function IntakeAccountPrompt({ returnTo }: { returnTo: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-sm">
      <p className="text-muted-foreground">
        Want to view your bookings, packages, and remaining credits anytime?
      </p>
      <Button asChild variant="outline" className="mt-3">
        <Link href={claimPath(returnTo)}>Create My Online Account</Link>
      </Button>
    </div>
  );
}
