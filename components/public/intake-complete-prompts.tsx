import Link from "next/link";
import { Button } from "@/components/ui/button";

export function IntakeAlreadyComplete({
  returnTo,
  athleteName,
}: {
  returnTo: string;
  athleteName?: string;
}) {
  const isBookingReturn = returnTo.startsWith("/book/");
  return (
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
  );
}
