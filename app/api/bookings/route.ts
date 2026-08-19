import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { bookingSchema, createPublicBooking } from "@/lib/bookings";
import { ensureBookingCheckout } from "@/lib/billing/checkout";
import {
  bookingCancelUrl,
  bookingSuccessUrl,
} from "@/lib/billing/site-url";
import { expirePendingBooking } from "@/lib/billing/adapter";
import { reconcileCheckoutSession } from "@/lib/billing/reconcile-checkout";
import {
  getAuthenticatedFamily,
  intakePath,
  parentEmailMatches,
} from "@/lib/family-auth";
import { applyRememberedFamilyToBookingBody } from "@/lib/booking-contact-email";
import { bookingErrorHttpStatus } from "@/lib/booking-retry";

const recent = new Map<string, number>();

function rateLimited(key: string, windowMs = 15_000): boolean {
  const now = Date.now();
  const last = recent.get(key) ?? 0;
  if (now - last < windowMs) return true;
  recent.set(key, now);
  return false;
}

export async function POST(request: Request) {
  try {
    const rawBody = (await request.json()) as Record<string, unknown>;
    const family = await getAuthenticatedFamily();
    const submittedEmail =
      typeof rawBody.parentEmail === "string" ? rawBody.parentEmail.trim() : "";
    console.info("[bookings] email decision", {
      authenticatedFamilyPresent: Boolean(family),
      submittedEmailPresent: Boolean(submittedEmail),
      emailMatchesFamily: family
        ? parentEmailMatches(family, submittedEmail || family.parentEmail)
        : null,
    });

    const body = applyRememberedFamilyToBookingBody(rawBody, family);
    const parsed = bookingSchema.parse(body);

    if (family && !parentEmailMatches(family, parsed.parentEmail)) {
      return NextResponse.json(
        {
          error: "Use the email for your signed-in family on this device.",
          code: "EMAIL_MISMATCH",
        },
        { status: 403 },
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    if (rateLimited(`${ip}:${parsed.parentEmail}`)) {
      console.info("[bookings] duplicate submit within window; continuing idempotently");
    }

    const result = await createPublicBooking(parsed);
    if (!result.ok) {
      if (result.code === "INTAKE_REQUIRED" || result.code === "WAIVER_RENEWAL_REQUIRED") {
        const bookReturn = `/book/${parsed.sessionId}`;
        return NextResponse.json(
          {
            error: result.error,
            code: result.code,
            intakeUrl: intakePath(bookReturn),
          },
          { status: 403 },
        );
      }
      const status = bookingErrorHttpStatus(result.code);
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status },
      );
    }

    if (
      result.requiresCheckout &&
      !result.demo &&
      !result.coveredByPackageCredit
    ) {
      const checkout = await ensureBookingCheckout({
        bookingId: result.booking.id,
        successUrl: bookingSuccessUrl({
          bookingId: result.booking.id,
          token: result.booking.confirmation_token,
        }),
        cancelUrl: bookingCancelUrl({
          bookingId: result.booking.id,
          token: result.booking.confirmation_token,
        }),
      });

      if (!checkout.ok) {
        if (!result.resumed) {
          await expirePendingBooking({
            bookingId: result.booking.id,
            reason: checkout.error,
          });
        }
        return NextResponse.json(
          {
            error: checkout.error || "Could not start online payment.",
            code: checkout.code ?? "CHECKOUT_FAILED",
          },
          { status: 400 },
        );
      }

      if (checkout.data.alreadyPaid) {
        await reconcileCheckoutSession({
          checkoutSessionId: checkout.data.sessionId,
        });
        return NextResponse.json({
          confirmationNumber: result.booking.confirmation_number,
          confirmationToken: result.booking.confirmation_token,
          bookingId: result.booking.id,
          requiresCheckout: false,
          coveredByPackageCredit: false,
          resumed: Boolean(result.resumed),
        });
      }

      console.info(
        "[bookings]",
        {
          outcome: checkout.data.reused ? "checkout_reused" : "checkout_replaced",
          booking_id: result.booking.id,
          session_id: parsed.sessionId,
          athlete_id: result.booking.athlete_id,
          checkout_session_id: checkout.data.sessionId,
        },
      );

      return NextResponse.json({
        confirmationNumber: result.booking.confirmation_number,
        confirmationToken: result.booking.confirmation_token,
        bookingId: result.booking.id,
        checkoutUrl: checkout.data.url,
        checkoutSessionId: checkout.data.sessionId,
        requiresCheckout: true,
        coveredByPackageCredit: false,
        resumed: Boolean(result.resumed),
      });
    }

    return NextResponse.json({
      confirmationNumber: result.booking.confirmation_number,
      confirmationToken: result.booking.confirmation_token,
      bookingId: result.booking.id,
      demo: result.demo ?? false,
      requiresCheckout: false,
      coveredByPackageCredit: result.coveredByPackageCredit ?? false,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const flat = error.flatten();
      const fieldMessages = Object.values(flat.fieldErrors)
        .flat()
        .filter(Boolean);
      const first =
        fieldMessages[0] ||
        flat.formErrors[0] ||
        "Please check the form and try again.";
      return NextResponse.json(
        { error: first, details: flat },
        { status: 400 },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Unexpected error creating booking." },
      { status: 500 },
    );
  }
}
