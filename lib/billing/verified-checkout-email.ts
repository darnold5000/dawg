/** Stripe-verified email helpers (pure — safe to unit test). */

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type StripeEmailCarrier = {
  customer_details?: { email?: string | null } | null;
  customer_email?: string | null;
};

/** Email Stripe collected at Checkout — the only email we trust for ownership. */
export function verifiedCheckoutEmail(
  session: StripeEmailCarrier,
): string | null {
  const fromDetails = session.customer_details?.email?.trim();
  const fromSession = session.customer_email?.trim();
  const email = fromDetails || fromSession || null;
  return email ? normalizeEmail(email) : null;
}

/**
 * Decide which parent record should own a paid package purchase.
 * Form email is never used for matching — only exact normalized Stripe email.
 */
export function resolvePurchaseParentId(input: {
  verifiedEmail: string;
  provisionalParentId: string | null;
  parentIdForVerifiedEmail: string | null;
}): {
  parentId: string | null;
  shouldReassign: boolean;
  createsNewParent: boolean;
} {
  const { verifiedEmail, provisionalParentId, parentIdForVerifiedEmail } = input;
  if (!verifiedEmail) {
    return {
      parentId: provisionalParentId,
      shouldReassign: false,
      createsNewParent: false,
    };
  }

  if (parentIdForVerifiedEmail) {
    return {
      parentId: parentIdForVerifiedEmail,
      shouldReassign: parentIdForVerifiedEmail !== provisionalParentId,
      createsNewParent: false,
    };
  }

  return {
    parentId: null,
    shouldReassign: provisionalParentId !== null,
    createsNewParent: true,
  };
}
