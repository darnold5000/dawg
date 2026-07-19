export const SITE = {
  name: "DAWGZ Youth Training",
  shortName: "DAWGZ",
  tagline: "Build the Athlete. Develop the Mindset.",
  description:
    "DAWGZ Youth Training helps young athletes build strength, speed, agility, confidence, and discipline through positive, age-appropriate athletic training in Plainfield, Indiana.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://dawgz.hiresignalworks.com",
  phone: "(317) 555-0194",
  phoneHref: "tel:+13175550194",
  email: "coach@dawgzyouth.com",
  address: {
    line1: "920 Training Center Dr",
    city: "Plainfield",
    state: "IN",
    postalCode: "46168",
    full: "920 Training Center Dr, Plainfield, IN 46168",
  },
  facebookUrl: "https://www.facebook.com/DawgzYouthTraining",
  timezone: "America/Indiana/Indianapolis",
  mapEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3060!2d-86.389!3d39.704!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2s920%20Training%20Center%20Dr%2C%20Plainfield%2C%20IN%2046168!5e0!3m2!1sen!2sus!4v1",
  directionsUrl:
    "https://www.google.com/maps/dir/?api=1&destination=920+Training+Center+Dr,+Plainfield,+IN+46168",
  signalWorks: {
    name: "Signal Works",
    url: "https://signalworks.io",
  },
  hoursPlaceholder: "Contact DAWGZ for current training times",
} as const;

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/#training", label: "Training" },
  { href: "/schedule", label: "Schedule" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;
