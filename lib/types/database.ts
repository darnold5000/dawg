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
  | "attended"
  | "no_show"
  | "refunded";

export type PaymentStatus =
  | "not_required"
  | "pending"
  | "deposit_paid"
  | "paid"
  | "refunded"
  | "pay_at_facility";

export type PaymentRequirement =
  | "full_at_booking"
  | "deposit_at_booking"
  | "pay_at_facility";

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
  default_price: number | null;
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
  price: number;
  deposit_amount: number | null;
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
  status: BookingStatus;
  payment_status: PaymentStatus;
  amount_due: number;
  amount_paid: number;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
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
