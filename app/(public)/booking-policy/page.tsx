import { createMetadata } from "@/lib/seo";
import { SITE } from "@/lib/constants";
import {
  bookingPolicyDoc,
  cancellationPolicyDoc,
  waiverDoc,
} from "@/lib/agreements";

export const metadata = createMetadata({
  title: "Booking Policy",
  description: `Booking and cancellation policy for ${SITE.name}.`,
  path: "/booking-policy",
});

export default function BookingPolicyPage() {
  const booking = bookingPolicyDoc();
  const cancellation = cancellationPolicyDoc();
  const waiver = waiverDoc();

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-heading text-4xl tracking-wide">{booking.title}</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
        {booking.paragraphs.map((p) => (
          <p key={p.slice(0, 40)}>{p}</p>
        ))}
      </div>
      <h2 className="mt-10 font-heading text-2xl tracking-wide">
        {cancellation.title}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
        {cancellation.paragraphs.map((p) => (
          <p key={p.slice(0, 40)}>{p}</p>
        ))}
      </div>
      <h2 className="mt-10 font-heading text-2xl tracking-wide">{waiver.title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
        {waiver.paragraphs.map((p) => (
          <p key={p.slice(0, 40)}>{p}</p>
        ))}
      </div>
    </div>
  );
}
