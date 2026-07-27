const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return EMAIL_RE.test(trimmed);
}

/** Strip to digits for loose US phone validation/storage. */
export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidUsPhone(value: string): boolean {
  const digits = normalizePhoneDigits(value);
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}

export type PersonNameValues = {
  firstName: string;
  lastName: string;
};

export type ContactEmailPhoneValues = {
  email: string;
  phone: string;
};

export type EmergencyContactValues = {
  name: string;
  phone: string;
};

export type EmergencyContactsValues = {
  primary: EmergencyContactValues;
  secondary?: EmergencyContactValues;
};

export function validatePersonName(values: PersonNameValues): string | null {
  if (!values.firstName.trim()) return "First name is required";
  if (!values.lastName.trim()) return "Last name is required";
  return null;
}

export function validateContactEmailPhone(
  values: ContactEmailPhoneValues,
): string | null {
  if (!isValidEmail(values.email)) return "Enter a valid email";
  if (!isValidUsPhone(values.phone)) return "Enter a valid phone number";
  return null;
}

export function validateEmergencyContacts(
  values: EmergencyContactsValues,
): string | null {
  if (!values.primary.name.trim()) return "Emergency contact name is required";
  if (!isValidUsPhone(values.primary.phone)) {
    return "Emergency contact phone is required";
  }
  const secondary = values.secondary;
  if (secondary?.name.trim() && !isValidUsPhone(secondary.phone)) {
    return "Enter a valid phone for emergency contact 2";
  }
  return null;
}

export function validateWaiverAccepted(accepted: boolean): string | null {
  if (!accepted) return "Please accept the required agreement";
  return null;
}
