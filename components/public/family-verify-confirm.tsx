"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { FamilyTokenPurpose } from "@/lib/family-login";

const purposeCopy: Record<
  FamilyTokenPurpose,
  { title: string; body: string; button: string }
> = {
  login: {
    title: "Sign in to your account",
    body: "Tap continue to open your athletes, packages, and bookings.",
    button: "Continue to my account",
  },
  claim: {
    title: "Create your online account",
    body: "Tap continue to finish setting up your DAWG online account.",
    button: "Continue",
  },
  intake: {
    title: "Complete athlete intake",
    body: "Tap continue to open the intake form for your athlete.",
    button: "Continue to intake",
  },
};

export function FamilyVerifyConfirm({
  token,
  returnTo,
  purpose,
}: {
  token: string;
  returnTo: string;
  purpose: FamilyTokenPurpose;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const copy = purposeCopy[purpose];

  async function onContinue() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/my/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, returnTo }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not sign in");
        return;
      }
      router.push(data.redirect ?? "/my");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      <h1 className="font-heading text-3xl tracking-wide">{copy.title}</h1>
      <p className="mt-3 text-muted-foreground">{copy.body}</p>
      <Button
        type="button"
        className="mt-8 bg-brand text-brand-foreground hover:bg-brand/90"
        disabled={submitting}
        onClick={() => void onContinue()}
      >
        {submitting ? "Signing in…" : copy.button}
      </Button>
      <p className="mt-6 text-xs text-muted-foreground">
        This link expires in 24 hours and can only be used once.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        <Link href="/my/login" className="underline underline-offset-2">
          Request a new link
        </Link>
      </p>
    </div>
  );
}
