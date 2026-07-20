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
  emergencyContact1Name: z.string().trim().min(1).max(120),
  emergencyContact1Phone: z.string().trim().min(7).max(40),
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

export async function athleteHasIntake(athleteId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return false;
  }
  const supabase = createServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.intakeSubmissions)
    .select("id")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  return Boolean(data);
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

export async function submitIntake(raw: IntakeInput): Promise<
  | {
      ok: true;
      parentId: string;
      athleteId: string;
      intakeId: string;
    }
  | { ok: false; error: string; code?: string }
> {
  const input = intakeSchema.parse(raw);
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Database not configured", code: "NO_DB" };
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

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
    await supabase
      .from(DAWG_TABLES.athletes)
      .update(athletePatch)
      .eq("id", athleteId);
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

  const intakeRow = {
    parent_id: parentId,
    athlete_id: athleteId,
    school_grade: input.schoolGrade || null,
    height_weight: input.heightWeight || null,
    sport_position: input.sportPosition || null,
    health_issues: input.healthIssues || null,
    emergency_contact_1_name: input.emergencyContact1Name,
    emergency_contact_1_phone: input.emergencyContact1Phone,
    emergency_contact_2_name: input.emergencyContact2Name || null,
    emergency_contact_2_phone: input.emergencyContact2Phone || null,
    package_interest: input.packageInterest,
    shirt_size: input.shirtSize || null,
    goal: input.goal || null,
    media_consent: input.mediaConsent,
    agreements_version: CURRENT_AGREEMENTS_VERSION,
    waiver_accepted_at: now,
    updated_at: now,
  };

  const { data: intake, error: intakeError } = await supabase
    .from(DAWG_TABLES.intakeSubmissions)
    .upsert(intakeRow, { onConflict: "athlete_id" })
    .select("id")
    .single();

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
    sendIntakeStaffNotification({
      parentName: `${input.parentFirstName} ${input.parentLastName}`,
      parentEmail: input.parentEmail,
      parentPhone: input.parentPhone,
      athleteName: `${input.athleteFirstName} ${input.athleteLastName}`,
      packageInterest: input.packageInterest,
    }),
  ]);

  await markParentAccountClaimed(parentId);

  return {
    ok: true,
    parentId,
    athleteId,
    intakeId: intake.id,
  };
}
