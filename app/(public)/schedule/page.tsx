import { ScheduleBrowser } from "@/components/public/schedule-browser";
import { getFilteredSessions } from "@/lib/data";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Training Schedule",
  description:
    "Browse and book youth athletic training sessions at DAWG in Mooresville, Indiana.",
  path: "/schedule",
});

export default async function SchedulePage() {
  const sessions = await getFilteredSessions({});

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
      <div className="max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand">
          Schedule
        </p>
        <h1 className="font-heading text-4xl tracking-wide md:text-5xl">
          Book Training
        </h1>
        <p className="mt-4 text-muted-foreground">
          Browse upcoming sessions and reserve your athlete&apos;s spot on the
          roster.
        </p>
      </div>
      <div className="mt-8">
        <ScheduleBrowser sessions={sessions} />
      </div>
    </div>
  );
}
