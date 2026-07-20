import { Resend } from "resend";
import { SITE } from "@/lib/constants";
import { buildIcsCalendar, calendarDetailsLine } from "@/lib/calendar";
import { formatPrice, formatSessionDate, formatSessionTime } from "@/lib/format";
import { getSiteUrl } from "@/lib/billing/site-url";
import type { Booking, PaymentMethod, PaymentStatus } from "@/lib/types/database";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function fromAddress() {
  return process.env.RESEND_FROM_EMAIL ?? "bookings@signalworks.io";
}

function requireResend() {
  if (!resend) {
    console.error("[email] RESEND_API_KEY is not set — skipping send");
    throw new Error("EMAIL_NOT_CONFIGURED");
  }
  return resend;
}

async function sendEmail(
  payload: Parameters<NonNullable<typeof resend>["emails"]["send"]>[0],
  label: string,
) {
  const client = requireResend();
  const { data, error } = await client.emails.send(payload);
  if (error) {
    console.error(`[email] ${label} failed:`, error);
    throw new Error(error.message || `EMAIL_SEND_FAILED:${label}`);
  }
  return data;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paymentLabel(method: PaymentMethod, opts?: { paid?: boolean }) {
  if (method === "stripe") {
    return opts?.paid === false ? "Pay Online" : "Paid Online";
  }
  if (method === "package_credit") return "Package credit";
  return "Pay at Facility";
}

function row(label: string, value: string) {
  return `
    <tr>
      <td style="padding: 10px 0; color: #666; vertical-align: top; width: 140px;">${label}</td>
      <td style="padding: 10px 0; color: #121212; font-weight: 600;">${value}</td>
    </tr>
  `;
}

export type ConfirmPayload = {
  booking: Booking;
  parentEmail: string;
  parentName: string;
  athleteName: string;
  sessionTitle: string;
  sessionDate: string;
  startTime: string;
  endTime?: string | null;
  location: string | null;
  coachName?: string | null;
  amountDueCents: number;
  amountPaidCents?: number;
  paymentMethod: PaymentMethod;
};

export type StaffPayload = {
  booking: Booking;
  parentEmail: string;
  parentName: string;
  parentPhone: string;
  athleteName: string;
  sessionTitle: string;
  sessionDate: string;
  startTime: string;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod | null;
  amountDueCents: number;
};

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export async function sendBookingConfirmation(
  payload: ConfirmPayload,
): Promise<void> {
  const paidOnline = payload.paymentMethod === "stripe";
  const paymentText = paymentLabel(payload.paymentMethod, { paid: paidOnline });
  const location = escapeHtml(payload.location ?? SITE.address.full);
  const coach = payload.coachName?.trim() || null;
  // Launch: cancellations disabled — do not surface cancel policy in confirmations.
  // const site = getSiteUrl();
  // const cancelPolicyUrl = `${site}/booking-policy`;
  const endTime = payload.endTime || payload.startTime;

  const ics = buildIcsCalendar({
    title: `${payload.sessionTitle} — ${payload.athleteName}`,
    sessionDate: payload.sessionDate,
    startTime: payload.startTime,
    endTime,
    location: payload.location ?? SITE.address.full,
    details: calendarDetailsLine({
      athleteName: payload.athleteName,
      confirmationNumber: payload.booking.confirmation_number,
      coachName: coach,
    }),
    uid: `${payload.booking.id}@dawg`,
  });

  const hi = escapeHtml(firstName(payload.parentName));

  await sendEmail(
    {
      from: fromAddress(),
      to: payload.parentEmail,
      replyTo: SITE.email,
      subject: "Your DAWG Training Session is Confirmed",
      attachments: [
        {
          filename: "dawg-session.ics",
          content: Buffer.from(ics, "utf8"),
          contentType: "text/calendar; charset=utf-8; method=PUBLISH",
        },
      ],
      html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #121212;">
        <h1 style="font-size: 24px; margin: 0 0 8px;">You're all set!</h1>
        <p style="margin: 0 0 24px; color: #444;">Hi ${hi},</p>
        <p style="margin: 0 0 24px;">Your training session is confirmed. A calendar invite is attached so you can add it in one tap.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px;">
          ${row("Training", escapeHtml(payload.sessionTitle))}
          ${row("Athlete", escapeHtml(payload.athleteName))}
          ${row("Date", escapeHtml(formatSessionDate(payload.sessionDate)))}
          ${row("Time", escapeHtml(formatSessionTime(payload.startTime)))}
          ${coach ? row("Coach", escapeHtml(coach)) : ""}
          ${row("Location", location)}
          ${row("Payment", escapeHtml(paymentText))}
          ${row("Confirmation #", escapeHtml(payload.booking.confirmation_number))}
        </table>
        <p style="margin: 0 0 8px;"><strong>Questions?</strong></p>
        <p style="margin: 0 0 24px; color: #444;">
          Reply to this email, or call
          <a href="${SITE.phoneHref}" style="color: #121212;">${SITE.phone}</a>.
        </p>
        <p style="margin: 0; color: #888; font-size: 13px;">
          ${escapeHtml(SITE.name)}<br/>
          ${escapeHtml(SITE.address.full)}
        </p>
      </div>
    `,
    },
    "booking-confirmation",
  );
}

export async function sendStaffBookingNotification(
  payload: StaffPayload,
): Promise<void> {
  const staffEmail = process.env.STAFF_NOTIFICATION_EMAIL ?? SITE.email;
  if (!staffEmail) {
    console.error("[email] STAFF_NOTIFICATION_EMAIL / SITE.email missing");
    throw new Error("STAFF_EMAIL_NOT_CONFIGURED");
  }

  const site = getSiteUrl();
  const viewUrl = `${site}/admin/bookings/${payload.booking.id}`;
  const method =
    payload.paymentMethod === "stripe"
      ? "Paid Online"
      : payload.paymentMethod === "package_credit"
        ? "Package credit"
        : payload.paymentMethod === "pay_at_facility"
          ? "Pay at Facility"
          : payload.paymentStatus === "paid"
            ? "Paid Online"
            : "Pay at Facility";

  await sendEmail(
    {
      from: fromAddress(),
      to: staffEmail,
      subject: `New Booking — ${payload.athleteName}`,
      html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #121212;">
        <h1 style="font-size: 22px; margin: 0 0 16px;">New Booking</h1>
        <p style="margin: 0 0 8px; font-size: 18px; font-weight: 700;">${escapeHtml(payload.athleteName)}</p>
        <p style="margin: 0 0 8px;">${escapeHtml(formatSessionDate(payload.sessionDate))} · ${escapeHtml(formatSessionTime(payload.startTime))}</p>
        <p style="margin: 0 0 8px;">${escapeHtml(payload.sessionTitle)}</p>
        <p style="margin: 0 0 8px;"><strong>${escapeHtml(method)}</strong> · ${escapeHtml(formatPrice(payload.amountDueCents))}</p>
        <p style="margin: 0 0 24px; color: #555;">
          ${escapeHtml(payload.parentName)} · ${escapeHtml(payload.parentPhone)} · ${escapeHtml(payload.parentEmail)}<br/>
          Confirmation ${escapeHtml(payload.booking.confirmation_number)}
        </p>
        <p style="margin: 0;">
          <a href="${viewUrl}" style="display: inline-block; background: #c45c26; color: #fff; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 600;">
            View Booking
          </a>
        </p>
      </div>
    `,
    },
    "staff-booking",
  );
}

// Launch: cancellations disabled — keep for later.
// export async function sendBookingCancellationEmail(payload: {
//   parentEmail: string;
//   parentName: string;
//   athleteName: string;
//   sessionTitle: string;
//   sessionDate: string;
//   startTime: string;
//   confirmationNumber: string;
//   refundInitiated?: boolean;
// }): Promise<void> {
//   if (!resend) return;
//
//   const hi = escapeHtml(firstName(payload.parentName));
//   const refundLine = payload.refundInitiated
//     ? "<p style=\"margin: 0 0 24px;\">A refund has been initiated for your online payment. It may take several business days to appear on your statement.</p>"
//     : "";
//
//   await resend.emails.send({
//     from: fromAddress(),
//     to: payload.parentEmail,
//     replyTo: SITE.email,
//     subject: "Your DAWG booking has been cancelled",
//     html: `
//       <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #121212;">
//         <h1 style="font-size: 22px; margin: 0 0 8px;">Booking cancelled</h1>
//         <p style="margin: 0 0 24px;">Hi ${hi},</p>
//         <p style="margin: 0 0 24px;">Your booking has been cancelled.</p>
//         <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px;">
//           ${row("Training", escapeHtml(payload.sessionTitle))}
//           ${row("Athlete", escapeHtml(payload.athleteName))}
//           ${row("Date", escapeHtml(formatSessionDate(payload.sessionDate)))}
//           ${row("Time", escapeHtml(formatSessionTime(payload.startTime)))}
//           ${row("Confirmation #", escapeHtml(payload.confirmationNumber))}
//         </table>
//         ${refundLine}
//         <p style="margin: 0; color: #444;">
//           Questions? Reply to this email or call
//           <a href="${SITE.phoneHref}" style="color: #121212;">${SITE.phone}</a>.
//         </p>
//       </div>
//     `,
//   });
// }

export async function sendWaitlistConfirmation(payload: {
  email: string;
  parentName: string;
  athleteName: string;
}): Promise<void> {
  await sendEmail(
    {
      from: fromAddress(),
      to: payload.email,
      replyTo: SITE.email,
      subject: "You're on the DAWG waitlist",
      html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto;">
        <h1 style="font-size: 22px;">You're on the list</h1>
        <p>Hi ${escapeHtml(firstName(payload.parentName))},</p>
        <p>${escapeHtml(payload.athleteName)} has been added to the waitlist. We'll contact you if a spot opens.</p>
        <p style="color: #888;">${escapeHtml(SITE.name)} · ${SITE.phone}</p>
      </div>
    `,
    },
    "waitlist",
  );
}

export async function sendContactNotification(payload: {
  parentName: string;
  email: string;
  phone?: string;
  athleteAge?: number;
  message: string;
}): Promise<void> {
  const staffEmail = process.env.STAFF_NOTIFICATION_EMAIL ?? SITE.email;
  if (!staffEmail) {
    console.error("[email] STAFF_NOTIFICATION_EMAIL / SITE.email missing");
    throw new Error("STAFF_EMAIL_NOT_CONFIGURED");
  }

  await sendEmail(
    {
      from: fromAddress(),
      to: staffEmail,
      replyTo: payload.email,
      subject: `DAWG website contact — ${payload.parentName}`,
      html: `
      <div style="font-family: sans-serif;">
        <h2>New contact form message</h2>
        <p><strong>Name:</strong> ${escapeHtml(payload.parentName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(payload.phone || "—")}</p>
        <p><strong>Athlete age:</strong> ${payload.athleteAge ?? "—"}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${escapeHtml(payload.message)}</p>
      </div>
    `,
    },
    "contact-notification",
  );
}

export async function sendContactAcknowledgement(payload: {
  parentName: string;
  email: string;
}): Promise<void> {
  await sendEmail(
    {
      from: fromAddress(),
      to: payload.email,
      replyTo: SITE.email,
      subject: "We received your message — DAWG Youth Training",
      html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h1>Thanks for reaching out</h1>
        <p>Hi ${escapeHtml(firstName(payload.parentName))},</p>
        <p>We received your message and will get back to you soon.</p>
        <p>
          ${escapeHtml(SITE.name)}<br/>
          ${SITE.phone}<br/>
          ${SITE.email}
        </p>
      </div>
    `,
    },
    "contact-ack",
  );
}

export async function sendPackagePurchaseConfirmation(payload: {
  parentEmail: string;
  parentName: string;
  packageName: string;
  sessionsTotal: number;
  amountPaidCents: number;
}): Promise<void> {
  await sendEmail(
    {
      from: fromAddress(),
      to: payload.parentEmail,
      replyTo: SITE.email,
      subject: `Your DAWG package — ${payload.packageName}`,
      html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #121212;">
        <h1 style="font-size: 22px; margin: 0 0 12px;">Package purchased</h1>
        <p>Hi ${escapeHtml(firstName(payload.parentName))},</p>
        <p>Your <strong>${escapeHtml(payload.packageName)}</strong> is ready.</p>
        <p><strong>${payload.sessionsTotal}</strong> session${payload.sessionsTotal === 1 ? "" : "s"} · ${escapeHtml(formatPrice(payload.amountPaidCents))} paid</p>
        <p>Book from the schedule and choose <strong>Use package credit</strong> at checkout.</p>
        <p style="color: #666; font-size: 13px;">${escapeHtml(SITE.name)} · ${SITE.phone}</p>
      </div>
    `,
    },
    "package-purchase",
  );
}

export async function sendFamilyLoginEmail(payload: {
  parentEmail: string;
  parentFirstName: string;
  token: string;
}): Promise<void> {
  const site = getSiteUrl();
  const link = `${site}/my/verify?token=${encodeURIComponent(payload.token)}`;

  await sendEmail(
    {
      from: fromAddress(),
      to: payload.parentEmail,
      replyTo: SITE.email,
      subject: "Your DAWG account sign-in link",
      html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #121212;">
        <h1 style="font-size: 22px; margin: 0 0 12px;">Sign in to your account</h1>
        <p>Hi ${escapeHtml(payload.parentFirstName)},</p>
        <p>Use this secure link to view your athletes, packages, and session credits. It expires in 30 minutes.</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="display: inline-block; background: #121212; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Open my account
          </a>
        </p>
        <p style="color: #666; font-size: 13px;">If you did not request this, you can ignore this email.</p>
      </div>
    `,
      text: `Sign in to your DAWG account: ${link}\n\nThis link expires in 30 minutes.`,
    },
    "family-login",
  );
}

export async function sendIntakeStaffNotification(payload: {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  athleteName: string;
  packageInterest?: string | null;
}): Promise<void> {
  const staffEmail = process.env.STAFF_NOTIFICATION_EMAIL ?? SITE.email;
  if (!staffEmail) throw new Error("STAFF_EMAIL_NOT_CONFIGURED");
  await sendEmail(
    {
      from: fromAddress(),
      to: staffEmail,
      replyTo: payload.parentEmail,
      subject: `New DAWG intake — ${payload.athleteName}`,
      html: `
      <div style="font-family: sans-serif;">
        <h2>New client intake</h2>
        <p><strong>Athlete:</strong> ${escapeHtml(payload.athleteName)}</p>
        <p><strong>Parent:</strong> ${escapeHtml(payload.parentName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(payload.parentEmail)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(payload.parentPhone)}</p>
        <p><strong>Package interest:</strong> ${escapeHtml(payload.packageInterest || "—")}</p>
      </div>
    `,
    },
    "intake-staff",
  );
}

/** Staff-initiated message to a parent from the Clients page. */
export async function sendParentStaffMessage(payload: {
  parentName: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  const hi = escapeHtml(firstName(payload.parentName));
  const bodyHtml = escapeHtml(payload.message).replace(/\n/g, "<br/>");

  await sendEmail(
    {
      from: fromAddress(),
      to: payload.email,
      replyTo: SITE.email,
      subject: payload.subject,
      html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #121212;">
        <p style="margin: 0 0 16px;">Hi ${hi},</p>
        <div style="margin: 0 0 24px; line-height: 1.5;">${bodyHtml}</div>
        <p style="margin: 0; color: #666; font-size: 13px;">
          ${escapeHtml(SITE.name)} · ${SITE.phone}<br/>
          Reply to this email to reach us directly.
        </p>
      </div>
    `,
    },
    "staff-to-parent",
  );
}
