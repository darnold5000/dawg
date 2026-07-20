import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { verifyFamilyLoginToken } from "@/lib/family-login";
import {
  consumeAuthReturnCookie,
  intakePath,
  sanitizeReturnPath,
} from "@/lib/family-auth";
import { parentHasAnyIntake } from "@/lib/intake";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Signing in",
  description: "Verify your DAWG secure link.",
  path: "/my/verify",
});

export default async function MyVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; return?: string }>;
}) {
  const { token, return: returnParam } = await searchParams;

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

  const result = await verifyFamilyLoginToken(token);
  if (!result.ok) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="font-heading text-3xl tracking-wide">Link expired</h1>
        <p className="mt-3 text-muted-foreground">{result.error}</p>
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

  if (result.purpose === "intake") {
    redirect(intakePath(returnTo));
  }

  const hasIntake = await parentHasAnyIntake(result.parentId);
  if (!hasIntake) {
    redirect(intakePath(returnTo));
  }

  redirect(returnTo);
}
