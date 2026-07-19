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
  paymentMethodLabel,
} from "@/lib/billing/payment-options";
import type { PaymentMethod } from "@/lib/types/database";
import {
  formatPrice,
  formatSessionDate,
  formatSessionTime,
} from "@/lib/format";

const emptyForm = {
  parentFirstName: "",
  parentLastName: "",
  parentEmail: "",
  parentPhone: "",
  athleteFirstName: "",
  athleteLastName: "",
  athleteDob: "",
  primarySport: "",
  experienceLevel: "",
  medicalNotes: "",
  customerNotes: "",
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
  const [useSaved, setUseSaved] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  const [editingDetails, setEditingDetails] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const paymentOptions = allowedPaymentMethods(session.payment_requirement);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">(
    () => defaultPaymentMethod(session.payment_requirement) ?? "",
  );

  const agreementsNeeded = !savedFamily?.agreementsCurrent;

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const draft = loadBookingDraft(session.id);
      const family = await fetchRememberedFamily();

      if (cancelled) return;

      if (family && family.athletes.length > 0) {
        setSavedFamily(family);
        setUseSaved(true);
        const athlete =
          family.athletes.find((a) => a.id === draft?.selectedAthleteId) ??
          family.athletes[0];
        setSelectedAthleteId(
          draft?.editingDetails ? "__new__" : athlete.id,
        );
        setEditingDetails(Boolean(draft?.editingDetails));
        setForm((prev) => ({
          ...prev,
          parentFirstName: draft?.parentFirstName || family.parentFirstName,
          parentLastName: draft?.parentLastName || family.parentLastName,
          parentEmail: draft?.parentEmail || family.parentEmail,
          parentPhone: draft?.parentPhone || family.parentPhone,
          athleteFirstName: draft?.athleteFirstName || athlete.firstName,
          athleteLastName: draft?.athleteLastName || athlete.lastName,
          athleteDob: draft?.athleteDob || athlete.dob,
          primarySport:
            draft?.primarySport || athlete.primarySport || "",
          experienceLevel:
            draft?.experienceLevel || athlete.experienceLevel || "",
          medicalNotes: draft?.medicalNotes || "",
          customerNotes: draft?.customerNotes || "",
          rememberFamily: true,
          mediaConsent:
            draft?.mediaConsent ?? family.mediaConsentPreference ?? false,
          acceptRequiredAgreements:
            draft?.acceptRequiredAgreements ??
            Boolean(family.agreementsCurrent),
        }));
        if (draft?.paymentMethod) {
          const allowed = allowedPaymentMethods(session.payment_requirement);
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
          primarySport: draft.primarySport,
          experienceLevel: draft.experienceLevel,
          medicalNotes: draft.medicalNotes,
          customerNotes: draft.customerNotes,
          rememberFamily: draft.rememberFamily,
          mediaConsent: draft.mediaConsent,
          acceptRequiredAgreements: draft.acceptRequiredAgreements,
        }));
        if (draft.paymentMethod) {
          const allowed = allowedPaymentMethods(session.payment_requirement);
          if (allowed.includes(draft.paymentMethod as PaymentMethod)) {
            setPaymentMethod(draft.paymentMethod as PaymentMethod);
          }
        }
        if (draft.selectedAthleteId) {
          setSelectedAthleteId(draft.selectedAthleteId);
        }
        setEditingDetails(draft.editingDetails);
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
        primarySport: form.primarySport,
        experienceLevel: form.experienceLevel,
        medicalNotes: form.medicalNotes,
        customerNotes: form.customerNotes,
        paymentMethod,
        rememberFamily: form.rememberFamily,
        mediaConsent: form.mediaConsent,
        acceptRequiredAgreements: form.acceptRequiredAgreements,
        selectedAthleteId,
        editingDetails,
        updatedAt: new Date().toISOString(),
      });
    }, 350);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [
    hydrated,
    waitlistMode,
    session.id,
    form,
    paymentMethod,
    selectedAthleteId,
    editingDetails,
  ]);

  function applyFamily(family: SavedFamily, athlete: SavedAthlete) {
    setSelectedAthleteId(athlete.id);
    setEditingDetails(false);
    setForm((prev) => ({
      ...prev,
      parentFirstName: family.parentFirstName,
      parentLastName: family.parentLastName,
      parentEmail: family.parentEmail,
      parentPhone: family.parentPhone,
      athleteFirstName: athlete.firstName,
      athleteLastName: athlete.lastName,
      athleteDob: athlete.dob,
      primarySport: athlete.primarySport ?? "",
      experienceLevel: athlete.experienceLevel ?? "",
      medicalNotes: "",
      customerNotes: prev.customerNotes,
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
      setEditingDetails(true);
      setForm((prev) => ({
        ...prev,
        athleteFirstName: "",
        athleteLastName: "",
        athleteDob: "",
        primarySport: "",
        experienceLevel: "",
        medicalNotes: "",
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
    setUseSaved(false);
    setSelectedAthleteId("");
    setEditingDetails(false);
    setForm(emptyForm);
    setPaymentMethod(defaultPaymentMethod(session.payment_requirement) ?? "");
    clearBookingDraft(session.id);
  }

  const compactReturning =
    useSaved &&
    savedFamily &&
    selectedAthleteId !== "__new__" &&
    !editingDetails;

  const selectedAthlete = savedFamily?.athletes.find(
    (a) => a.id === selectedAthleteId,
  );

  const paymentSummary = useMemo(() => {
    if (!paymentMethod) return "Select a payment method";
    return paymentMethodLabel(paymentMethod);
  }, [paymentMethod]);

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

      if (!paymentMethod) {
        toast.error("Please select a payment method");
        return;
      }

      if (agreementsNeeded && !form.acceptRequiredAgreements) {
        toast.error("Please accept the required agreements");
        return;
      }

      const athleteDob = form.athleteDob.trim().slice(0, 10);
      if (
        !form.parentFirstName.trim() ||
        !form.parentLastName.trim() ||
        !form.parentEmail.trim() ||
        form.parentPhone.trim().length < 7 ||
        !form.athleteFirstName.trim() ||
        !form.athleteLastName.trim() ||
        !/^\d{4}-\d{2}-\d{2}$/.test(athleteDob)
      ) {
        toast.error(
          "Missing parent or athlete details. Tap Edit details and complete the form.",
        );
        setEditingDetails(true);
        return;
      }

      const athleteId =
        selectedAthleteId &&
        selectedAthleteId !== "__new__" &&
        /^[0-9a-f-]{36}$/i.test(selectedAthleteId)
          ? selectedAthleteId
          : undefined;

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          parentFirstName: form.parentFirstName.trim(),
          parentLastName: form.parentLastName.trim(),
          parentEmail: form.parentEmail.trim(),
          parentPhone: form.parentPhone.trim(),
          athleteFirstName: form.athleteFirstName.trim(),
          athleteLastName: form.athleteLastName.trim(),
          athleteDob,
          athleteId,
          primarySport: form.primarySport || undefined,
          experienceLevel: form.experienceLevel || undefined,
          medicalNotes: form.medicalNotes || undefined,
          customerNotes: form.customerNotes || undefined,
          paymentMethod,
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
        return;
      }

      clearBookingDraft(session.id);

      if (form.rememberFamily && data.demo) {
        saveDemoFamily({
          parentFirstName: form.parentFirstName,
          parentLastName: form.parentLastName,
          parentEmail: form.parentEmail,
          parentPhone: form.parentPhone,
          athleteFirstName: form.athleteFirstName,
          athleteLastName: form.athleteLastName,
          athleteDob: form.athleteDob,
          primarySport: form.primarySport || undefined,
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
        payment: paymentMethod,
      });
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
          {formatSessionTime(session.start_time)} ·{" "}
          {formatPrice(session.price_cents)}
        </p>
      </div>

      {savedFamily ? (
        <div className="rounded-xl border border-brand/40 bg-brand/10 p-4">
          <p className="text-sm font-semibold">
            Welcome back, {savedFamily.parentFirstName}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            We recognized this family on this device. Choose an athlete to
            continue — no account needed.
          </p>
          {useSaved ? (
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="savedAthlete">Athlete</Label>
                <select
                  id="savedAthlete"
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedAthleteId}
                  onChange={(e) => onSelectAthlete(e.target.value)}
                >
                  {savedFamily.athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.firstName} {athlete.lastName}
                    </option>
                  ))}
                  <option value="__new__">Add another athlete</option>
                </select>
              </div>
              <button
                type="button"
                className="text-sm underline underline-offset-2"
                onClick={() => void bookAsDifferentFamily()}
              >
                Not your family? Forget this device
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <label className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm">
          <Checkbox
            checked={form.rememberFamily}
            onCheckedChange={(v) => update("rememberFamily", Boolean(v))}
          />
          <span>
            <span className="font-medium">Remember this family on this device</span>
            <span className="mt-0.5 block text-muted-foreground">
              Saves parent contact and athlete profiles for faster bookings.
              Medical notes and waiver details are not stored in the browser.
            </span>
          </span>
        </label>
      )}

      {compactReturning && selectedAthlete && savedFamily ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-heading text-lg tracking-wide">Your booking</h3>
            <button
              type="button"
              className="shrink-0 text-sm underline underline-offset-2"
              onClick={() => setEditingDetails(true)}
            >
              Edit details
            </button>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Parent</dt>
              <dd className="font-medium">
                {form.parentFirstName} {form.parentLastName}
              </dd>
              <dd className="text-muted-foreground">{form.parentEmail}</dd>
              <dd className="text-muted-foreground">{form.parentPhone}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Athlete</dt>
              <dd className="font-medium">
                {form.athleteFirstName} {form.athleteLastName}
              </dd>
              <dd className="text-muted-foreground">DOB {form.athleteDob}</dd>
            </div>
          </dl>
          <div className="space-y-1.5">
            <Label htmlFor="customerNotes">Optional notes</Label>
            <Textarea
              id="customerNotes"
              value={form.customerNotes}
              onChange={(e) => update("customerNotes", e.target.value)}
              rows={2}
            />
          </div>
        </div>
      ) : (
        <>
          <fieldset className="space-y-3 rounded-xl border border-border p-4">
            <legend className="px-1 font-heading text-lg tracking-wide">
              Parent or guardian
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="parentFirstName">First name</Label>
                <Input
                  id="parentFirstName"
                  required
                  value={form.parentFirstName}
                  onChange={(e) => update("parentFirstName", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="parentLastName">Last name</Label>
                <Input
                  id="parentLastName"
                  required
                  value={form.parentLastName}
                  onChange={(e) => update("parentLastName", e.target.value)}
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
                />
              </div>
            </div>
            {savedFamily ? (
              <button
                type="button"
                className="text-sm underline underline-offset-2"
                onClick={() => {
                  setEditingDetails(false);
                  if (selectedAthlete) applyFamily(savedFamily, selectedAthlete);
                }}
              >
                Done editing parent details
              </button>
            ) : null}
          </fieldset>

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
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="athleteLastName">Last name</Label>
                <Input
                  id="athleteLastName"
                  required
                  value={form.athleteLastName}
                  onChange={(e) => update("athleteLastName", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="athleteDob">Date of birth</Label>
                <Input
                  id="athleteDob"
                  type="date"
                  required
                  value={form.athleteDob}
                  onChange={(e) => update("athleteDob", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="primarySport">Primary sport</Label>
                <Input
                  id="primarySport"
                  value={form.primarySport}
                  onChange={(e) => update("primarySport", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="experienceLevel">Experience level</Label>
                <Input
                  id="experienceLevel"
                  placeholder="Beginner, Intermediate…"
                  value={form.experienceLevel}
                  onChange={(e) => update("experienceLevel", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="medicalNotes">
                  Medical or physical considerations
                </Label>
                <Textarea
                  id="medicalNotes"
                  value={form.medicalNotes}
                  onChange={(e) => update("medicalNotes", e.target.value)}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Shared with coaches for this booking only — not saved in
                  browser memory.
                </p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="customerNotesFull">Optional notes</Label>
                <Textarea
                  id="customerNotesFull"
                  value={form.customerNotes}
                  onChange={(e) => update("customerNotes", e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            {savedFamily && editingDetails ? (
              <button
                type="button"
                className="text-sm underline underline-offset-2"
                onClick={() => setEditingDetails(false)}
              >
                Collapse athlete details
              </button>
            ) : null}
          </fieldset>

          {!savedFamily ? null : (
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={form.rememberFamily}
                onCheckedChange={(v) => update("rememberFamily", Boolean(v))}
              />
              <span>Keep this family remembered on this device</span>
            </label>
          )}
        </>
      )}

      <fieldset className="space-y-3 rounded-xl border border-border p-4">
        <legend className="px-1 font-heading text-lg tracking-wide">
          Payment
        </legend>
        <p className="text-sm text-muted-foreground">
          {formatPrice(session.price_cents)} due for this session
        </p>
        <div className="grid gap-3">
          {paymentOptions.map((method) => (
            <label
              key={method}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
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
                <span className="font-medium">{paymentMethodLabel(method)}</span>
                <span className="mt-0.5 block text-muted-foreground">
                  {method === "stripe"
                    ? "Secure card payment via Stripe. Spot is held for 15 minutes while you pay."
                    : "Reserve your spot now and pay when you arrive."}
                </span>
              </span>
            </label>
          ))}
        </div>
        {session.payment_requirement === "online_or_facility" &&
        !paymentMethod ? (
          <p className="text-sm text-amber-800">
            Choose pay online or pay at facility — neither is selected by
            default.
          </p>
        ) : null}
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-border p-4">
        <legend className="px-1 font-heading text-lg tracking-wide">
          Agreements
        </legend>
        {agreementsNeeded ? (
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={form.acceptRequiredAgreements}
              onCheckedChange={(v) =>
                update("acceptRequiredAgreements", Boolean(v))
              }
              required
            />
            <span>
              I am the athlete’s parent or legal guardian and I accept the{" "}
              <PolicyLinkButton docId="booking">booking policy</PolicyLinkButton>
              ,{" "}
              <PolicyLinkButton
                docId="cancellation"
                cancellationText={session.cancellation_policy}
              >
                cancellation policy
              </PolicyLinkButton>
              ,{" "}
              <PolicyLinkButton docId="privacy">privacy policy</PolicyLinkButton>
              , and{" "}
              <PolicyLinkButton docId="waiver">
                liability waiver acknowledgment
              </PolicyLinkButton>
              .
            </span>
          </label>
        ) : (
          <p className="text-sm text-muted-foreground">
            Required policies were already accepted on this device.{" "}
            <PolicyLinkButton docId="booking">Review booking policy</PolicyLinkButton>
            {" · "}
            <PolicyLinkButton
              docId="cancellation"
              cancellationText={session.cancellation_policy}
            >
              cancellation
            </PolicyLinkButton>
            {" · "}
            <PolicyLinkButton docId="privacy">privacy</PolicyLinkButton>
            {" · "}
            <PolicyLinkButton docId="waiver">waiver</PolicyLinkButton>
          </p>
        )}
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={form.mediaConsent}
            onCheckedChange={(v) => update("mediaConsent", Boolean(v))}
          />
          <span>
            Photo / media consent (optional).{" "}
            <PolicyLinkButton docId="media">Details</PolicyLinkButton>
          </span>
        </label>
      </fieldset>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/95 px-4 py-4 backdrop-blur supports-backdrop-filter:bg-background/80 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mb-3 rounded-lg border border-border bg-card px-3 py-2 text-sm sm:mb-4">
          <p>
            <span className="text-muted-foreground">Payment: </span>
            <span className="font-medium">{paymentSummary}</span>
            {paymentMethod ? (
              <span className="text-muted-foreground">
                {" "}
                · {formatPrice(session.price_cents)}
              </span>
            ) : null}
          </p>
          {form.parentFirstName && form.athleteFirstName ? (
            <p className="mt-1 text-muted-foreground">
              {form.athleteFirstName} {form.athleteLastName} ·{" "}
              {form.parentFirstName} {form.parentLastName}
            </p>
          ) : null}
        </div>
        <Button
          type="submit"
          disabled={submitting || !paymentMethod}
          className="h-12 w-full bg-brand text-base text-brand-foreground hover:bg-brand/90 sm:w-auto sm:px-8"
        >
          {submitting
            ? paymentMethod === "stripe"
              ? "Starting checkout…"
              : "Reserving…"
            : paymentMethod === "stripe"
              ? "Continue to payment"
              : "Confirm reservation"}
        </Button>
      </div>
    </form>
  );
}
