export const SITE = {
  name: "DAWG Youth Training",
  shortName: "DAWG",
  tagline: "Build the Athlete. Develop the Mindset.",
  description:
    "DAWG Youth Training helps young athletes build strength, speed, agility, confidence, and discipline through positive, age-appropriate athletic training in Mooresville, Indiana.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  phone: "(317) 835-1076",
  phoneHref: "tel:+13178351076",
  email: "coachavery1287@gmail.com",
  address: {
    line1: "477 Town Center St",
    city: "Mooresville",
    state: "IN",
    postalCode: "46158",
    full: "477 Town Center St, Mooresville, IN 46158",
  },
  facebookUrl: "https://www.facebook.com/DawgYouthTraining",
  timezone: "America/Indiana/Indianapolis",
  mapEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3080.5!2d-86.37!3d39.61!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2s477%20Town%20Center%20St%2C%20Mooresville%2C%20IN!5e0!3m2!1sen!2sus!4v1",
  directionsUrl:
    "https://www.google.com/maps/dir/?api=1&destination=477+Town+Center+St,+Mooresville,+IN+46158",
  signalWorks: {
    name: "Signal Works",
    url: "https://signalworks.io",
  },
  hoursPlaceholder: "Hours TBD — contact DAWG for current training times",
} as const;

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/#training", label: "Training" },
  { href: "/schedule", label: "Schedule" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;
