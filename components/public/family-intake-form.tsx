"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PolicyLinkButton } from "@/components/public/policy-dialog";
import {
  IntakeAccountPrompt,
  IntakeAlreadyComplete,
} from "@/components/public/intake-complete-prompts";
import { loadBookingDraft } from "@/lib/booking-draft";
import type { IntakeFormContext, IntakeFormMode } from "@/lib/intake";

const SHIRT_SIZES = ["Small", "Medium", "Large", "XL", "XXL", "3XL"] as const;

type ContactFields = {
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
};

export function FamilyIntakeForm({
  returnTo,
  initialContact,
  athleteId: initialAthleteId,
}: {
  returnTo: string;
  initialContact?: Partial<ContactFields>;
  athleteId?: string | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<IntakeFormMode>("full");
  const [alreadyComplete, setAlreadyComplete] = useState(false);
  const [form, setForm] = useState({
    parentFirstName: initialContact?.parentFirstName ?? "",
    parentLastName: initialContact?.parentLastName ?? "",
    parentEmail: initialContact?.parentEmail ?? "",
    parentPhone: initialContact?.parentPhone ?? "",
    athleteFirstName: "",
    athleteLastName: "",
    athleteDob: "",
    schoolGrade: "",
    heightWeight: "",
    sportPosition: "",
    healthIssues: "",
    emergencyContact1Name: "",
    emergencyContact1Phone: "",
    emergencyContact2Name: "",
    emergencyContact2Phone: "",
    shirtSize: "",
    goal: "",
    acceptWaiver: false,
    mediaConsent: false,
  });

  useEffect(() => {
    let cancelled = false;
    const draftSession = returnTo.match(/^\/book\/([^/?]+)/)?.[1];
    const draft = draftSession ? loadBookingDraft(draftSession) : null;

    async function loadContext() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (initialAthleteId) params.set("athleteId", initialAthleteId);
        if (draft?.parentEmail || form.parentEmail) {
          params.set("email", draft?.parentEmail || form.parentEmail);
        }
        if (draft?.athleteFirstName) {
          params.set("athleteFirstName", draft.athleteFirstName);
          params.set("athleteLastName", draft.athleteLastName ?? "");
          params.set("athleteDob", draft.athleteDob ?? "");
        }

        const res = await fetch(`/api/intake/context?${params.toString()}`, {
          credentials: "same-origin",
        });
        if (!res.ok || cancelled) return;
        const context = (await res.json()) as IntakeFormContext;
        if (cancelled) return;

        setMode(context.mode);
        setAlreadyComplete(context.alreadyComplete);
        setForm((prev) => ({
          ...prev,
          parentFirstName:
            context.parent?.firstName ||
            draft?.parentFirstName ||
            prev.parentFirstName,
          parentLastName:
            context.parent?.lastName ||
            draft?.parentLastName ||
            prev.parentLastName,
          parentEmail:
            context.parent?.email || draft?.parentEmail || prev.parentEmail,
          parentPhone:
            context.parent?.phone || draft?.parentPhone || prev.parentPhone,
          athleteFirstName:
            context.athlete?.firstName ||
            draft?.athleteFirstName ||
            prev.athleteFirstName,
          athleteLastName:
            context.athlete?.lastName ||
            draft?.athleteLastName ||
            prev.athleteLastName,
          athleteDob: context.athlete?.dob || draft?.athleteDob || prev.athleteDob,
          healthIssues: context.athlete?.healthIssues || prev.healthIssues,
          mediaConsent: context.athlete?.mediaConsent ?? prev.mediaConsent,
          emergencyContact1Name:
            context.emergencyContacts?.contact1Name ||
            prev.emergencyContact1Name,
          emergencyContact1Phone:
            context.emergencyContacts?.contact1Phone ||
            prev.emergencyContact1Phone,
          emergencyContact2Name:
            context.emergencyContacts?.contact2Name ||
            prev.emergencyContact2Name,
          emergencyContact2Phone:
            context.emergencyContacts?.contact2Phone ||
            prev.emergencyContact2Phone,
          sportPosition: draft?.primarySport || prev.sportPosition,
        }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadContext();
    return () => {
      cancelled = true;
    };
  }, [returnTo, initialAthleteId, form.parentEmail]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.acceptWaiver) {
      toast.error("Please accept the liability waiver");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          shirtSize: form.shirtSize || null,
          acceptWaiver: true as const,
          packageInterest: "single",
          rememberFamily: true,
          returnTo,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save intake");
        return;
      }
      if (data.alreadyComplete) {
        toast.success("You're already set — continuing");
      } else {
        toast.success(
          mode === "waiver-only" ? "Waiver updated" : "Intake saved",
        );
      }
      router.push(data.redirectTo ?? returnTo);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const athleteName = form.athleteFirstName
    ? `${form.athleteFirstName} ${form.athleteLastName}`.trim()
    : undefined;

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading your information…</p>
    );
  }

  if (alreadyComplete) {
    return (
      <IntakeAlreadyComplete returnTo={returnTo} athleteName={athleteName} />
    );
  }

  const showParent = mode === "full";
  const showEmergency = mode === "full";
  const showAthleteDetails = mode !== "waiver-only";
  const showExtras = mode === "full" || mode === "add-athlete";
  const submitLabel =
    mode === "waiver-only"
      ? "Accept updated waiver & continue"
      : mode === "add-athlete"
        ? "Add athlete & continue"
        : "Save & continue";

  return (
    <div className="space-y-6">
      {mode === "add-athlete" ? (
        <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Your family contact and emergency info are already on file. Add details
          for this athlete only.
        </p>
      ) : null}
      {mode === "waiver-only" ? (
        <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Our liability waiver has been updated. Please review and accept the new
          version to continue booking — your other information stays on file.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-6">
        {showParent ? (
          <fieldset className="form-fieldset grid gap-3 sm:grid-cols-2">
            <legend className="mb-1 px-1 font-heading text-lg tracking-wide sm:col-span-2">
              Parent / guardian
            </legend>
            <div className="space-y-1.5">
              <Label htmlFor="intakeParentFirst">First name</Label>
              <Input
                id="intakeParentFirst"
                required
                value={form.parentFirstName}
                onChange={(e) => update("parentFirstName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="intakeParentLast">Last name</Label>
              <Input
                id="intakeParentLast"
                required
                value={form.parentLastName}
                onChange={(e) => update("parentLastName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="intakeParentEmail">Email</Label>
              <Input
                id="intakeParentEmail"
                type="email"
                required
                value={form.parentEmail}
                onChange={(e) => update("parentEmail", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="intakeParentPhone">Phone</Label>
              <Input
                id="intakeParentPhone"
                type="tel"
                required
                value={form.parentPhone}
                onChange={(e) => update("parentPhone", e.target.value)}
              />
            </div>
          </fieldset>
        ) : (
          <>
            <input type="hidden" value={form.parentFirstName} readOnly />
            <input type="hidden" value={form.parentLastName} readOnly />
            <input type="hidden" value={form.parentEmail} readOnly />
            <input type="hidden" value={form.parentPhone} readOnly />
          </>
        )}

        {showAthleteDetails ? (
          <fieldset className="form-fieldset grid gap-3 sm:grid-cols-2">
            <legend className="mb-1 px-1 font-heading text-lg tracking-wide sm:col-span-2">
              Athlete
            </legend>
            <div className="space-y-1.5">
              <Label htmlFor="intakeAthleteFirst">First name</Label>
              <Input
                id="intakeAthleteFirst"
                required
                value={form.athleteFirstName}
                onChange={(e) => update("athleteFirstName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="intakeAthleteLast">Last name</Label>
              <Input
                id="intakeAthleteLast"
                required
                value={form.athleteLastName}
                onChange={(e) => update("athleteLastName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="intakeAthleteDob">Date of birth</Label>
              <Input
                id="intakeAthleteDob"
                type="date"
                required
                value={form.athleteDob}
                onChange={(e) => update("athleteDob", e.target.value)}
              />
            </div>
            {showExtras ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="intakeSchoolGrade">School grade</Label>
                  <Input
                    id="intakeSchoolGrade"
                    value={form.schoolGrade}
                    onChange={(e) => update("schoolGrade", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="intakeHeightWeight">Height / weight</Label>
                  <Input
                    id="intakeHeightWeight"
                    value={form.heightWeight}
                    onChange={(e) => update("heightWeight", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="intakeSport">Sport / position</Label>
                  <Input
                    id="intakeSport"
                    value={form.sportPosition}
                    onChange={(e) => update("sportPosition", e.target.value)}
                  />
                </div>
              </>
            ) : null}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="intakeHealth">Health issues / allergies</Label>
              <Textarea
                id="intakeHealth"
                value={form.healthIssues}
                onChange={(e) => update("healthIssues", e.target.value)}
              />
            </div>
          </fieldset>
        ) : (
          <>
            <input type="hidden" value={form.athleteFirstName} readOnly />
            <input type="hidden" value={form.athleteLastName} readOnly />
            <input type="hidden" value={form.athleteDob} readOnly />
          </>
        )}

        {showEmergency ? (
          <fieldset className="form-fieldset grid gap-3 sm:grid-cols-2">
            <legend className="mb-1 px-1 font-heading text-lg tracking-wide sm:col-span-2">
              Emergency contacts
            </legend>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="intakeEc1Name">Contact 1 name</Label>
              <Input
                id="intakeEc1Name"
                required
                value={form.emergencyContact1Name}
                onChange={(e) => update("emergencyContact1Name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="intakeEc1Phone">Contact 1 phone</Label>
              <Input
                id="intakeEc1Phone"
                type="tel"
                required
                value={form.emergencyContact1Phone}
                onChange={(e) => update("emergencyContact1Phone", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="intakeEc2Name">Contact 2 name (optional)</Label>
              <Input
                id="intakeEc2Name"
                value={form.emergencyContact2Name}
                onChange={(e) => update("emergencyContact2Name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="intakeEc2Phone">Contact 2 phone (optional)</Label>
              <Input
                id="intakeEc2Phone"
                type="tel"
                value={form.emergencyContact2Phone}
                onChange={(e) => update("emergencyContact2Phone", e.target.value)}
              />
            </div>
          </fieldset>
        ) : (
          <>
            <input type="hidden" value={form.emergencyContact1Name} readOnly />
            <input type="hidden" value={form.emergencyContact1Phone} readOnly />
            <input type="hidden" value={form.emergencyContact2Name} readOnly />
            <input type="hidden" value={form.emergencyContact2Phone} readOnly />
          </>
        )}

        {showExtras ? (
          <fieldset className="form-fieldset grid gap-3 sm:grid-cols-2">
            <legend className="mb-1 px-1 font-heading text-lg tracking-wide sm:col-span-2">
              Additional info
            </legend>
            <div className="space-y-1.5">
              <Label htmlFor="intakeShirt">Shirt size</Label>
              <select
                id="intakeShirt"
                className="form-select"
                value={form.shirtSize}
                onChange={(e) => update("shirtSize", e.target.value)}
              >
                <option value="">Select</option>
                {SHIRT_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="intakeGoal">Training goals (optional)</Label>
              <Textarea
                id="intakeGoal"
                value={form.goal}
                onChange={(e) => update("goal", e.target.value)}
              />
            </div>
          </fieldset>
        ) : null}

        <fieldset className="space-y-3 rounded-xl border border-border p-4">
          <legend className="px-1 font-heading text-lg tracking-wide">
            Agreements
          </legend>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={form.acceptWaiver}
              onCheckedChange={(v) => update("acceptWaiver", Boolean(v))}
              required
            />
            <span>
              I accept the liability waiver and booking policies.{" "}
              <PolicyLinkButton docId="waiver">Waiver</PolicyLinkButton>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={form.mediaConsent}
              onCheckedChange={(v) => update("mediaConsent", Boolean(v))}
            />
            <span>
              Photo / media consent for this athlete (optional).{" "}
              <PolicyLinkButton docId="media">Details</PolicyLinkButton>
            </span>
          </label>
        </fieldset>

        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
        >
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </form>

      <IntakeAccountPrompt returnTo={returnTo} />
    </div>
  );
}
