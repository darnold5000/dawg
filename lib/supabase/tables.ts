/**
 * DAWG table names in the shared Dugout Intel Supabase project.
 * Prefixed to avoid collisions with existing tables.
 */
export const DAWG_TABLES = {
  profiles: "dawg_profiles",
  trainers: "dawg_trainers",
  programs: "dawg_programs",
  sessionTypes: "dawg_session_types",
  sessions: "dawg_sessions",
  parents: "dawg_parents",
  athletes: "dawg_athletes",
  bookings: "dawg_bookings",
  waitlistEntries: "dawg_waitlist_entries",
  reviews: "dawg_reviews",
  businessSettings: "dawg_business_settings",
  blockedTimes: "dawg_blocked_times",
  stripeEvents: "dawg_stripe_events",
  paymentTransactions: "dawg_payment_transactions",
  deviceFamilies: "dawg_device_families",
  packages: "dawg_packages",
  packagePurchases: "dawg_package_purchases",
  packageRedemptions: "dawg_package_redemptions",
  intakeSubmissions: "dawg_intake_submissions",
} as const;
