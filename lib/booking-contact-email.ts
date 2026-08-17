export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function authoritativeGuardianEmail(input: {
  rememberedEmail?: string | null;
  formEmail?: string | null;
  draftEmail?: string | null;
}): {
  email: string;
  source: "remembered" | "form" | "draft" | "missing";
} {
  const remembered = input.rememberedEmail?.trim() ?? "";
  if (remembered && isValidEmail(remembered)) {
    return { email: remembered, source: "remembered" };
  }
  const form = input.formEmail?.trim() ?? "";
  if (form && isValidEmail(form)) {
    return { email: form, source: "form" };
  }
  const draft = input.draftEmail?.trim() ?? "";
  if (draft && isValidEmail(draft)) {
    return { email: draft, source: "draft" };
  }
  return { email: form || remembered || draft, source: "missing" };
}

export function applyRememberedFamilyToBookingBody(
  body: Record<string, unknown>,
  family: {
    parentEmail: string;
    parentFirstName?: string;
    parentLastName?: string;
    parentPhone?: string;
  } | null,
): Record<string, unknown> {
  if (!family?.parentEmail || !isValidEmail(family.parentEmail)) return body;
  return {
    ...body,
    parentEmail: family.parentEmail,
    parentFirstName:
      typeof body.parentFirstName === "string" && body.parentFirstName.trim()
        ? body.parentFirstName
        : family.parentFirstName ?? body.parentFirstName,
    parentLastName:
      typeof body.parentLastName === "string" && body.parentLastName.trim()
        ? body.parentLastName
        : family.parentLastName ?? body.parentLastName,
    parentPhone:
      typeof body.parentPhone === "string" && body.parentPhone.trim()
        ? body.parentPhone
        : family.parentPhone ?? body.parentPhone,
  };
}
