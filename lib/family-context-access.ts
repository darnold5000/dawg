import type { RememberedFamily } from "@/lib/family-device";
import type { IntakeFormContext } from "@/lib/intake";

/** Canonical empty intake context for guests and unauthorized lookups. */
export function emptyIntakeFormContext(): IntakeFormContext {
  return {
    mode: "full",
    parentOnFile: false,
    parentId: null,
    athleteId: null,
    alreadyComplete: false,
    parent: null,
    emergencyContacts: null,
    athlete: null,
  };
}

export type FamilyBookingContextResponse = {
  parentId: string | null;
  athleteId: string | null;
  intakeComplete: boolean;
  intakeRequired: boolean;
  creditsRemaining: number;
  purchases: Array<{
    id: string;
    sessions_remaining: number;
    packageName: string | null;
  }>;
  parentOnFile: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  } | null;
  athletesOnFile: Array<{
    id: string;
    firstName: string;
    lastName: string;
    dob: string;
    experienceLevel?: string;
  }>;
};

/** Canonical empty booking context — identical for unknown emails and new guests. */
export function emptyFamilyBookingContext(): FamilyBookingContextResponse {
  return {
    parentId: null,
    athleteId: null,
    intakeComplete: false,
    intakeRequired: true,
    creditsRemaining: 0,
    purchases: [],
    parentOnFile: null,
    athletesOnFile: [],
  };
}

export type AuthorizedFamilyContextQuery = {
  parentId: string;
  athleteId?: string | null;
  athleteFirstName?: string | null;
  athleteLastName?: string | null;
  athleteDob?: string | null;
};

/**
 * Resolve intake/booking context query params only when a valid device session
 * is present. Query email/parentId never identify a household without the cookie.
 */
export function resolveAuthorizedFamilyContextQuery(
  family: RememberedFamily | null,
  query: {
    parentId?: string | null;
    email?: string | null;
    athleteId?: string | null;
    athleteFirstName?: string | null;
    athleteLastName?: string | null;
    athleteDob?: string | null;
  },
): AuthorizedFamilyContextQuery | null {
  if (!family) return null;

  const requestedParentId = query.parentId?.trim();
  if (requestedParentId && requestedParentId !== family.parentId) {
    return null;
  }

  const requestedEmail = query.email?.trim().toLowerCase();
  if (
    requestedEmail &&
    requestedEmail !== family.parentEmail.trim().toLowerCase()
  ) {
    return null;
  }

  const athleteId = query.athleteId?.trim() || null;
  if (athleteId && !family.athletes.some((a) => a.id === athleteId)) {
    return null;
  }

  return {
    parentId: family.parentId,
    athleteId,
    athleteFirstName: query.athleteFirstName,
    athleteLastName: query.athleteLastName,
    athleteDob: query.athleteDob,
  };
}

/** Fields that must not appear in anonymous context responses. */
export function intakeContextContainsSensitivePii(
  context: IntakeFormContext,
): boolean {
  return Boolean(
    context.parentId ||
      context.parent ||
      context.emergencyContacts ||
      (context.athlete &&
        (context.athlete.healthIssues ||
          context.athlete.firstName ||
          context.athlete.lastName)),
  );
}

export function bookingContextContainsSensitivePii(
  context: FamilyBookingContextResponse,
): boolean {
  return Boolean(
    context.parentId ||
      context.parentOnFile ||
      context.athletesOnFile.length > 0 ||
      context.creditsRemaining > 0 ||
      context.purchases.length > 0,
  );
}
