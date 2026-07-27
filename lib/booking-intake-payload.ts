import { isMinorAthlete } from "@/lib/athlete-age";
import type { IntakeInput } from "@/lib/intake";

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
  healthNotes: string;
  mediaConsent: boolean;
  rememberFamily: boolean;
};

/** Build intake API body from unified booking form (null if intake step skipped). */
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

  const emergencyName = minor ? `${fields.parentFirstName.trim()} ${fields.parentLastName.trim()}`.trim() : athleteName;
  const emergencyPhone = minor
    ? fields.parentPhone.trim()
    : fields.athletePhone.trim();

  return {
    parentFirstName,
    parentLastName,
    parentEmail,
    parentPhone,
    athleteFirstName: fields.athleteFirstName.trim(),
    athleteLastName: fields.athleteLastName.trim(),
    athleteDob: fields.athleteDob.trim().slice(0, 10),
    schoolGrade: fields.schoolGrade.trim(),
    heightWeight: "",
    sportPosition: "",
    healthIssues: fields.healthNotes.trim(),
    emergencyContact1Name: emergencyName,
    emergencyContact1Phone: emergencyPhone,
    emergencyContact2Name: "",
    emergencyContact2Phone: "",
    packageInterest: "single",
    shirtSize: null,
    goal: "",
    acceptWaiver: true,
    mediaConsent: fields.mediaConsent,
    rememberFamily: fields.rememberFamily,
  };
}
