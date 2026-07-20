import { z } from "zod";
import { CURRENT_AGREEMENTS_VERSION } from "@/lib/agreements";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import type { IntakeSubmission } from "@/lib/types/database";
import {
  rememberFamilyOnDevice,
  setFamilyDeviceCookie,
} from "@/lib/family-device";
import { sendIntakeStaffNotification } from "@/lib/email";
import { markParentAccountClaimed } from "@/lib/parent-account";

export const intakeSchema = z.object({
  parentFirstName: z.string().trim().min(1).max(80),
  parentLastName: z.string().trim().min(1).max(80),
  parentEmail: z.string().trim().email().max(160),
  parentPhone: z.string().trim().min(7).max(40),
  athleteFirstName: z.string().trim().min(1).max(80),
  athleteLastName: z.string().trim().min(1).max(80),
  athleteDob: z
    .string()
    .trim()
    .transform((v) => v.slice(0, 10))
    .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth")),
  schoolGrade: z.string().trim().max(80).optional().default(""),
  heightWeight: z.string().trim().max(80).optional().default(""),
  sportPosition: z.string().trim().max(120).optional().default(""),
  healthIssues: z.string().trim().max(2000).optional().default(""),
  emergencyContact1Name: z.string().trim().max(120).optional().default(""),
  emergencyContact1Phone: z.string().trim().max(40).optional().default(""),
  emergencyContact2Name: z.string().trim().max(120).optional().default(""),
  emergencyContact2Phone: z.string().trim().max(40).optional().default(""),
  packageInterest: z.enum(["single", "pack-10", "pack-20"]),
  shirtSize: z
    .enum(["Small", "Medium", "Large", "XL", "XXL", "3XL"])
    .optional()
    .nullable(),
  goal: z.string().trim().max(2000).optional().default(""),
  acceptWaiver: z.literal(true, {
    error: "Please accept the liability waiver.",
  }),
  mediaConsent: z.boolean().default(false),
  rememberFamily: z.boolean().optional().default(true),
});

export type IntakeInput = z.infer<typeof intakeSchema>;

export type AthleteBookingReadiness = {
  hasIntake: boolean;
  waiverCurrent: boolean;
  ready: boolean;
  needsIntake: boolean;
  needsWaiverRenewal: boolean;
};

export type IntakeFormMode = "full" | "add-athlete" | "waiver-only";

export type IntakeFormContext = {
  mode: IntakeFormMode;
  parentOnFile: boolean;
  parentId: string | null;
  athleteId: string | null;
  alreadyComplete: boolean;
  parent: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  } | null;
  emergencyContacts: {
    contact1Name: string;
    contact1Phone: string;
    contact2Name: string;
    contact2Phone: string;
  } | null;
  athlete: {
    firstName: string;
    lastName: string;
    dob: string;
    healthIssues: string;
    mediaConsent: boolean;
  } | null;
};

export type AthleteBookingReadinessStatus =
  | "ready"
  | "waiver_update"
  | "intake_missing";

export function bookingReadinessStatus(
  readiness: AthleteBookingReadiness,
): AthleteBookingReadinessStatus {
  if (readiness.ready) return "ready";
  if (readiness.needsWaiverRenewal) return "waiver_update";
  return "intake_missing";
}

/** Batch lookup for admin roster — one query for all athletes on a session. */
export async function getAthleteBookingReadinessMap(
  athleteIds: string[],
): Promise<Map<string, AthleteBookingReadinessStatus>> {
  const result = new Map<string, AthleteBookingReadinessStatus>();
  const unique = [...new Set(athleteIds.filter(Boolean))];
  if (unique.length === 0) return result;

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    for (const id of unique) result.set(id, "intake_missing");
    return result;
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.intakeSubmissions)
    .select("athlete_id, agreements_version")
    .in("athlete_id", unique);

  const intakeByAthlete = new Map(
    (data ?? []).map((row) => [
      row.athlete_id as string,
      row.agreements_version as string,
    ]),
  );

  for (const id of unique) {
    const version = intakeByAthlete.get(id);
    if (!version) {
      result.set(id, "intake_missing");
    } else if (version !== CURRENT_AGREEMENTS_VERSION) {
      result.set(id, "waiver_update");
    } else {
      result.set(id, "ready");
    }
  }

  return result;
}

export async function athleteBookingReady(
  athleteId: string,
): Promise<AthleteBookingReadiness> {
  const intake = await getIntakeForAthlete(athleteId);
  const hasIntake = Boolean(intake);
  const waiverCurrent =
    hasIntake && intake!.agreements_version === CURRENT_AGREEMENTS_VERSION;
  return {
    hasIntake,
    waiverCurrent,
    ready: hasIntake && waiverCurrent,
    needsIntake: !hasIntake,
    needsWaiverRenewal: hasIntake && !waiverCurrent,
  };
}

/** @deprecated Use athleteBookingReady for booking gates. */
export async function athleteHasIntake(athleteId: string): Promise<boolean> {
  const readiness = await athleteBookingReady(athleteId);
  return readiness.ready;
}

export async function parentHasAnyIntake(parentId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return false;
  }
  const supabase = createServiceClient();
  const { count } = await supabase
    .from(DAWG_TABLES.intakeSubmissions)
    .select("id", { count: "exact", head: true })
    .eq("parent_id", parentId);
  return (count ?? 0) > 0;
}

/** True if this athlete already completed intake (or parent has none and athlete is new — false). */
export async function intakeRequiredForAthlete(
  athleteId: string | null | undefined,
): Promise<boolean> {
  if (!athleteId) return true;
  return !(await athleteHasIntake(athleteId));
}

export async function getIntakeForAthlete(
  athleteId: string,
): Promise<IntakeSubmission | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const supabase = createServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.intakeSubmissions)
    .select("*")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  return (data as IntakeSubmission) ?? null;
}

export async function getParentEmergencyContacts(parentId: string): Promise<{
  contact1Name: string;
  contact1Phone: string;
  contact2Name: string;
  contact2Phone: string;
} | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const supabase = createServiceClient();
  const { data: parent } = await supabase
    .from(DAWG_TABLES.parents)
    .select(
      "emergency_contact_1_name, emergency_contact_1_phone, emergency_contact_2_name, emergency_contact_2_phone",
    )
    .eq("id", parentId)
    .maybeSingle();

  if (
    parent?.emergency_contact_1_name?.trim() &&
    parent?.emergency_contact_1_phone?.trim()
  ) {
    return {
      contact1Name: parent.emergency_contact_1_name.trim(),
      contact1Phone: parent.emergency_contact_1_phone.trim(),
      contact2Name: parent.emergency_contact_2_name?.trim() ?? "",
      contact2Phone: parent.emergency_contact_2_phone?.trim() ?? "",
    };
  }

  const { data: intake } = await supabase
    .from(DAWG_TABLES.intakeSubmissions)
    .select(
      "emergency_contact_1_name, emergency_contact_1_phone, emergency_contact_2_name, emergency_contact_2_phone",
    )
    .eq("parent_id", parentId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    intake?.emergency_contact_1_name?.trim() &&
    intake?.emergency_contact_1_phone?.trim()
  ) {
    return {
      contact1Name: intake.emergency_contact_1_name.trim(),
      contact1Phone: intake.emergency_contact_1_phone.trim(),
      contact2Name: intake.emergency_contact_2_name?.trim() ?? "",
      contact2Phone: intake.emergency_contact_2_phone?.trim() ?? "",
    };
  }

  return null;
}

async function syncParentEmergencyContacts(
  parentId: string,
  input: Pick<
    IntakeInput,
    | "emergencyContact1Name"
    | "emergencyContact1Phone"
    | "emergencyContact2Name"
    | "emergencyContact2Phone"
  >,
) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }
  const supabase = createServiceClient();
  await supabase
    .from(DAWG_TABLES.parents)
    .update({
      emergency_contact_1_name: input.emergencyContact1Name,
      emergency_contact_1_phone: input.emergencyContact1Phone,
      emergency_contact_2_name: input.emergencyContact2Name || null,
      emergency_contact_2_phone: input.emergencyContact2Phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parentId);
}

export async function getIntakeFormContext(input: {
  parentId?: string | null;
  email?: string | null;
  athleteId?: string | null;
  athleteFirstName?: string | null;
  athleteLastName?: string | null;
  athleteDob?: string | null;
}): Promise<IntakeFormContext> {
  const empty: IntakeFormContext = {
    mode: "full",
    parentOnFile: false,
    parentId: null,
    athleteId: null,
    alreadyComplete: false,
    parent: null,
    emergencyContacts: null,
    athlete: null,
  };

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return empty;
  }

  const supabase = createServiceClient();
  let parentId = input.parentId ?? null;

  if (!parentId && input.email?.trim()) {
    const { data } = await supabase
      .from(DAWG_TABLES.parents)
      .select("id")
      .ilike("email", input.email.trim())
      .maybeSingle();
    parentId = data?.id ?? null;
  }

  if (!parentId) return empty;

  const { data: parent } = await supabase
    .from(DAWG_TABLES.parents)
    .select("id, first_name, last_name, email, phone")
    .eq("id", parentId)
    .maybeSingle();

  if (!parent) return empty;

  const emergencyContacts = await getParentEmergencyContacts(parentId);
  const parentOnFile = Boolean(emergencyContacts);

  let athleteId = input.athleteId ?? null;
  let athleteRow: {
    id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    medical_notes: string | null;
  } | null = null;

  if (athleteId) {
    const { data } = await supabase
      .from(DAWG_TABLES.athletes)
      .select("id, first_name, last_name, date_of_birth, medical_notes")
      .eq("id", athleteId)
      .eq("parent_id", parentId)
      .maybeSingle();
    athleteRow = data;
  } else if (
    input.athleteFirstName?.trim() &&
    input.athleteLastName?.trim() &&
    input.athleteDob?.trim()
  ) {
    const { data: siblings } = await supabase
      .from(DAWG_TABLES.athletes)
      .select("id, first_name, last_name, date_of_birth, medical_notes")
      .eq("parent_id", parentId);

    athleteRow =
      (siblings ?? []).find(
        (a) =>
          a.first_name.trim().toLowerCase() ===
            input.athleteFirstName!.trim().toLowerCase() &&
          a.last_name.trim().toLowerCase() ===
            input.athleteLastName!.trim().toLowerCase() &&
          String(a.date_of_birth).slice(0, 10) ===
            input.athleteDob!.trim().slice(0, 10),
      ) ?? null;
    athleteId = athleteRow?.id ?? null;
  }

  let alreadyComplete = false;
  let mode: IntakeFormMode = parentOnFile ? "add-athlete" : "full";

  if (athleteId) {
    const readiness = await athleteBookingReady(athleteId);
    alreadyComplete = readiness.ready;
    if (readiness.needsWaiverRenewal) {
      mode = "waiver-only";
    } else if (readiness.needsIntake) {
      mode = parentOnFile ? "add-athlete" : "full";
    }
  }

  const intake = athleteId ? await getIntakeForAthlete(athleteId) : null;

  return {
    mode,
    parentOnFile,
    parentId,
    athleteId,
    alreadyComplete,
    parent: {
      firstName: parent.first_name ?? "",
      lastName: parent.last_name ?? "",
      email: parent.email ?? "",
      phone: parent.phone ?? "",
    },
    emergencyContacts,
    athlete: athleteRow
      ? {
          firstName: athleteRow.first_name,
          lastName: athleteRow.last_name,
          dob: String(athleteRow.date_of_birth).slice(0, 10),
          healthIssues:
            athleteRow.medical_notes ?? intake?.health_issues ?? "",
          mediaConsent: intake?.media_consent ?? false,
        }
      : input.athleteFirstName
        ? {
            firstName: input.athleteFirstName,
            lastName: input.athleteLastName ?? "",
            dob: input.athleteDob?.slice(0, 10) ?? "",
            healthIssues: "",
            mediaConsent: false,
          }
        : null,
  };
}

export async function listIntakesForParent(
  parentId: string,
): Promise<IntakeSubmission[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }
  const supabase = createServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.intakeSubmissions)
    .select("*")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false });
  return (data as IntakeSubmission[]) ?? [];
}

export async function submitIntake(
  raw: IntakeInput,
  options?: { claimAccount?: boolean; mode?: IntakeFormMode },
): Promise<
  | {
      ok: true;
      parentId: string;
      athleteId: string;
      intakeId: string;
      alreadyComplete?: boolean;
    }
  | { ok: false; error: string; code?: string }
> {
  const input = intakeSchema.parse(raw);
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Database not configured", code: "NO_DB" };
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const mode = options?.mode ?? "full";

  let parentId: string;
  const { data: existingParent } = await supabase
    .from(DAWG_TABLES.parents)
    .select("id")
    .ilike("email", input.parentEmail)
    .maybeSingle();

  if (existingParent) {
    parentId = existingParent.id;
    await supabase
      .from(DAWG_TABLES.parents)
      .update({
        first_name: input.parentFirstName,
        last_name: input.parentLastName,
        phone: input.parentPhone,
      })
      .eq("id", parentId);
  } else {
    const { data: parent, error } = await supabase
      .from(DAWG_TABLES.parents)
      .insert({
        first_name: input.parentFirstName,
        last_name: input.parentLastName,
        email: input.parentEmail,
        phone: input.parentPhone,
      })
      .select("id")
      .single();
    if (error || !parent) {
      return { ok: false, error: "Could not save parent information." };
    }
    parentId = parent.id;
  }

  const savedEmergency =
    (await getParentEmergencyContacts(parentId)) ??
    (input.emergencyContact1Name.trim() && input.emergencyContact1Phone.trim()
      ? {
          contact1Name: input.emergencyContact1Name.trim(),
          contact1Phone: input.emergencyContact1Phone.trim(),
          contact2Name: input.emergencyContact2Name.trim(),
          contact2Phone: input.emergencyContact2Phone.trim(),
        }
      : null);

  if (!savedEmergency) {
    return {
      ok: false,
      error: "Emergency contact is required.",
      code: "EMERGENCY_REQUIRED",
    };
  }

  if (
    mode !== "waiver-only" &&
    input.emergencyContact1Name.trim() &&
    input.emergencyContact1Phone.trim()
  ) {
    await syncParentEmergencyContacts(parentId, {
      emergencyContact1Name: input.emergencyContact1Name,
      emergencyContact1Phone: input.emergencyContact1Phone,
      emergencyContact2Name: input.emergencyContact2Name,
      emergencyContact2Phone: input.emergencyContact2Phone,
    });
  }

  const { data: siblings } = await supabase
    .from(DAWG_TABLES.athletes)
    .select("id, first_name, last_name, date_of_birth")
    .eq("parent_id", parentId);

  const match = (siblings ?? []).find(
    (a) =>
      a.first_name.trim().toLowerCase() ===
        input.athleteFirstName.trim().toLowerCase() &&
      a.last_name.trim().toLowerCase() ===
        input.athleteLastName.trim().toLowerCase() &&
      a.date_of_birth === input.athleteDob,
  );

  const athletePatch = {
    first_name: input.athleteFirstName,
    last_name: input.athleteLastName,
    date_of_birth: input.athleteDob,
    primary_sport: input.sportPosition || null,
    medical_notes: input.healthIssues || null,
  };

  let athleteId: string;
  if (match) {
    athleteId = match.id;
    if (mode !== "waiver-only") {
      await supabase
        .from(DAWG_TABLES.athletes)
        .update(athletePatch)
        .eq("id", athleteId);
    }
  } else if (mode === "waiver-only") {
    return {
      ok: false,
      error: "Athlete not found for waiver renewal.",
      code: "ATHLETE_NOT_FOUND",
    };
  } else {
    const { data: created, error } = await supabase
      .from(DAWG_TABLES.athletes)
      .insert({ parent_id: parentId, ...athletePatch })
      .select("id")
      .single();
    if (error || !created) {
      return { ok: false, error: "Could not save athlete information." };
    }
    athleteId = created.id;
  }

  const existingIntake = await getIntakeForAthlete(athleteId);
  const readiness = await athleteBookingReady(athleteId);
  if (readiness.ready) {
    return {
      ok: true,
      parentId,
      athleteId,
      intakeId: existingIntake!.id,
      alreadyComplete: true,
    };
  }

  const intakeRow =
    mode === "waiver-only" && existingIntake
      ? null
      : {
          parent_id: parentId,
          athlete_id: athleteId,
          school_grade: input.schoolGrade || null,
          height_weight: input.heightWeight || null,
          sport_position: input.sportPosition || null,
          health_issues: input.healthIssues || null,
          emergency_contact_1_name: savedEmergency.contact1Name,
          emergency_contact_1_phone: savedEmergency.contact1Phone,
          emergency_contact_2_name: savedEmergency.contact2Name || null,
          emergency_contact_2_phone: savedEmergency.contact2Phone || null,
          package_interest: input.packageInterest,
          shirt_size: input.shirtSize || null,
          goal: input.goal || null,
          media_consent: input.mediaConsent,
          agreements_version: CURRENT_AGREEMENTS_VERSION,
          waiver_accepted_at: now,
          updated_at: now,
        };

  let intake: { id: string } | null = null;
  let intakeError: { message: string } | null = null;

  if (mode === "waiver-only" && existingIntake) {
    const result = await supabase
      .from(DAWG_TABLES.intakeSubmissions)
      .update({
        media_consent: input.mediaConsent,
        agreements_version: CURRENT_AGREEMENTS_VERSION,
        waiver_accepted_at: now,
        updated_at: now,
      })
      .eq("athlete_id", athleteId)
      .select("id")
      .single();
    intake = result.data;
    intakeError = result.error;
  } else {
    const result = await supabase
      .from(DAWG_TABLES.intakeSubmissions)
      .upsert(intakeRow!, { onConflict: "athlete_id" })
      .select("id")
      .single();
    intake = result.data;
    intakeError = result.error;
  }

  if (intakeError || !intake) {
    console.error("[intake] upsert", intakeError);
    return {
      ok: false,
      error: "Could not save intake. Run the latest database migration.",
      code: "INTAKE_SAVE_FAILED",
    };
  }

  if (input.rememberFamily) {
    try {
      const remembered = await rememberFamilyOnDevice({
        parentId,
        agreementsVersion: CURRENT_AGREEMENTS_VERSION,
        mediaConsent: input.mediaConsent,
      });
      if ("token" in remembered) {
        await setFamilyDeviceCookie(remembered.token);
      }
    } catch (err) {
      console.error("[intake] remember family", err);
    }
  }

  await Promise.allSettled([
    mode === "waiver-only"
      ? Promise.resolve()
      : sendIntakeStaffNotification({
          parentName: `${input.parentFirstName} ${input.parentLastName}`,
          parentEmail: input.parentEmail,
          parentPhone: input.parentPhone,
          athleteName: `${input.athleteFirstName} ${input.athleteLastName}`,
          packageInterest: input.packageInterest,
        }),
  ]);

  if (options?.claimAccount) {
    await markParentAccountClaimed(parentId);
  }

  return {
    ok: true,
    parentId,
    athleteId,
    intakeId: intake.id,
  };
}
