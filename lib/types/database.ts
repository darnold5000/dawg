export type UserRole = "owner" | "admin" | "trainer";

export type SessionStatus =
  | "draft"
  | "published"
  | "full"
  | "cancelled"
  | "completed";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "waitlisted"
  | "expired";

export type AttendanceStatus =
  | "registered"
  | "attended"
  | "no_show"
  | "cancelled";

export type PaymentStatus =
  | "not_required"
  | "unpaid"
  | "pending"
  | "paid"
  | "failed"
  | "partially_refunded"
  | "refunded";

export type PaymentMethod = "stripe" | "pay_at_facility";

export type PaymentRequirement =
  | "pay_online"
  | "pay_at_facility"
  | "online_or_facility";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Trainer {
  id: string;
  profile_id: string | null;
  name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  specialties: string[] | null;
  certifications: string[] | null;
  coaching_experience: string | null;
  sports_background: string | null;
  active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  minimum_age: number | null;
  maximum_age: number | null;
  default_duration_minutes: number | null;
  default_capacity: number | null;
  default_price_cents: number | null;
  image_url: string | null;
  active: boolean;
  featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface SessionType {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}

export interface TrainingSession {
  id: string;
  program_id: string | null;
  session_type_id: string | null;
  trainer_id: string | null;
  title: string;
  description: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  minimum_age: number | null;
  maximum_age: number | null;
  skill_level: string | null;
  capacity: number;
  price_cents: number;
  deposit_amount_cents: number | null;
  currency: string;
  payment_requirement: PaymentRequirement;
  location_name: string | null;
  location_address: string | null;
  what_to_bring: string | null;
  cancellation_policy: string | null;
  status: SessionStatus;
  featured: boolean;
  published_at: string | null;
  recurrence_group_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionWithRelations extends TrainingSession {
  program?: Program | null;
  session_type?: SessionType | null;
  trainer?: Trainer | null;
  booked_count?: number;
  spots_remaining?: number;
}

export interface Parent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

export interface Athlete {
  id: string;
  parent_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  primary_sport: string | null;
  experience_level: string | null;
  medical_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  session_id: string;
  parent_id: string;
  athlete_id: string;
  confirmation_number: string;
  confirmation_token: string;
  status: BookingStatus;
  attendance_status: AttendanceStatus;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  amount_due_cents: number;
  amount_paid_cents: number;
  amount_refunded_cents: number;
  currency: string;
  stripe_customer_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  payment_failure_message: string | null;
  booking_expires_at: string | null;
  confirmation_email_sent_at: string | null;
  customer_notes: string | null;
  internal_notes: string | null;
  waiver_acknowledged_at: string | null;
  media_consent: boolean;
  booked_at: string;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingWithRelations extends Booking {
  parent?: Parent;
  athlete?: Athlete;
  session?: TrainingSession;
}

export interface PaymentTransaction {
  id: string;
  booking_id: string;
  transaction_type: "payment" | "refund" | "adjustment";
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_refund_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface StripeEventRow {
  id: string;
  stripe_event_id: string;
  event_type: string;
  booking_id: string | null;
  processed: boolean;
  processing_error: string | null;
  payload: unknown;
  created_at: string;
  processed_at: string | null;
}

export interface WaitlistEntry {
  id: string;
  session_id: string;
  parent_name: string;
  athlete_name: string;
  email: string;
  phone: string;
  status: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  reviewer_name: string;
  reviewer_description: string | null;
  athlete_sport: string | null;
  rating: number;
  review_text: string;
  published: boolean;
  featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessSettings {
  id: string;
  business_name: string;
  phone: string | null;
  email: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  map_embed_url: string | null;
  facebook_url: string | null;
  business_hours: string | null;
  homepage_announcement: string | null;
  cancellation_policy: string | null;
  booking_policy: string | null;
  updated_at: string;
}

export interface BlockedTime {
  id: string;
  trainer_id: string | null;
  start_datetime: string;
  end_datetime: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}
