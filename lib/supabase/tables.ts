/**
 * Training vertical table names (Signal Works Pro).
 * Legacy hobby DB uses dawg_* — see supabase/migrations on main.
 */
export const TRAINING_TABLES = {
  staffProfiles: "training_staff_profiles",
  coaches: "training_coaches",
  programs: "training_programs",
  sessionTypes: "training_session_types",
  sessions: "training_sessions",
  sessionTemplates: "training_session_templates",
  guardians: "training_guardians",
  athletes: "training_athletes",
  bookings: "training_session_bookings",
  waitlistEntries: "training_waitlist_entries",
  reviews: "training_reviews",
  tenantSettings: "training_tenant_settings",
  blockedTimes: "training_blocked_times",
  stripeEvents: "training_stripe_events",
  paymentTransactions: "training_payment_transactions",
  deviceFamilies: "training_device_families",
  packages: "training_packages",
  packagePurchases: "training_package_purchases",
  packageRedemptions: "training_package_redemptions",
  packageCreditAdjustments: "training_package_credit_adjustments",
  intakeSubmissions: "training_intake_submissions",
  familyLoginTokens: "training_family_login_tokens",
} as const;

export type TrainingTableName =
  (typeof TRAINING_TABLES)[keyof typeof TRAINING_TABLES];

/** @deprecated Hobby Dugout names — use TRAINING_TABLES on this branch. */
export const DAWG_TABLES = {
  profiles: TRAINING_TABLES.staffProfiles,
  trainers: TRAINING_TABLES.coaches,
  programs: TRAINING_TABLES.programs,
  sessionTypes: TRAINING_TABLES.sessionTypes,
  sessions: TRAINING_TABLES.sessions,
  sessionTemplates: TRAINING_TABLES.sessionTemplates,
  parents: TRAINING_TABLES.guardians,
  athletes: TRAINING_TABLES.athletes,
  bookings: TRAINING_TABLES.bookings,
  waitlistEntries: TRAINING_TABLES.waitlistEntries,
  reviews: TRAINING_TABLES.reviews,
  businessSettings: TRAINING_TABLES.tenantSettings,
  blockedTimes: TRAINING_TABLES.blockedTimes,
  stripeEvents: TRAINING_TABLES.stripeEvents,
  paymentTransactions: TRAINING_TABLES.paymentTransactions,
  deviceFamilies: TRAINING_TABLES.deviceFamilies,
  packages: TRAINING_TABLES.packages,
  packagePurchases: TRAINING_TABLES.packagePurchases,
  packageRedemptions: TRAINING_TABLES.packageRedemptions,
  packageCreditAdjustments: TRAINING_TABLES.packageCreditAdjustments,
  intakeSubmissions: TRAINING_TABLES.intakeSubmissions,
  familyLoginTokens: TRAINING_TABLES.familyLoginTokens,
} as const;

export const BOOKING_RELATION_SELECT = `
  *,
  session:training_sessions (*),
  guardian:training_guardians (*),
  athlete:training_athletes (*)
`;

export const PACKAGE_PURCHASE_SELECT = `*, package:training_packages (*)`;
