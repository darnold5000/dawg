import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PersonalTrainingCtaCard({
  className,
}: {
  className?: string;
}) {
  return (
    <article
      className={cn(
        "max-w-xl rounded-xl border border-brand/25 bg-card p-5 shadow-sm",
        className,
      )}
    >
      <h3 className="font-heading text-xl tracking-wide">Personal Training</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Coach Thompson is available for 1-on-1 personal training Saturday and
        Sunday from 10am to 2pm. Contact Coach Thompson to make arrangements.
      </p>
      <Button
        asChild
        size="sm"
        className="mt-4 bg-brand font-bold text-brand-foreground hover:bg-brand/90"
      >
        <Link href="/contact#contact-form">Contact Coach Thompson</Link>
      </Button>
    </article>
  );
}
