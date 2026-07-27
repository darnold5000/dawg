"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PolicyLinkButton } from "@/components/public/policy-dialog";
import type { SessionWithRelations } from "@/lib/types/database";
import { isMinorAthlete } from "@/lib/athlete-age";
import { buildIntakePayloadFromBooking } from "@/lib/booking-intake-payload";
import {
  fetchRememberedFamily,
  forgetRememberedFamily,
  saveDemoFamily,
  type SavedAthlete,
  type SavedFamily,
} from "@/lib/returning-family";
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
  bookingNotes: "",
  acceptRequiredAgreements: false,
  mediaConsent: false,
  rememberFamily: false,
  intakeAlreadyOnFile: false,
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
  const [intakeOnFileVerified, setIntakeOnFileVerified] = useState(false);

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
  const showIntakeSection = !form.intakeAlreadyOnFile;
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
          bookingNotes: draft?.bookingNotes || "",
          rememberFamily: draft?.rememberFamily ?? true,
          mediaConsent:
            draft?.mediaConsent ?? family.mediaConsentPreference ?? false,
          acceptRequiredAgreements:
            draft?.acceptRequiredAgreements ??
            Boolean(family.agreementsCurrent),
          intakeAlreadyOnFile: draft?.intakeAlreadyOnFile ?? false,
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
          bookingNotes:
            draft.bookingNotes ||
            [draft.medicalNotes, draft.customerNotes].filter(Boolean).join("\n"),
          rememberFamily: draft.rememberFamily,
          mediaConsent: draft.mediaConsent,
          acceptRequiredAgreements: draft.acceptRequiredAgreements,
          intakeAlreadyOnFile: draft.intakeAlreadyOnFile ?? false,
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
        bookingNotes: form.bookingNotes,
        paymentMethod,
        rememberFamily: form.rememberFamily,
        mediaConsent: form.mediaConsent,
        acceptRequiredAgreements: form.acceptRequiredAgreements,
        intakeAlreadyOnFile: form.intakeAlreadyOnFile,
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
          intakeRequired?: boolean;
        };
        if (cancelled) return;
        const athleteId = data.athleteId ?? null;
        setResolvedAthleteId(athleteId);
        if (athleteId && /^[0-9a-f-]{36}$/i.test(athleteId)) {
          setSelectedAthleteId(athleteId);
        }
        const intakeOk = Boolean(data.intakeComplete);
        setIntakeOnFileVerified(intakeOk);
      } catch {
        if (!cancelled) {
          setResolvedAthleteId(null);
          setIntakeOnFileVerified(false);
        }
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
    form.intakeAlreadyOnFile,
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
      bookingNotes: "",
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
        bookingNotes: "",
        intakeAlreadyOnFile: false,
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
          toast.error(data.error ?? "Could not join waitlist");
          return;
        }
        clearBookingDraft(session.id);
        toast.success("You're on the waitlist");
        router.push(`/book/${session.id}/confirmation?waitlist=1`);
        return;
      }

      if (!rosterCredit && !paymentMethod) {
        toast.error("Please select a payment method");
        return;
      }

      if (!form.athleteFirstName.trim() || !form.athleteLastName.trim()) {
        toast.error("Enter the athlete's name");
        return;
      }

      if (!hasValidDob) {
        toast.error("Enter the athlete's date of birth");
        return;
      }

      if (minor) {
        if (
          !form.parentFirstName.trim() ||
          !form.parentLastName.trim() ||
          !form.parentEmail.trim() ||
          form.parentPhone.trim().length < 7
        ) {
          toast.error("Enter parent or guardian name, email, and phone");
          return;
        }
      } else if (
        !form.athleteEmail.trim() ||
        form.athletePhone.trim().length < 7
      ) {
        toast.error("Enter your email and phone");
        return;
      }

      if (showIntakeSection) {
        if (!form.schoolGrade.trim()) {
          toast.error("Select school grade");
          return;
        }
        if (agreementsNeeded && !form.acceptRequiredAgreements) {
          toast.error("Please accept the required agreements");
          return;
        }
      } else if (form.intakeAlreadyOnFile && !intakeOnFileVerified) {
        toast.error(
          "We couldn't find intake on file for this athlete. Uncheck “Intake already completed” to complete intake and book in one step.",
        );
        return;
      } else if (agreementsNeeded && !form.acceptRequiredAgreements) {
        toast.error("Please accept the required agreements");
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

      if (showIntakeSection) {
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
          healthNotes: form.bookingNotes,
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
          toast.error(intakeData.error ?? "Could not save intake");
          return;
        }
        athleteId = intakeData.athleteId as string;
        setResolvedAthleteId(athleteId);
        setIntakeOnFileVerified(true);
      }

      const contact = bookingContactFields();
      const notesBody = form.bookingNotes.trim();
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
        toast.error(data.error ?? "Booking failed");
        if (data.code === "SESSION_FULL") {
          router.push(`/book/${session.id}?waitlist=1`);
        }
        if (data.code === "INTAKE_REQUIRED" || data.code === "WAIVER_RENEWAL_REQUIRED") {
          update("intakeAlreadyOnFile", false);
          toast.error(
            data.code === "WAIVER_RENEWAL_REQUIRED"
              ? "Please accept the updated waiver below and submit again."
              : "Complete intake below and submit again.",
          );
        }
        return;
      }

      clearBookingDraft(session.id);

      if (form.rememberFamily && data.demo) {
        saveDemoFamily({
          parentFirstName: contact.parentFirstName,
          parentLastName: contact.parentLastName,
          parentEmail: contact.parentEmail,
          parentPhone: contact.parentPhone,
          athleteFirstName: form.athleteFirstName,
          athleteLastName: form.athleteLastName,
          athleteDob: athleteDob,
          experienceLevel: form.experienceLevel || undefined,
        });
      }

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
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (waitlistMode) {
    return (
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-heading text-xl tracking-wide">Join Waitlist</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {session.title} · {formatSessionDate(session.session_date)} ·{" "}
            {formatSessionTime(session.start_time)}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="waitlistParentName">Parent name</Label>
            <Input
              id="waitlistParentName"
              required
              value={form.waitlistParentName}
              onChange={(e) => update("waitlistParentName", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="waitlistAthleteName">Athlete name</Label>
            <Input
              id="waitlistAthleteName"
              required
              value={form.waitlistAthleteName}
              onChange={(e) => update("waitlistAthleteName", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="waitlistEmail">Email</Label>
            <Input
              id="waitlistEmail"
              type="email"
              required
              value={form.waitlistEmail}
              onChange={(e) => update("waitlistEmail", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="waitlistPhone">Phone</Label>
            <Input
              id="waitlistPhone"
              type="tel"
              required
              value={form.waitlistPhone}
              onChange={(e) => update("waitlistPhone", e.target.value)}
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand text-brand-foreground hover:bg-brand/90 sm:w-auto"
        >
          {submitting ? "Submitting…" : "Join Waitlist"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 sm:space-y-6">
      <div className="rounded-xl border border-border bg-card px-4 py-3 sm:p-5">
        <h2 className="font-heading text-lg tracking-wide sm:text-xl">
          {session.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatSessionDate(session.session_date)} ·{" "}
          {formatSessionTime(session.start_time)}
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <label className="checkbox-plain flex cursor-pointer items-start gap-3 text-sm">
          <Checkbox
            checked={form.intakeAlreadyOnFile}
            onCheckedChange={(v) => update("intakeAlreadyOnFile", Boolean(v))}
          />
          <span>
            <span className="font-medium text-foreground">
              Intake already completed
            </span>
            <span className="mt-1 block text-muted-foreground">
              Check if this athlete is already in our system — use the same name
              and date of birth as on file.
            </span>
          </span>
        </label>
        <label className="checkbox-plain flex cursor-pointer items-start gap-3 text-sm">
          <Checkbox
            checked={form.rememberFamily}
            onCheckedChange={(v) => update("rememberFamily", Boolean(v))}
          />
          <span>
            <span className="font-medium text-foreground">
              Save info on this device
            </span>
            <span className="mt-1 block text-muted-foreground">
              Faster next time — contact info only, not medical notes.
            </span>
          </span>
        </label>
        {form.intakeAlreadyOnFile && intakeOnFileVerified ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            Intake found for this athlete.
          </p>
        ) : null}
        {form.intakeAlreadyOnFile &&
        hasValidDob &&
        form.athleteFirstName.trim() &&
        !intakeOnFileVerified ? (
          <p className="text-sm text-amber-200">
            No matching intake yet — uncheck the box above to complete intake
            with this booking.
          </p>
        ) : null}
      </div>

      {savedFamily ? (
        <div className="rounded-xl border border-brand/40 bg-brand/10 p-4">
          <p className="text-sm font-semibold">
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
            className="mt-3 text-sm underline underline-offset-2"
            onClick={() => void bookAsDifferentFamily()}
          >
            Not your family? Clear saved info
          </button>
        </div>
      ) : null}

      <fieldset className="space-y-3 rounded-xl border border-border p-4">
        <legend className="px-1 font-heading text-lg tracking-wide">
          Athlete
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="athleteFirstName">First name</Label>
            <Input
              id="athleteFirstName"
              required
              value={form.athleteFirstName}
              onChange={(e) => update("athleteFirstName", e.target.value)}
              autoComplete="given-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="athleteLastName">Last name</Label>
            <Input
              id="athleteLastName"
              required
              value={form.athleteLastName}
              onChange={(e) => update("athleteLastName", e.target.value)}
              autoComplete="family-name"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="athleteDob">Date of birth</Label>
            <Input
              id="athleteDob"
              type="date"
              required
              value={form.athleteDob}
              onChange={(e) => update("athleteDob", e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      {minor ? (
        <fieldset className="space-y-3 rounded-xl border border-border p-4">
          <legend className="px-1 font-heading text-lg tracking-wide">
            Parent or guardian
          </legend>
          <p className="text-sm text-muted-foreground">
            Primary contact and emergency contact for athletes under 18.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="parentFirstName">First name</Label>
              <Input
                id="parentFirstName"
                required
                value={form.parentFirstName}
                onChange={(e) => update("parentFirstName", e.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="parentLastName">Last name</Label>
              <Input
                id="parentLastName"
                required
                value={form.parentLastName}
                onChange={(e) => update("parentLastName", e.target.value)}
                autoComplete="family-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="parentEmail">Email</Label>
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
              <Label htmlFor="parentPhone">Phone</Label>
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
        </fieldset>
      ) : (
        <fieldset className="space-y-3 rounded-xl border border-border p-4">
          <legend className="px-1 font-heading text-lg tracking-wide">
            Your contact
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="athleteEmail">Email</Label>
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
              <Label htmlFor="athletePhone">Phone</Label>
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
        </fieldset>
      )}

      {showIntakeSection ? (
        <fieldset className="space-y-3 rounded-xl border border-border p-4">
          <legend className="px-1 font-heading text-lg tracking-wide">
            Athlete intake
          </legend>
          <p className="text-sm text-muted-foreground">
            One-time details — saved with this booking, no extra step.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="schoolGrade">School grade</Label>
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="bookingNotes">Health / notes (optional)</Label>
              <Textarea
                id="bookingNotes"
                value={form.bookingNotes}
                onChange={(e) => update("bookingNotes", e.target.value)}
                rows={3}
                placeholder="Allergies, injuries, or anything coaches should know"
              />
            </div>
          </div>
        </fieldset>
      ) : (
        <div className="space-y-1.5 rounded-xl border border-border p-4">
          <Label htmlFor="bookingNotesShort">Notes for coaches (optional)</Label>
          <Textarea
            id="bookingNotesShort"
            value={form.bookingNotes}
            onChange={(e) => update("bookingNotes", e.target.value)}
            rows={2}
            placeholder="Anything we should know for this session"
          />
        </div>
      )}

      {!rosterCredit ? (
        <fieldset className="space-y-3 rounded-xl border border-border p-4">
          <legend className="px-1 font-heading text-lg tracking-wide">
            Payment
          </legend>
          <p className="text-sm text-muted-foreground">
            {formatPrice(session.price_cents)} due for this session
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {showDisabledPayOnline ? (
              <div
                className="flex h-full items-start gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm opacity-80"
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
                className={`flex h-full cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
                  paymentMethod === method
                    ? "border-brand bg-brand/10"
                    : "border-border"
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
        </fieldset>
      ) : null}

      <fieldset className="space-y-3 rounded-xl border border-border p-4">
        <legend className="px-1 font-heading text-lg tracking-wide">
          Agreements
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {agreementsNeeded || showIntakeSection ? (
            <label className="checkbox-plain flex items-start gap-3 text-sm sm:col-span-2">
              <Checkbox
                checked={form.acceptRequiredAgreements}
                onCheckedChange={(v) =>
                  update("acceptRequiredAgreements", Boolean(v))
                }
              />
              <span>
                {minor ? (
                  <>
                    I&apos;m the parent or guardian and accept the{" "}
                  </>
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
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Policies were already accepted on this device.{" "}
              <PolicyLinkButton docId="booking">Review policies</PolicyLinkButton>
            </p>
          )}
          <label className="checkbox-plain flex items-start gap-3 text-sm sm:col-span-2">
            <Checkbox
              checked={form.mediaConsent}
              onCheckedChange={(v) => update("mediaConsent", Boolean(v))}
            />
            <span>
              Optional photo/media consent.{" "}
              <PolicyLinkButton docId="media">Details</PolicyLinkButton>
            </span>
          </label>
        </div>
      </fieldset>

      <div className="sm:pt-2">
        <Button
          type="submit"
          disabled={submitting || (!rosterCredit && !paymentMethod)}
          className="h-12 w-full bg-brand text-base text-brand-foreground hover:bg-brand/90 sm:w-auto sm:px-8"
        >
          {submitting
            ? showIntakeSection
              ? "Saving & reserving…"
              : rosterCredit
                ? "Booking…"
                : "Reserving…"
            : showIntakeSection
              ? "Complete intake & join roster"
              : rosterCredit
                ? "Book session"
                : paymentMethod === "stripe"
                  ? "Continue to payment"
                  : "Join roster"}
        </Button>
      </div>
    </form>
  );
}
