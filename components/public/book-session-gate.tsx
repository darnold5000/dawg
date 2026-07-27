"use client";

import { useEffect, useState } from "react";
import { BookingForm } from "@/components/public/booking-form";
import { FamilyIntakeForm } from "@/components/public/family-intake-form";
import { loadBookingDraft } from "@/lib/booking-draft";
import { fetchRememberedFamily } from "@/lib/returning-family";
import type { SessionWithRelations } from "@/lib/types/database";

type Phase = "loading" | "intake" | "book";

export function BookSessionGate({
  session,
  waitlistMode = false,
}: {
  session: SessionWithRelations;
  waitlistMode?: boolean;
}) {
  const bookReturn = `/book/${session.id}${waitlistMode ? "?waitlist=1" : ""}`;
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    if (waitlistMode) {
      setPhase("book");
      return;
    }

    let cancelled = false;

    async function resolvePhase() {
      const family = await fetchRememberedFamily();
      const draft = loadBookingDraft(session.id);
      const params = new URLSearchParams();

      const email = family?.parentEmail || draft?.parentEmail;
      if (email) params.set("email", email);

      const draftAthleteId =
        draft?.selectedAthleteId &&
        draft.selectedAthleteId !== "__new__" &&
        /^[0-9a-f-]{36}$/i.test(draft.selectedAthleteId)
          ? draft.selectedAthleteId
          : null;
      const rememberedAthlete =
        family?.athletes.find((a) => a.id === draftAthleteId) ??
        family?.athletes[0];
      if (rememberedAthlete?.id) params.set("athleteId", rememberedAthlete.id);

      if (draft?.athleteFirstName) {
        params.set("athleteFirstName", draft.athleteFirstName);
      }
      if (draft?.athleteLastName) {
        params.set("athleteLastName", draft.athleteLastName);
      }
      if (draft?.athleteDob) {
        params.set("athleteDob", draft.athleteDob.slice(0, 10));
      }

      try {
        const res = await fetch(
          `/api/family/booking-context?${params.toString()}`,
          { credentials: "same-origin" },
        );
        if (!res.ok || cancelled) {
          if (!cancelled) setPhase("intake");
          return;
        }
        const data = (await res.json()) as { intakeRequired?: boolean };
        if (cancelled) return;
        setPhase(data.intakeRequired ? "intake" : "book");
      } catch {
        if (!cancelled) setPhase("intake");
      }
    }

    void resolvePhase();
    return () => {
      cancelled = true;
    };
  }, [session.id, waitlistMode]);

  if (phase === "loading") {
    return (
      <p className="text-sm text-muted-foreground">Checking your athlete info…</p>
    );
  }

  if (phase === "intake") {
    return (
      <div className="space-y-6">
        <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          One-time athlete intake is required before we can confirm a session.
          After you continue, you&apos;ll pick payment and complete the booking —
          no second intake step.
        </p>
        <FamilyIntakeForm
          returnTo={bookReturn}
          showAccountPrompt={false}
          bookingFlow
        />
      </div>
    );
  }

  return <BookingForm session={session} waitlistMode={waitlistMode} />;
}
