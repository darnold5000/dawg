import { ScheduleBrowser } from "@/components/public/schedule-browser";
import { getFilteredSessions, getSessionTypes } from "@/lib/data";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Training Schedule",
  description:
    "Browse and book youth athletic training sessions at DAWGZ in Mooresville, Indiana.",
  path: "/schedule",
});

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; age?: string; date?: string }>;
}) {
  const params = await searchParams;
  const [sessions, sessionTypes] = await Promise.all([
    getFilteredSessions({
      type: params.type,
      age: params.age,
      date: params.date,
    }),
    getSessionTypes(),
  ]);

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
          Filter by session type, age, or date. Reserve online — payment at the
          facility.
        </p>
      </div>
      <div className="mt-8">
        <ScheduleBrowser
          sessions={sessions}
          sessionTypes={sessionTypes}
          initialType={params.type}
          initialAge={params.age}
          initialDate={params.date}
        />
      </div>
    </div>
  );
}
