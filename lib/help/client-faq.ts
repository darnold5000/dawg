import type { FaqItem } from "@/lib/help/types";

/** Parent-facing FAQ — high level; details live in booking policy and staff guide. */
export const CLIENT_FAQ_ITEMS: FaqItem[] = [
  {
    id: "book-session",
    question: "How do I book a training session?",
    answerParagraphs: [
      "Open the training schedule, choose a class or private slot, and tap Book. You'll confirm the athlete, complete intake if needed, and choose how to pay when the session allows it.",
      "If a class is full, you can join the waitlist with your contact information.",
    ],
    link: { href: "/schedule", label: "View schedule" },
  },
  {
    id: "payments",
    question: "Can I pay online or at the facility?",
    answerParagraphs: [
      "It depends on the session. Some require card payment online, some are pay-at-facility only, and some let you choose either option at checkout.",
      "Pay online uses secure Stripe checkout. Pay at facility reserves your spot — you pay when you arrive. You'll get a confirmation email either way (online bookings confirm after payment completes).",
    ],
    link: { href: "/booking-policy", label: "Booking policy" },
  },
  {
    id: "packages",
    question: "What are training packages and credits?",
    answerParagraphs: [
      "Packages are prepaid bundles (for example a 10-pack). Many group programs book at no charge online because they use package credits instead of a per-session price.",
      "Credits are applied when your athlete attends — not at the moment you buy the pack. Buy more anytime from the packages page when you're running low.",
    ],
    link: { href: "/packages", label: "Training packages" },
  },
  {
    id: "intake",
    question: "Why do I need an intake form?",
    answerParagraphs: [
      "Each athlete completes a one-time intake before training: emergency contacts, health notes, shirt size, goals, and waiver acceptance.",
      "You can fill it out while booking or from a secure link in email. Adding another athlete? Choose “New athlete” on the booking form or complete intake again for that child.",
    ],
  },
  {
    id: "save-device",
    question: "What does “Save on this device” do?",
    answerParagraphs: [
      "It remembers your parent contact info and athlete list on this phone or browser so the next booking is faster. It does not store medical notes in plain browser storage.",
      "You can still complete or update intake when policies change or for a new athlete.",
    ],
  },
  {
    id: "phone-app",
    question: "Can I add DAWG to my home screen?",
    answerParagraphs: [
      "Yes. On iPhone, use Share → Add to Home Screen. On Android, use Install app or Add to Home screen. It opens like a shortcut to the schedule and booking flow.",
    ],
  },
  {
    id: "online-hold",
    question: "I started paying online but didn’t finish — is my spot held?",
    answerParagraphs: [
      "Online checkout has a short hold window. If payment isn’t completed in time, the hold may expire and the spot can open for someone else. You can return to the schedule and try again.",
    ],
  },
  {
    id: "help-contact",
    question: "Who do I contact for help?",
    answerParagraphs: [
      "Use the contact page for questions about programs, billing at the facility, or schedule changes. For urgent day-of issues, use the phone or email listed on your confirmation.",
    ],
    link: { href: "/contact", label: "Contact us" },
  },
];
