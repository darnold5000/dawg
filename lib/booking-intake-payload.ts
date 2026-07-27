import { isMinorAthlete } from "@/lib/athlete-age";
import type { IntakeInput } from "@/lib/intake";

export const INTAKE_SHIRT_SIZES = [
  "Small",
  "Medium",
  "Large",
  "XL",
  "XXL",
  "3XL",
] as const;

export type BookingIntakeFields = {
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
  athleteFirstName: string;
  athleteLastName: string;
  athleteDob: string;
  athleteEmail: string;
  athletePhone: string;
  schoolGrade: string;
  experienceLevel: string;
  heightWeight: string;
  sportPosition: string;
  healthIssues: string;
  emergencyContact1Name: string;
  emergencyContact1Phone: string;
  emergencyContact2Name: string;
  emergencyContact2Phone: string;
  shirtSize: string;
  goal: string;
  mediaConsent: boolean;
  rememberFamily: boolean;
};

/** Build intake API body from unified booking form. */
export function buildIntakePayloadFromBooking(
  fields: BookingIntakeFields,
): IntakeInput {
  const minor = isMinorAthlete(fields.athleteDob);
  const athleteName = `${fields.athleteFirstName.trim()} ${fields.athleteLastName.trim()}`.trim();

  const parentFirstName = minor
    ? fields.parentFirstName.trim()
    : fields.athleteFirstName.trim();
  const parentLastName = minor
    ? fields.parentLastName.trim()
    : fields.athleteLastName.trim();
  const parentEmail = minor
    ? fields.parentEmail.trim()
    : fields.athleteEmail.trim();
  const parentPhone = minor
    ? fields.parentPhone.trim()
    : fields.athletePhone.trim();

  const parentFullName = minor
    ? `${fields.parentFirstName.trim()} ${fields.parentLastName.trim()}`.trim()
    : athleteName;
  const parentPhoneForEc = minor ? fields.parentPhone.trim() : fields.athletePhone.trim();

  const ec1Name =
    fields.emergencyContact1Name.trim() || parentFullName;
  const ec1Phone =
    fields.emergencyContact1Phone.trim() || parentPhoneForEc;

  const shirt =
    fields.shirtSize &&
    (INTAKE_SHIRT_SIZES as readonly string[]).includes(fields.shirtSize)
      ? (fields.shirtSize as (typeof INTAKE_SHIRT_SIZES)[number])
      : null;

  return {
    parentFirstName,
    parentLastName,
    parentEmail,
    parentPhone,
    athleteFirstName: fields.athleteFirstName.trim(),
    athleteLastName: fields.athleteLastName.trim(),
    athleteDob: fields.athleteDob.trim().slice(0, 10),
    schoolGrade: fields.schoolGrade.trim(),
    heightWeight: fields.heightWeight.trim(),
    sportPosition: fields.sportPosition.trim(),
    healthIssues: fields.healthIssues.trim(),
    emergencyContact1Name: ec1Name,
    emergencyContact1Phone: ec1Phone,
    emergencyContact2Name: fields.emergencyContact2Name.trim(),
    emergencyContact2Phone: fields.emergencyContact2Phone.trim(),
    packageInterest: "single",
    shirtSize: shirt,
    goal: fields.goal.trim(),
    acceptWaiver: true,
    mediaConsent: fields.mediaConsent,
    rememberFamily: fields.rememberFamily,
  };
}
