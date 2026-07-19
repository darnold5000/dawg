import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  appleCalendarHref,
  googleCalendarUrl,
  outlookCalendarUrl,
  calendarDetailsLine,
  type CalendarEventInput,
} from "@/lib/calendar";
import { SITE } from "@/lib/constants";
import { formatPrice, formatSessionDate, formatSessionTime } from "@/lib/format";

export type BookingConfirmedViewProps = {
  title?: string;
  confidenceMessage?: string;
  sessionTitle: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  athleteName: string;
  coachName?: string | null;
  location: string;
  paymentLabel: string;
  amountLabel?: string;
  confirmationNumber: string;
  demo?: boolean;
  confirming?: boolean;
  confirmingSlot?: React.ReactNode;
};

export function BookingConfirmedView({
  title = "You're all set!",
  confidenceMessage = "We've emailed your confirmation and calendar invite. You don't need to screenshot this page — check your inbox in a few seconds.",
  sessionTitle,
  sessionDate,
  startTime,
  endTime,
  athleteName,
  coachName,
  location,
  paymentLabel,
  amountLabel,
  confirmationNumber,
  demo,
  confirmingSlot,
}: BookingConfirmedViewProps) {
  const event: CalendarEventInput = {
    title: `${sessionTitle} — ${athleteName}`,
    sessionDate,
    startTime,
    endTime,
    location,
    details: calendarDetailsLine({
      athleteName,
      confirmationNumber,
      coachName,
    }),
    uid: `${confirmationNumber}@dawg`,
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold tracking-widest text-brand uppercase">
        Booking confirmed
      </p>
      <h1 className="mt-2 font-heading text-4xl tracking-wide">{title}</h1>
      <p className="mt-4 text-base text-foreground/90">{confidenceMessage}</p>

      {demo ? (
        <p className="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Local confirmation only — connect the database and Resend to save
          bookings and send live emails.
        </p>
      ) : null}

      {confirmingSlot}

      <dl className="mt-8 space-y-3 rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Athlete</dt>
          <dd className="font-medium">{athleteName}</dd>
        </div>
        {coachName ? (
          <div className="flex justify-between gap-4 text-sm">
            <dt className="text-muted-foreground">Instructor</dt>
            <dd className="font-medium">{coachName}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Training</dt>
          <dd className="text-right font-medium">{sessionTitle}</dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Date</dt>
          <dd className="font-medium">{formatSessionDate(sessionDate)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Time</dt>
          <dd className="font-medium">{formatSessionTime(startTime)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Location</dt>
          <dd className="text-right font-medium">{location}</dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Payment</dt>
          <dd className="text-right font-medium">
            {paymentLabel}
            {amountLabel ? (
              <span className="mt-0.5 block text-muted-foreground">
                {amountLabel}
              </span>
            ) : null}
          </dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Confirmation #</dt>
          <dd className="font-semibold tracking-wide">{confirmationNumber}</dd>
        </div>
      </dl>

      <div className="mt-6">
        <p className="text-sm font-medium">Add to calendar</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={appleCalendarHref(event)} download="dawg-session.ics">
              Apple
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a
              href={googleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Google
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a
              href={outlookCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Outlook
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
          <a
            href={SITE.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Directions
          </a>
        </Button>
        <Button asChild variant="outline">
          <Link href="/contact">Contact</Link>
        </Button>
        {/* Launch: cancellations disabled
        <Button asChild variant="ghost">
          <Link href="/booking-policy">Cancellation policy</Link>
        </Button>
        */}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Questions? Call{" "}
        <a href={SITE.phoneHref} className="font-medium text-foreground underline">
          {SITE.phone}
        </a>{" "}
        or email{" "}
        <a
          href={`mailto:${SITE.email}`}
          className="font-medium text-foreground underline"
        >
          {SITE.email}
        </a>
        .
      </p>
    </div>
  );
}

export function paymentDisplayLabel(
  method: "stripe" | "pay_at_facility" | string | null | undefined,
  opts?: { paid?: boolean },
): string {
  if (method === "stripe") {
    return opts?.paid === false ? "Pay online" : "Paid online";
  }
  return "Pay at facility";
}

export function amountDisplay(
  cents: number,
  method: "stripe" | "pay_at_facility" | string | null | undefined,
): string {
  const price = formatPrice(cents);
  if (method === "stripe") return price;
  return `${price} due at facility`;
}
