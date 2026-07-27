import type { AdminGuideSection } from "@/lib/help/types";

/** Staff-only guide — operational detail for the admin portal. */
export const ADMIN_GUIDE_SECTIONS: AdminGuideSection[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    intro: "Start of day: what the home screen shows and where to go next.",
    blocks: [
      {
        heading: "Today’s schedule",
        paragraphs: [
          "The dashboard lists today’s sessions in time order. Open a session from here or from Schedule to view the roster.",
        ],
        bullets: [
          "This week’s bookings — jump to Bookings for recent reservations.",
          "Available spots (7 days) — capacity across upcoming sessions.",
          "Waitlisted athletes — families who joined waitlist on full classes.",
          "Revenue this month — paid online plus bookings marked paid at facility.",
        ],
      },
    ],
  },
  {
    id: "bookings",
    label: "Bookings",
    intro: "Reservations, payment types, and fixing payment state.",
    blocks: [
      {
        heading: "Bookings list",
        paragraphs: [
          "Bookings shows recent reservations with confirmation number, athlete, session, booking status, and how payment was set up (online, facility, or package credit).",
        ],
      },
      {
        heading: "Booking detail — billing panel",
        paragraphs: [
          "Open a booking for full parent/athlete info, attendance, and billing actions.",
        ],
        bullets: [
          "Pay online (Stripe): status should become Paid after checkout. Use Sync from Stripe if a parent paid but the booking is still pending.",
          "Pay at facility: use Mark paid when money is collected at check-in; Mark unpaid if you need to reverse a mistake.",
          "Full Stripe refund: available for card payments; confirm before issuing — refunds are not undone from the app.",
        ],
      },
      {
        heading: "Pending and expired holds",
        paragraphs: [
          "Abandoned Stripe checkouts may leave a booking pending until the hold expires. Stale holds are cleaned up automatically; the session may show open spots again.",
        ],
      },
    ],
  },
  {
    id: "roster",
    label: "Roster & attendance",
    intro: "Running class check-in and tying attendance to credits.",
    blocks: [
      {
        heading: "Session roster",
        paragraphs: [
          "From Schedule, open a session → Roster. Each row is a booking with payment badge and intake readiness when applicable.",
        ],
      },
      {
        heading: "Attendance statuses",
        paragraphs: [
          "Mark Registered, Attended, No-show, or Cancelled as appropriate. Attended is what triggers package credit redemption on credit-based classes.",
        ],
        bullets: [
          "Credit redeemed — toast shows package name and sessions remaining.",
          "No credits — athlete marked attended but no balance; collect payment or grant credits on the client profile.",
        ],
      },
    ],
  },
  {
    id: "clients",
    label: "Clients & intake",
    intro: "Family records, intake data, merge, and removal.",
    blocks: [
      {
        heading: "Client list",
        paragraphs: [
          "Families appear after a booking or package purchase. The list summarizes package balance when available.",
        ],
      },
      {
        heading: "Client profile",
        paragraphs: [
          "View athletes, contact info, and completed intake (emergency contacts, health notes, waiver version and date).",
        ],
        bullets: [
          "Merge parents — move athletes, bookings, purchases, intake, and device memory from a duplicate guardian into the primary record.",
          "Delete client — removes bookings, purchases, intake, and saved device association. Use only when you intend to erase the family from the system.",
        ],
      },
      {
        heading: "Intake readiness",
        paragraphs: [
          "Roster may show whether intake is complete before the athlete trains. Parents can complete intake during booking or via emailed secure links.",
        ],
      },
    ],
  },
  {
    id: "credits",
    label: "Package credits",
    intro: "Granting, adjusting, and syncing session credits (owner/admin).",
    blocks: [
      {
        heading: "How credits work",
        paragraphs: [
          "Parents buy packages online or at facility. Credits deduct when staff marks Attended on a package-credit session — not at purchase time.",
        ],
      },
      {
        heading: "Credit tools on client profile",
        paragraphs: [
          "Session credits panel (restricted roles):",
        ],
        bullets: [
          "Apply credits for attended sessions — backfill deductions if attendance was marked but credit did not move.",
          "Grant new credits — creates a new package purchase record with a chosen catalog package.",
          "Add or remove sessions — adjust balance on an existing purchase; add an optional note for audit.",
        ],
      },
      {
        heading: "Facility-paid packages",
        paragraphs: [
          "If a parent pays for a pack at the desk, ensure the purchase is recorded and paid (or grant credits manually) so roster redemption works.",
        ],
      },
    ],
  },
  {
    id: "sessions",
    label: "Sessions & programs",
    intro: "Creating classes, payment rules, and credit vs paid sessions.",
    blocks: [
      {
        heading: "Credit vs paid sessions",
        paragraphs: [
          "Group programs (Little/Big Dawgs, etc.) are usually package-credit rosters — $0 at booking, price lives on the package catalog.",
          "Private lessons and one-off classes can be Stripe-priced with payment requirement: pay online, pay at facility, or online or facility.",
        ],
      },
      {
        heading: "Programs, classes, templates",
        paragraphs: [
          "Programs define offerings. Classes and session templates drive recurring schedule generation. Edit capacity and payment requirement on the session when creating or editing.",
        ],
        bullets: [
          "Schedule — manage dated sessions and open rosters.",
          "Classes / templates — recurring patterns (admin roles).",
          "Availability — blocks affecting scheduling when configured.",
        ],
      },
    ],
  },
  {
    id: "pay-models",
    label: "Pay online vs facility",
    intro: "Quick reference for staff when money and status disagree.",
    blocks: [
      {
        paragraphs: [
          "Use this when a parent says they paid, or a roster row looks wrong.",
        ],
      },
      {
        heading: "Parent paid online",
        bullets: [
          "Booking payment status should be Paid; Stripe transaction listed on booking detail.",
          "If still pending: Sync from Stripe once, then check Stripe dashboard if needed.",
          "Refund: booking detail → full refund (Stripe only).",
        ],
      },
      {
        heading: "Parent chose pay at facility",
        bullets: [
          "Booking confirms immediately; payment status unpaid until you Mark paid.",
          "Revenue dashboard counts the booking after it is marked paid.",
        ],
      },
      {
        heading: "Package credit class",
        bullets: [
          "Booking shows package credit / not required payment at booking time.",
          "On attended: system redeems one credit if balance exists.",
          "No balance: sell package, grant credits, or handle as drop-in per your policy.",
        ],
      },
    ],
  },
];
