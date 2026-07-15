import { createMetadata } from "@/lib/seo";
import { SITE } from "@/lib/constants";

export const metadata = createMetadata({
  title: "Booking Policy",
  description: `Booking and cancellation policy for ${SITE.name}.`,
  path: "/booking-policy",
});

export default function BookingPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-heading text-4xl tracking-wide">Booking Policy</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          Reservations hold your athlete&apos;s spot for the selected session.
          Payment is due at the facility unless a session specifically requires
          online payment.
        </p>
        <p>
          A parent or legal guardian must complete bookings for minors and
          acknowledge facility policies during checkout.
        </p>
        <p>
          Please cancel or reschedule at least 24 hours in advance when possible
          by contacting DAWGZ at{" "}
          <a href={SITE.phoneHref} className="text-foreground underline">
            {SITE.phone}
          </a>{" "}
          or{" "}
          <a href={`mailto:${SITE.email}`} className="text-foreground underline">
            {SITE.email}
          </a>
          .
        </p>
        <p>
          Liability waiver language should be provided and approved by DAWGZ
          before treating online checkboxes as a complete legal waiver.
        </p>
      </div>
    </div>
  );
}
