import Link from "next/link";
import { FamilyVerifyConfirm } from "@/components/public/family-verify-confirm";
import { Button } from "@/components/ui/button";
import {
  consumeAuthReturnCookie,
  sanitizeReturnPath,
} from "@/lib/family-auth";
import {
  normalizeMagicLinkToken,
  peekFamilyLoginToken,
} from "@/lib/family-login";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Signing in",
  description: "Verify your DAWG secure link.",
  path: "/my/verify",
});

function verifyErrorTitle(code?: string): string {
  switch (code) {
    case "EXPIRED":
      return "Link expired";
    case "USED":
      return "Link already used";
    case "INVALID":
    case "INVALID_TOKEN":
      return "Invalid link";
    default:
      return "Could not sign in";
  }
}

export default async function MyVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; return?: string }>;
}) {
  const { token: rawToken, return: returnParam } = await searchParams;
  const token = rawToken ? normalizeMagicLinkToken(rawToken) : "";

  if (!token) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="font-heading text-3xl tracking-wide">Invalid link</h1>
        <p className="mt-3 text-muted-foreground">
          This link is missing or incomplete.
        </p>
        <Button asChild className="mt-6 bg-brand text-brand-foreground hover:bg-brand/90">
          <Link href="/my/login">Request a new link</Link>
        </Button>
      </div>
    );
  }

  const peek = await peekFamilyLoginToken(token);
  if (!peek.ok) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="font-heading text-3xl tracking-wide">
          {verifyErrorTitle(peek.code)}
        </h1>
        <p className="mt-3 text-muted-foreground">{peek.error}</p>
        <Button asChild className="mt-6 bg-brand text-brand-foreground hover:bg-brand/90">
          <Link href="/my/login">Request a new link</Link>
        </Button>
      </div>
    );
  }

  const returnTo = sanitizeReturnPath(
    returnParam ?? (await consumeAuthReturnCookie("/schedule")),
    "/schedule",
  );

  return (
    <FamilyVerifyConfirm
      token={token}
      returnTo={returnTo}
      purpose={peek.purpose}
    />
  );
}
