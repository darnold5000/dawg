import { Resend } from "resend";
import { SITE } from "@/lib/constants";
import { formatPrice, formatSessionDate, formatSessionTime } from "@/lib/format";
import type { Booking } from "@/lib/types/database";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

type ConfirmPayload = {
  booking: Booking;
  parentEmail: string;
  parentName: string;
  athleteName: string;
  sessionTitle: string;
  sessionDate: string;
  startTime: string;
  location: string | null;
  amountDue: number;
};

type StaffPayload = {
  booking: Booking;
  parentEmail: string;
  parentName: string;
  parentPhone: string;
  athleteName: string;
  sessionTitle: string;
  sessionDate: string;
  startTime: string;
};

export async function sendBookingConfirmation(payload: ConfirmPayload): Promise<void> {
  if (!resend) return;
  const from = process.env.RESEND_FROM_EMAIL ?? "bookings@signalworks.io";

  await resend.emails.send({
    from,
    to: payload.parentEmail,
    subject: `DAWGZ booking confirmed — ${payload.sessionTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h1 style="color: #121212;">You're booked at DAWGZ</h1>
        <p>Hi ${payload.parentName},</p>
        <p>Your training reservation is confirmed.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
          <tr><td style="padding: 8px 0;"><strong>Confirmation</strong></td><td>${payload.booking.confirmation_number}</td></tr>
          <tr><td style="padding: 8px 0;"><strong>Session</strong></td><td>${payload.sessionTitle}</td></tr>
          <tr><td style="padding: 8px 0;"><strong>Date</strong></td><td>${formatSessionDate(payload.sessionDate)}</td></tr>
          <tr><td style="padding: 8px 0;"><strong>Time</strong></td><td>${formatSessionTime(payload.startTime)}</td></tr>
          <tr><td style="padding: 8px 0;"><strong>Athlete</strong></td><td>${payload.athleteName}</td></tr>
          <tr><td style="padding: 8px 0;"><strong>Amount due</strong></td><td>${formatPrice(payload.amountDue)} (pay at facility)</td></tr>
          <tr><td style="padding: 8px 0;"><strong>Location</strong></td><td>${payload.location ?? SITE.address.full}</td></tr>
        </table>
        <p><strong>Payment is due at the facility.</strong></p>
        <p>
          ${SITE.name}<br/>
          ${SITE.address.full}<br/>
          ${SITE.phone}
        </p>
      </div>
    `,
  });
}

export async function sendStaffBookingNotification(payload: StaffPayload): Promise<void> {
  const staffEmail = process.env.STAFF_NOTIFICATION_EMAIL ?? SITE.email;
  if (!resend || !staffEmail) return;
  const from = process.env.RESEND_FROM_EMAIL ?? "bookings@signalworks.io";

  await resend.emails.send({
    from,
    to: staffEmail,
    subject: `New DAWGZ booking — ${payload.sessionTitle}`,
    html: `
      <div style="font-family: sans-serif;">
        <h2>New Online Booking</h2>
        <p>Confirmation: ${payload.booking.confirmation_number}</p>
        <p>Session: ${payload.sessionTitle}</p>
        <p>${formatSessionDate(payload.sessionDate)} at ${formatSessionTime(payload.startTime)}</p>
        <p>Parent: ${payload.parentName} · ${payload.parentPhone} · ${payload.parentEmail}</p>
        <p>Athlete: ${payload.athleteName}</p>
      </div>
    `,
  });
}

export async function sendWaitlistConfirmation(payload: {
  email: string;
  parentName: string;
  athleteName: string;
}): Promise<void> {
  if (!resend) return;
  const from = process.env.RESEND_FROM_EMAIL ?? "bookings@signalworks.io";

  await resend.emails.send({
    from,
    to: payload.email,
    subject: "You're on the DAWGZ waitlist",
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h1>Waitlist confirmation</h1>
        <p>Hi ${payload.parentName},</p>
        <p>${payload.athleteName} has been added to the waitlist. We'll contact you if a spot opens.</p>
        <p>${SITE.name} · ${SITE.phone}</p>
      </div>
    `,
  });
}
