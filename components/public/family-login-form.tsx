"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginPath, registerPath } from "@/lib/family-auth-url";

export function FamilyLoginForm({
  returnTo = "/schedule",
}: {
  returnTo?: string;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/my/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, returnTo }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not send sign-in link");
        return;
      }
      setSent(true);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm">
        <p className="font-medium">Check your email</p>
        <p className="mt-2 text-muted-foreground">
          If we have an account for <strong>{email}</strong>, you will receive a
          sign-in link shortly. It expires in 30 minutes.
        </p>
        <p className="mt-3 text-muted-foreground">
          New family?{" "}
          <Link
            href={registerPath(returnTo)}
            className="font-medium text-foreground underline underline-offset-2"
          >
            Create an account
          </Link>
          .
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => setSent(false)}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="space-y-1.5">
          <Label htmlFor="myEmail">Email address</Label>
          <Input
            id="myEmail"
            type="email"
            required
            autoComplete="email"
            placeholder="parent@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
        >
          {submitting ? "Sending…" : "Email me a sign-in link"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        New to DAWG?{" "}
        <Link
          href={registerPath(returnTo)}
          className="font-medium text-foreground underline underline-offset-2"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
