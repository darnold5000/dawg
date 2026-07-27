import { TRAINING_TABLES, BOOKING_RELATION_SELECT, PACKAGE_PURCHASE_SELECT } from "@/lib/supabase/tables";

export const TRAINING_RPC = {
  tryCreateSessionBooking: "training_try_create_session_booking",
  redeemPackageCredit: "training_redeem_package_credit",
  expireStalePendingBookings: "training_expire_stale_pending_bookings",
  mergeGuardians: "training_merge_guardians",
} as const;

export const TRAINING_STORAGE = {
  coachPhotosBucket: "training-coach-photos",
  coachPhotoPath: (tenantId: string, coachId: string, fileName: string) =>
    `${tenantId}/coaches/${coachId}/${fileName}`,
} as const;

export { TRAINING_TABLES, BOOKING_RELATION_SELECT, PACKAGE_PURCHASE_SELECT };
