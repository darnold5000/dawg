import { createMetadata } from "@/lib/seo";
import { SITE } from "@/lib/constants";

export const metadata = createMetadata({
  title: "Privacy Policy",
  description: `Privacy policy for ${SITE.name}.`,
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-heading text-4xl tracking-wide">Privacy Policy</h1>
      <div className="prose prose-neutral mt-6 max-w-none space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          {SITE.name} collects parent and athlete information solely to manage
          training reservations, communicate about sessions, and operate the
          business. We do not sell personal information.
        </p>
        <p>
          Booking forms may collect names, email addresses, phone numbers, athlete
          dates of birth, sports information, and optional medical notes needed
          for safe training.
        </p>
        <p>
          Contact us at{" "}
          <a href={`mailto:${SITE.email}`} className="text-foreground underline">
            {SITE.email}
          </a>{" "}
          or{" "}
          <a href={SITE.phoneHref} className="text-foreground underline">
            {SITE.phone}
          </a>{" "}
          with privacy questions. This page is a starting draft and should be
          reviewed by DAWGZ before launch.
        </p>
      </div>
    </div>
  );
}
