import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthLinkType = "invite" | "recovery" | "magiclink";

export type AuthLinkResult = {
  type: AuthLinkType;
  email: string;
  actionLink: string;
  userId: string | null;
  redirectTo: string;
};

type BaseLinkInput = {
  email: string;
  redirectTo: string;
  userMetadata?: Record<string, unknown>;
};

type AdminClient = SupabaseClient;

async function extractLinkResult(
  type: AuthLinkType,
  email: string,
  redirectTo: string,
  data: Awaited<
    ReturnType<AdminClient["auth"]["admin"]["generateLink"]>
  >["data"],
  error: Awaited<
    ReturnType<AdminClient["auth"]["admin"]["generateLink"]>
  >["error"],
): Promise<AuthLinkResult> {
  const actionLink = data?.properties?.action_link;
  if (error || !actionLink) {
    throw new Error(error?.message ?? "Could not create auth link");
  }

  return {
    type,
    email,
    actionLink,
    userId: data?.user?.id ?? null,
    redirectTo,
  };
}

/**
 * Creates Supabase Auth action links only — pair with your email sender.
 */
export class AuthLinkService {
  constructor(private readonly admin: AdminClient) {}

  async createInviteLink(input: BaseLinkInput): Promise<AuthLinkResult> {
    const email = input.email.trim().toLowerCase();
    const { data, error } = await this.admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        redirectTo: input.redirectTo,
        ...(input.userMetadata ? { data: input.userMetadata } : {}),
      },
    });
    return extractLinkResult("invite", email, input.redirectTo, data, error);
  }

  async createRecoveryLink(input: BaseLinkInput): Promise<AuthLinkResult> {
    const email = input.email.trim().toLowerCase();
    const { data, error } = await this.admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: input.redirectTo },
    });
    return extractLinkResult("recovery", email, input.redirectTo, data, error);
  }

  async createMagicLink(input: BaseLinkInput): Promise<AuthLinkResult> {
    const email = input.email.trim().toLowerCase();
    const { data, error } = await this.admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: input.redirectTo,
        ...(input.userMetadata ? { data: input.userMetadata } : {}),
      },
    });
    return extractLinkResult("magiclink", email, input.redirectTo, data, error);
  }
}

export function createAuthLinkService(admin: AdminClient): AuthLinkService {
  return new AuthLinkService(admin);
}
