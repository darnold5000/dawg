import { SITE } from "@/lib/constants";

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    SITE.url.replace(/\/$/, "")
  );
}

export function bookingSuccessUrl(params: {
  bookingId: string;
  token: string;
}): string {
  const base = getSiteUrl();
  // Stripe replaces the literal {CHECKOUT_SESSION_ID} token.
  return `${base}/booking/success?booking_id=${encodeURIComponent(params.bookingId)}&token=${encodeURIComponent(params.token)}&session_id={CHECKOUT_SESSION_ID}`;
}

export function bookingCancelUrl(params: {
  bookingId: string;
  token: string;
}): string {
  const base = getSiteUrl();
  const q = new URLSearchParams({
    booking_id: params.bookingId,
    token: params.token,
  });
  return `${base}/booking/cancelled?${q.toString()}`;
}
