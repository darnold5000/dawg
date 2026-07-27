"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toastError, toastSuccess } from "@/lib/toast-messages";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PolicyLinkButton } from "@/components/public/policy-dialog";
import type { SessionWithRelations } from "@/lib/types/database";
import { isMinorAthlete } from "@/lib/athlete-age";
import { buildIntakePayloadFromBooking, INTAKE_SHIRT_SIZES } from "@/lib/booking-intake-payload";
import {
  fetchRememberedFamily,
  forgetRememberedFamily,
  saveDemoFamily,
  type SavedAthlete,
  type SavedFamily,
} from "@/lib/returning-family";

function persistRememberedBookingLocally(input: {
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
  athleteFirstName: string;
  athleteLastName: string;
  athleteDob: string;
  athleteId?: string;
  experienceLevel?: string;
}) {
  saveDemoFamily(input);
}
import {
  clearBookingDraft,
  loadBookingDraft,
  saveBookingDraft,
} from "@/lib/booking-draft";
import {
  allowedPaymentMethods,
  defaultPaymentMethod,
  isOnlineCardPaymentEnabled,
  paymentMethodLabel,
  selectablePaymentMethods,
} from "@/lib/billing/payment-options";
import type { PaymentMethod } from "@/lib/types/database";
import {
  formatPrice,
  formatSessionDate,
  formatSessionTime,
} from "@/lib/format";
import {
  BOOKING_EXPERIENCE_LEVELS,
  BOOKING_SCHOOL_GRADES,
} from "@/lib/booking-athlete-options";
import { isRosterCreditSession } from "@/lib/roster-credit-sessions";

const emptyForm = {
  parentFirstName: "",
  parentLastName: "",
  parentEmail: "",
  parentPhone: "",
  athleteFirstName: "",
  athleteLastName: "",
  athleteDob: "",
  athleteEmail: "",
  athletePhone: "",
  schoolGrade: "",
  experienceLevel: "",
  heightWeight: "",
  sportPosition: "",
  healthIssues: "",
  emergencyContact1Name: "",
  emergencyContact1Phone: "",
  emergencyContact2Name: "",
  emergencyContact2Phone: "",
  shirtSize: "",
  goal: "",
  acceptRequiredAgreements: false,
  mediaConsent: false,
  rememberFamily: false,
  waitlistParentName: "",
  waitlistAthleteName: "",
  waitlistEmail: "",
  waitlistPhone: "",
};

export function BookingForm({
  session,
  waitlistMode = false,
}: {
  session: SessionWithRelations;
  waitlistMode?: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [savedFamily, setSavedFamily] = useState<SavedFamily | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  const [form, setForm] = useState(emptyForm);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [resolvedAthleteId, setResolvedAthleteId] = useState<string | null>(
    null,
  );

  const rosterCredit = useMemo(
    () => isRosterCreditSession(session),
    [session],
  );

  const paymentOptions = useMemo(
    () => selectablePaymentMethods(session.payment_requirement),
    [session.payment_requirement],
  );
  const showDisabledPayOnline = useMemo(() => {
    if (isOnlineCardPaymentEnabled()) return false;
    return allowedPaymentMethods(session.payment_requirement).includes("stripe");
  }, [session.payment_requirement]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">(
    () => defaultPaymentMethod(session.payment_requirement) ?? "",
  );

  const athleteDob = form.athleteDob.trim().slice(0, 10);
  const hasValidDob = /^\d{4}-\d{2}-\d{2}$/.test(athleteDob);
  const minor = hasValidDob ? isMinorAthlete(athleteDob) : true;
  const agreementsNeeded = !savedFamily?.agreementsCurrent;

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const draft = loadBookingDraft(session.id);
      const family = await fetchRememberedFamily();

      if (cancelled) return;

      if (family && family.athletes.length > 0) {
        setSavedFamily(family);
        const athlete =
          family.athletes.find((a) => a.id === draft?.selectedAthleteId) ??
          family.athletes[0];
        setSelectedAthleteId(athlete.id);
        setForm((prev) => ({
          ...prev,
          parentFirstName: draft?.parentFirstName || family.parentFirstName,
          parentLastName: draft?.parentLastName || family.parentLastName,
          parentEmail: draft?.parentEmail || family.parentEmail,
          parentPhone: draft?.parentPhone || family.parentPhone,
          athleteFirstName: draft?.athleteFirstName || athlete.firstName,
          athleteLastName: draft?.athleteLastName || athlete.lastName,
          athleteDob: draft?.athleteDob || athlete.dob,
          schoolGrade: draft?.schoolGrade || "",
          experienceLevel:
            draft?.experienceLevel || athlete.experienceLevel || "",
          heightWeight: draft?.heightWeight ?? "",
          sportPosition: draft?.sportPosition ?? "",
          healthIssues:
            draft?.healthIssues ||
            draft?.bookingNotes ||
            "",
          emergencyContact1Name: draft?.emergencyContact1Name ?? "",
          emergencyContact1Phone: draft?.emergencyContact1Phone ?? "",
          emergencyContact2Name: draft?.emergencyContact2Name ?? "",
          emergencyContact2Phone: draft?.emergencyContact2Phone ?? "",
          shirtSize: draft?.shirtSize ?? "",
          goal: draft?.goal ?? "",
          rememberFamily: draft?.rememberFamily ?? true,
          mediaConsent:
            draft?.mediaConsent ?? family.mediaConsentPreference ?? false,
          acceptRequiredAgreements:
            draft?.acceptRequiredAgreements ??
            Boolean(family.agreementsCurrent),
        }));
        if (draft?.paymentMethod) {
          const allowed = selectablePaymentMethods(session.payment_requirement);
          if (allowed.includes(draft.paymentMethod as PaymentMethod)) {
            setPaymentMethod(draft.paymentMethod as PaymentMethod);
          }
        }
      } else if (draft) {
        setForm((prev) => ({
          ...prev,
          parentFirstName: draft.parentFirstName,
          parentLastName: draft.parentLastName,
          parentEmail: draft.parentEmail,
          parentPhone: draft.parentPhone,
          athleteFirstName: draft.athleteFirstName,
          athleteLastName: draft.athleteLastName,
          athleteDob: draft.athleteDob,
          athleteEmail: draft.athleteEmail ?? "",
          athletePhone: draft.athletePhone ?? "",
          schoolGrade: draft.schoolGrade ?? "",
          experienceLevel: draft.experienceLevel,
          heightWeight: draft.heightWeight ?? "",
          sportPosition: draft.sportPosition ?? "",
          healthIssues:
            draft.healthIssues ||
            draft.bookingNotes ||
            [draft.medicalNotes, draft.customerNotes].filter(Boolean).join("\n"),
          emergencyContact1Name: draft.emergencyContact1Name ?? "",
          emergencyContact1Phone: draft.emergencyContact1Phone ?? "",
          emergencyContact2Name: draft.emergencyContact2Name ?? "",
          emergencyContact2Phone: draft.emergencyContact2Phone ?? "",
          shirtSize: draft.shirtSize ?? "",
          goal: draft.goal ?? "",
          rememberFamily: draft.rememberFamily,
          mediaConsent: draft.mediaConsent,
          acceptRequiredAgreements: draft.acceptRequiredAgreements,
        }));
        if (draft.paymentMethod) {
          const allowed = selectablePaymentMethods(session.payment_requirement);
          if (allowed.includes(draft.paymentMethod as PaymentMethod)) {
            setPaymentMethod(draft.paymentMethod as PaymentMethod);
          }
        }
        if (draft.selectedAthleteId) {
          setSelectedAthleteId(draft.selectedAthleteId);
        }
      }

      setHydrated(true);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [session.id, session.payment_requirement]);

  useEffect(() => {
    if (!hydrated || waitlistMode) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      saveBookingDraft({
        sessionId: session.id,
        parentFirstName: form.parentFirstName,
        parentLastName: form.parentLastName,
        parentEmail: form.parentEmail,
        parentPhone: form.parentPhone,
        athleteFirstName: form.athleteFirstName,
        athleteLastName: form.athleteLastName,
        athleteDob: form.athleteDob,
        athleteEmail: form.athleteEmail,
        athletePhone: form.athletePhone,
        schoolGrade: form.schoolGrade,
        experienceLevel: form.experienceLevel,
        heightWeight: form.heightWeight,
        sportPosition: form.sportPosition,
        healthIssues: form.healthIssues,
        emergencyContact1Name: form.emergencyContact1Name,
        emergencyContact1Phone: form.emergencyContact1Phone,
        emergencyContact2Name: form.emergencyContact2Name,
        emergencyContact2Phone: form.emergencyContact2Phone,
        shirtSize: form.shirtSize,
        goal: form.goal,
        bookingNotes: form.healthIssues,
        paymentMethod,
        rememberFamily: form.rememberFamily,
        mediaConsent: form.mediaConsent,
        acceptRequiredAgreements: form.acceptRequiredAgreements,
        selectedAthleteId,
        editingDetails: false,
        updatedAt: new Date().toISOString(),
      });
    }, 350);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [hydrated, waitlistMode, session.id, form, paymentMethod, selectedAthleteId]);

  useEffect(() => {
    if (!hydrated || waitlistMode) return;
    let cancelled = false;

    async function loadContext() {
      const params = new URLSearchParams();
      const contactEmail = minor
        ? form.parentEmail.trim()
        : form.athleteEmail.trim();
      if (contactEmail) params.set("email", contactEmail);
      if (
        selectedAthleteId &&
        selectedAthleteId !== "__new__" &&
        /^[0-9a-f-]{36}$/i.test(selectedAthleteId)
      ) {
        params.set("athleteId", selectedAthleteId);
      }
      if (form.athleteFirstName.trim()) {
        params.set("athleteFirstName", form.athleteFirstName.trim());
      }
      if (form.athleteLastName.trim()) {
        params.set("athleteLastName", form.athleteLastName.trim());
      }
      if (hasValidDob) params.set("athleteDob", athleteDob);

      try {
        const res = await fetch(
          `/api/family/booking-context?${params.toString()}`,
          { credentials: "same-origin" },
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          athleteId?: string | null;
          intakeComplete?: boolean;
          parentOnFile?: {
            firstName: string;
            lastName: string;
            email: string;
            phone: string;
          } | null;
          athletesOnFile?: Array<{
            id: string;
            firstName: string;
            lastName: string;
            dob: string;
            experienceLevel?: string;
          }>;
        };
        if (cancelled) return;
        const athleteId = data.athleteId ?? null;
        setResolvedAthleteId(athleteId);
        if (athleteId && /^[0-9a-f-]{36}$/i.test(athleteId)) {
          setSelectedAthleteId(athleteId);
        }

        if (data.parentOnFile) {
          setForm((prev) => ({
            ...prev,
            parentFirstName:
              prev.parentFirstName.trim() || data.parentOnFile!.firstName,
            parentLastName:
              prev.parentLastName.trim() || data.parentOnFile!.lastName,
            parentEmail: prev.parentEmail.trim() || data.parentOnFile!.email,
            parentPhone: prev.parentPhone.trim() || data.parentOnFile!.phone,
          }));
        }

        const athletes = data.athletesOnFile ?? [];
        if (athletes.length === 1 && !form.athleteFirstName.trim()) {
          const a = athletes[0];
          setForm((prev) => ({
            ...prev,
            athleteFirstName: a.firstName,
            athleteLastName: a.lastName,
            athleteDob: a.dob,
            experienceLevel: a.experienceLevel ?? prev.experienceLevel,
          }));
          setSelectedAthleteId(a.id);
        }
      } catch {
        if (!cancelled) setResolvedAthleteId(null);
      }
    }

    void loadContext();
    return () => {
      cancelled = true;
    };
  }, [
    hydrated,
    waitlistMode,
    minor,
    form.parentEmail,
    form.athleteEmail,
    form.athleteFirstName,
    form.athleteLastName,
    athleteDob,
    hasValidDob,
    selectedAthleteId,
  ]);

  function applyFamily(family: SavedFamily, athlete: SavedAthlete) {
    setSelectedAthleteId(athlete.id);
    setForm((prev) => ({
      ...prev,
      parentFirstName: family.parentFirstName,
      parentLastName: family.parentLastName,
      parentEmail: family.parentEmail,
      parentPhone: family.parentPhone,
      athleteFirstName: athlete.firstName,
      athleteLastName: athlete.lastName,
      athleteDob: athlete.dob,
      schoolGrade: "",
      experienceLevel: athlete.experienceLevel ?? "",
      heightWeight: "",
      sportPosition: "",
      healthIssues: "",
      emergencyContact1Name: "",
      emergencyContact1Phone: "",
      emergencyContact2Name: "",
      emergencyContact2Phone: "",
      shirtSize: "",
      goal: "",
      rememberFamily: true,
      mediaConsent: family.mediaConsentPreference ?? prev.mediaConsent,
      acceptRequiredAgreements:
        family.agreementsCurrent || prev.acceptRequiredAgreements,
    }));
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSelectAthlete(athleteId: string) {
    if (!savedFamily) return;
    if (athleteId === "__new__") {
      setSelectedAthleteId("__new__");
      setForm((prev) => ({
        ...prev,
        athleteFirstName: "",
        athleteLastName: "",
        athleteDob: "",
        athleteEmail: "",
        athletePhone: "",
        schoolGrade: "",
        experienceLevel: "",
        healthIssues: "",
      }));
      return;
    }
    const athlete = savedFamily.athletes.find((a) => a.id === athleteId);
    if (!athlete) return;
    applyFamily(savedFamily, athlete);
  }

  async function bookAsDifferentFamily() {
    await forgetRememberedFamily();
    setSavedFamily(null);
    setSelectedAthleteId("");
    setForm(emptyForm);
    setPaymentMethod(defaultPaymentMethod(session.payment_requirement) ?? "");
    clearBookingDraft(session.id);
  }

  function bookingContactFields() {
    if (minor) {
      return {
        parentFirstName: form.parentFirstName.trim(),
        parentLastName: form.parentLastName.trim(),
        parentEmail: form.parentEmail.trim(),
        parentPhone: form.parentPhone.trim(),
      };
    }
    return {
      parentFirstName: form.athleteFirstName.trim(),
      parentLastName: form.athleteLastName.trim(),
      parentEmail: form.athleteEmail.trim(),
      parentPhone: form.athletePhone.trim(),
    };
  }

  function rememberFromForm(athleteId?: string) {
    if (!form.rememberFamily) return;
    const contact = bookingContactFields();
    persistRememberedBookingLocally({
      parentFirstName: contact.parentFirstName,
      parentLastName: contact.parentLastName,
      parentEmail: contact.parentEmail,
      parentPhone: contact.parentPhone,
      athleteFirstName: form.athleteFirstName,
      athleteLastName: form.athleteLastName,
      athleteDob: athleteDob,
      athleteId,
      experienceLevel: form.experienceLevel || undefined,
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (waitlistMode) {
        const res = await fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.id,
            parentName: form.waitlistParentName,
            athleteName: form.waitlistAthleteName,
            email: form.waitlistEmail,
            phone: form.waitlistPhone,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
        toastError(data.error ?? "Could not join waitlist");
          return;
        }
        clearBookingDraft(session.id);
        toastSuccess("You're on the waitlist");
        router.push(`/book/${session.id}/confirmation?waitlist=1`);
        return;
      }

      if (!rosterCredit && !paymentMethod) {
        toastError("Please select a payment method");
        return;
      }

      if (!form.athleteFirstName.trim() || !form.athleteLastName.trim()) {
        toastError("Enter the athlete's name");
        return;
      }

      if (!hasValidDob) {
        toastError("Enter the athlete's date of birth");
        return;
      }

      if (minor) {
        if (
          !form.parentFirstName.trim() ||
          !form.parentLastName.trim() ||
          !form.parentEmail.trim() ||
          form.parentPhone.trim().length < 7
        ) {
          toastError("Enter parent or guardian name, email, and phone");
          return;
        }
      } else if (
        !form.athleteEmail.trim() ||
        form.athletePhone.trim().length < 7
      ) {
        toastError("Enter your email and phone");
        return;
      }

      if (!form.schoolGrade.trim()) {
        toastError("Select school grade");
        return;
      }

      if (agreementsNeeded && !form.acceptRequiredAgreements) {
        toastError("Please accept the required agreements");
        return;
      }

      let athleteId =
        resolvedAthleteId &&
        /^[0-9a-f-]{36}$/i.test(resolvedAthleteId)
          ? resolvedAthleteId
          : selectedAthleteId &&
              selectedAthleteId !== "__new__" &&
              /^[0-9a-f-]{36}$/i.test(selectedAthleteId)
            ? selectedAthleteId
            : undefined;

      const intakeBody = buildIntakePayloadFromBooking({
        parentFirstName: form.parentFirstName,
        parentLastName: form.parentLastName,
        parentEmail: form.parentEmail,
        parentPhone: form.parentPhone,
        athleteFirstName: form.athleteFirstName,
        athleteLastName: form.athleteLastName,
        athleteDob: athleteDob,
        athleteEmail: form.athleteEmail,
        athletePhone: form.athletePhone,
        schoolGrade: form.schoolGrade,
        experienceLevel: form.experienceLevel,
        heightWeight: form.heightWeight,
        sportPosition: form.sportPosition,
        healthIssues: form.healthIssues,
        emergencyContact1Name: form.emergencyContact1Name,
        emergencyContact1Phone: form.emergencyContact1Phone,
        emergencyContact2Name: form.emergencyContact2Name,
        emergencyContact2Phone: form.emergencyContact2Phone,
        shirtSize: form.shirtSize,
        goal: form.goal,
        mediaConsent: form.mediaConsent,
        rememberFamily: form.rememberFamily,
      });

      const intakeRes = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...intakeBody,
          mode: "full",
        }),
      });
      const intakeData = await intakeRes.json();
      if (!intakeRes.ok) {
        toastError(intakeData.error ?? "Could not save intake");
        return;
      }
      athleteId = intakeData.athleteId as string;
      setResolvedAthleteId(athleteId);
      rememberFromForm(athleteId);

      const contact = bookingContactFields();
      const notesBody = form.healthIssues.trim();
      const gradeLine = form.schoolGrade.trim()
        ? `School grade: ${form.schoolGrade.trim()}`
        : "";
      const medicalNotes = [gradeLine, notesBody].filter(Boolean).join("\n");

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          ...contact,
          athleteFirstName: form.athleteFirstName.trim(),
          athleteLastName: form.athleteLastName.trim(),
          athleteDob,
          athleteId,
          experienceLevel: form.experienceLevel || undefined,
          medicalNotes: medicalNotes || undefined,
          ...(rosterCredit ? {} : { paymentMethod }),
          acceptRequiredAgreements: agreementsNeeded
            ? form.acceptRequiredAgreements
            : true,
          mediaConsent: form.mediaConsent,
          rememberFamily: form.rememberFamily,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toastError(data.error ?? "Booking failed");
        if (data.code === "SESSION_FULL") {
          router.push(`/book/${session.id}?waitlist=1`);
        }
        if (data.code === "INTAKE_REQUIRED" || data.code === "WAIVER_RENEWAL_REQUIRED") {
          toastError(
            data.code === "WAIVER_RENEWAL_REQUIRED"
              ? "Please accept the updated waiver below and submit again."
              : "We could not verify intake — check the form and submit again.",
          );
        }
        return;
      }

      clearBookingDraft(session.id);
      rememberFromForm(athleteId);

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      const q = new URLSearchParams({
        confirmation: data.confirmationNumber,
        athlete: `${form.athleteFirstName} ${form.athleteLastName}`,
        token: data.confirmationToken ?? "",
      });
      if (rosterCredit) {
        q.set("roster", "1");
      } else if (paymentMethod) {
        q.set("payment", paymentMethod);
      }
      if (data.demo) q.set("demo", "1");
      router.push(`/book/${session.id}/confirmation?${q.toString()}`);
    } catch {
      toastError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (waitlistMode) {
    return (
      <form onSubmit={onSubmit} className="booking-form-shell">
        <div className="booking-form-session">
          <p className="text-xs font-medium uppercase tracking-widest text-gold">
            Waitlist
          </p>
          <h2 className="mt-1 font-heading text-2xl tracking-wide">
            {session.title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatSessionDate(session.session_date)} ·{" "}
            {formatSessionTime(session.start_time)}
          </p>
        </div>
        <div className="booking-form-section grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="waitlistParentName" required>Parent name</Label>
            <Input
              id="waitlistParentName"
              required
              value={form.waitlistParentName}
              onChange={(e) => update("waitlistParentName", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="waitlistAthleteName" required>Athlete name</Label>
            <Input
              id="waitlistAthleteName"
              required
              value={form.waitlistAthleteName}
              onChange={(e) => update("waitlistAthleteName", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="waitlistEmail" required>Email</Label>
            <Input
              id="waitlistEmail"
              type="email"
              required
              value={form.waitlistEmail}
              onChange={(e) => update("waitlistEmail", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="waitlistPhone" required>Phone</Label>
            <Input
              id="waitlistPhone"
              type="tel"
              required
              value={form.waitlistPhone}
              onChange={(e) => update("waitlistPhone", e.target.value)}
            />
          </div>
        </div>
        <div className="booking-form-footer">
        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand text-brand-foreground hover:bg-brand/90 sm:w-auto"
        >
          {submitting ? "Submitting…" : "Join Waitlist"}
        </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="booking-form-shell">
      <div className="booking-form-session">
        <p className="text-xs font-medium uppercase tracking-widest text-gold">
          Session
        </p>
        <h2 className="mt-1 font-heading text-2xl tracking-wide sm:text-3xl">
          {session.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {formatSessionDate(session.session_date)} ·{" "}
          {formatSessionTime(session.start_time)}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Required fields are marked with{" "}
          <span className="text-destructive">*</span>.
        </p>
      </div>

      <div className="booking-form-body">
        <div className="booking-form-section">
          <label className="checkbox-plain flex cursor-pointer items-start gap-3 rounded-lg border border-white/5 bg-surface/40 p-3 text-sm">
            <Checkbox
              checked={form.rememberFamily}
              onCheckedChange={(v) => update("rememberFamily", Boolean(v))}
            />
            <span>
              <span className="font-medium text-foreground">
                Save on this device
              </span>
              <span className="mt-1 block text-muted-foreground">
                Contact info only — not medical notes.
              </span>
            </span>
          </label>

          {savedFamily ? (
            <div className="rounded-lg border border-brand/30 bg-brand/10 p-4">
              <p className="text-sm font-semibold text-foreground">
                Welcome back, {savedFamily.parentFirstName}
              </p>
              <div className="mt-3 space-y-1.5">
                <Label htmlFor="savedAthlete">Athlete on this device</Label>
                <select
                  id="savedAthlete"
                  className="form-select"
                  value={selectedAthleteId}
                  onChange={(e) => onSelectAthlete(e.target.value)}
                >
                  {savedFamily.athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.firstName} {athlete.lastName}
                    </option>
                  ))}
                  <option value="__new__">Another athlete</option>
                </select>
              </div>
              <button
                type="button"
                className="mt-3 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
                onClick={() => void bookAsDifferentFamily()}
              >
                Clear saved info
              </button>
            </div>
          ) : null}
        </div>

        <div className="booking-form-section">
          <h3 className="booking-form-section-title">Athlete</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="athleteFirstName" required>
                First name
              </Label>
              <Input
                id="athleteFirstName"
                required
                value={form.athleteFirstName}
                onChange={(e) => update("athleteFirstName", e.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="athleteLastName" required>
                Last name
              </Label>
              <Input
                id="athleteLastName"
                required
                value={form.athleteLastName}
                onChange={(e) => update("athleteLastName", e.target.value)}
                autoComplete="family-name"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="athleteDob" required>
                Date of birth
              </Label>
              <Input
                id="athleteDob"
                type="date"
                required
                value={form.athleteDob}
                onChange={(e) => update("athleteDob", e.target.value)}
              />
            </div>
          </div>
        </div>

        {minor ? (
          <div className="booking-form-section">
            <h3 className="booking-form-section-title">Parent or guardian</h3>
            <p className="booking-form-section-hint">
              Primary and emergency contact for athletes under 18.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="parentFirstName" required>
                  First name
                </Label>
                <Input
                  id="parentFirstName"
                  required
                  value={form.parentFirstName}
                  onChange={(e) => update("parentFirstName", e.target.value)}
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="parentLastName" required>
                  Last name
                </Label>
                <Input
                  id="parentLastName"
                  required
                  value={form.parentLastName}
                  onChange={(e) => update("parentLastName", e.target.value)}
                  autoComplete="family-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="parentEmail" required>
                  Email
                </Label>
                <Input
                  id="parentEmail"
                  type="email"
                  required
                  value={form.parentEmail}
                  onChange={(e) => update("parentEmail", e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="parentPhone" required>
                  Phone
                </Label>
                <Input
                  id="parentPhone"
                  type="tel"
                  required
                  value={form.parentPhone}
                  onChange={(e) => update("parentPhone", e.target.value)}
                  autoComplete="tel"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="booking-form-section">
            <h3 className="booking-form-section-title">Your contact</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="athleteEmail" required>
                  Email
                </Label>
                <Input
                  id="athleteEmail"
                  type="email"
                  required
                  value={form.athleteEmail}
                  onChange={(e) => update("athleteEmail", e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="athletePhone" required>
                  Phone
                </Label>
                <Input
                  id="athletePhone"
                  type="tel"
                  required
                  value={form.athletePhone}
                  onChange={(e) => update("athletePhone", e.target.value)}
                  autoComplete="tel"
                />
              </div>
            </div>
          </div>
        )}

        <div className="booking-form-section">
          <h3 className="booking-form-section-title">Athlete intake</h3>
          <p className="booking-form-section-hint">
            One-time athlete profile — saved with this booking. If you&apos;re
            already in our system, we&apos;ll update your record.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="schoolGrade" required>
                School grade
              </Label>
              <select
                id="schoolGrade"
                className="form-select"
                required
                value={form.schoolGrade}
                onChange={(e) => update("schoolGrade", e.target.value)}
              >
                <option value="">Select grade</option>
                {BOOKING_SCHOOL_GRADES.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="experienceLevel">Experience level</Label>
              <select
                id="experienceLevel"
                className="form-select"
                value={form.experienceLevel}
                onChange={(e) => update("experienceLevel", e.target.value)}
              >
                <option value="">Select level</option>
                {BOOKING_EXPERIENCE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="heightWeight">Height / weight</Label>
              <Input
                id="heightWeight"
                value={form.heightWeight}
                onChange={(e) => update("heightWeight", e.target.value)}
                placeholder="e.g. 5 ft 2 in / 95 lbs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sportPosition">Sport / position</Label>
              <Input
                id="sportPosition"
                value={form.sportPosition}
                onChange={(e) => update("sportPosition", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="healthIssues">Health issues / allergies</Label>
              <Textarea
                id="healthIssues"
                value={form.healthIssues}
                onChange={(e) => update("healthIssues", e.target.value)}
                rows={3}
                placeholder="Allergies, injuries, or anything coaches should know"
              />
            </div>
          </div>
        </div>

        <div className="booking-form-section">
          <h3 className="booking-form-section-title">Emergency contacts</h3>
          <p className="booking-form-section-hint">
            {minor
              ? "Defaults to parent/guardian if left blank."
              : "Who we call if we can&apos;t reach you."}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="emergencyContact1Name">Contact 1 name</Label>
              <Input
                id="emergencyContact1Name"
                value={form.emergencyContact1Name}
                onChange={(e) =>
                  update("emergencyContact1Name", e.target.value)
                }
                placeholder={
                  minor ? "Same as parent/guardian if blank" : undefined
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="emergencyContact1Phone">Contact 1 phone</Label>
              <Input
                id="emergencyContact1Phone"
                type="tel"
                value={form.emergencyContact1Phone}
                onChange={(e) =>
                  update("emergencyContact1Phone", e.target.value)
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="emergencyContact2Name">
                Contact 2 name (optional)
              </Label>
              <Input
                id="emergencyContact2Name"
                value={form.emergencyContact2Name}
                onChange={(e) =>
                  update("emergencyContact2Name", e.target.value)
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="emergencyContact2Phone">
                Contact 2 phone (optional)
              </Label>
              <Input
                id="emergencyContact2Phone"
                type="tel"
                value={form.emergencyContact2Phone}
                onChange={(e) =>
                  update("emergencyContact2Phone", e.target.value)
                }
              />
            </div>
          </div>
        </div>

        <div className="booking-form-section">
          <h3 className="booking-form-section-title">Additional info</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="shirtSize">Shirt size</Label>
              <select
                id="shirtSize"
                className="form-select"
                value={form.shirtSize}
                onChange={(e) => update("shirtSize", e.target.value)}
              >
                <option value="">Select</option>
                {INTAKE_SHIRT_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="goal">Training goals (optional)</Label>
              <Textarea
                id="goal"
                value={form.goal}
                onChange={(e) => update("goal", e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </div>

        {!rosterCredit ? (
          <div className="booking-form-section">
            <h3 className="booking-form-section-title">Payment</h3>
            <p className="booking-form-section-hint">
              {formatPrice(session.price_cents)} due for this session
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {showDisabledPayOnline ? (
                <div
                  className="flex h-full items-start gap-3 rounded-lg border border-dashed border-white/15 bg-surface/30 p-3 text-sm opacity-80"
                  aria-disabled
                >
                  <input type="radio" className="mt-1" disabled readOnly />
                  <span>
                    <span className="font-medium text-muted-foreground">
                      {paymentMethodLabel("stripe")}
                    </span>
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Coming soon
                    </span>
                  </span>
                </div>
              ) : null}
              {paymentOptions.map((method) => (
                <label
                  key={method}
                  className={`flex h-full cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                    paymentMethod === method
                      ? "border-brand bg-brand/15"
                      : "border-white/10 bg-surface/30 hover:border-white/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    className="mt-1"
                    required
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                    value={method}
                  />
                  <span>
                    <span className="font-medium">
                      {paymentMethodLabel(method)}
                    </span>
                    <span className="mt-0.5 block text-muted-foreground">
                      {method === "stripe"
                        ? "Secure card payment via Stripe."
                        : "Join the roster — pay at the facility."}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <div className="booking-form-section">
          <h3 className="booking-form-section-title">Agreements</h3>
          <div className="space-y-4">
            {agreementsNeeded ? (
              <label className="checkbox-plain flex items-start gap-3 text-sm">
                <Checkbox
                  checked={form.acceptRequiredAgreements}
                  onCheckedChange={(v) =>
                    update("acceptRequiredAgreements", Boolean(v))
                  }
                />
                <span className="text-muted-foreground">
                  {minor ? (
                    <>I&apos;m the parent or guardian and accept the </>
                  ) : (
                    <>I accept the </>
                  )}
                  <PolicyLinkButton docId="booking">booking</PolicyLinkButton>,{" "}
                  <PolicyLinkButton
                    docId="cancellation"
                    cancellationText={session.cancellation_policy}
                  >
                    cancellation
                  </PolicyLinkButton>,{" "}
                  <PolicyLinkButton docId="privacy">privacy</PolicyLinkButton>, and{" "}
                  <PolicyLinkButton docId="waiver">waiver</PolicyLinkButton>.
                </span>
              </label>
            ) : (
              <p className="text-sm text-muted-foreground">
                Policies were already accepted on this device.{" "}
                <PolicyLinkButton docId="booking">Review policies</PolicyLinkButton>
              </p>
            )}
            <label className="checkbox-plain flex items-start gap-3 text-sm">
              <Checkbox
                checked={form.mediaConsent}
                onCheckedChange={(v) => update("mediaConsent", Boolean(v))}
              />
              <span className="text-muted-foreground">
                Optional photo/media consent.{" "}
                <PolicyLinkButton docId="media">Details</PolicyLinkButton>
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="booking-form-footer">
        <Button
          type="submit"
          disabled={submitting || (!rosterCredit && !paymentMethod)}
          className="h-12 w-full bg-brand text-base text-brand-foreground hover:bg-brand/90 sm:w-auto sm:min-w-[220px] sm:px-8"
        >
          {submitting
            ? "Saving & reserving…"
            : rosterCredit
              ? "Complete intake & book"
              : paymentMethod === "stripe"
                ? "Complete intake & pay"
                : "Complete intake & join roster"}
        </Button>
      </div>
    </form>
  );
}
