"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clearLastFamilyLoginEmail,
  loadLastFamilyLoginEmail,
  saveLastFamilyLoginEmail,
} from "@/lib/returning-family";

export function FamilyLoginForm({
  returnTo = "/my",
  initialEmail = "",
}: {
  returnTo?: string;
  initialEmail?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [staffBlocked, setStaffBlocked] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
      saveLastFamilyLoginEmail(initialEmail);
      return;
    }
    const last = loadLastFamilyLoginEmail();
    if (last) setEmail(last);
  }, [initialEmail]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStaffBlocked(false);
    try {
      const res = await fetch("/api/my/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, returnTo }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "STAFF_EMAIL") {
          setStaffBlocked(true);
          return;
        }
        toast.error(data.error ?? "Could not send link");
        return;
      }
      setSent(true);
      saveLastFamilyLoginEmail(email);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (staffBlocked) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-6 text-sm">
        <p className="font-medium">Staff account detected</p>
        <p className="mt-2 text-muted-foreground">
          <strong>{email}</strong> is registered for staff access, not the
          family portal. Use Staff login to manage DAWG.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href="/admin/login">Go to Staff login</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setStaffBlocked(false);
              clearLastFamilyLoginEmail();
              setEmail("");
            }}
          >
            Use a different email
          </Button>
        </div>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm">
        <p className="font-medium">Check your email</p>
        <p className="mt-2 text-muted-foreground">
          If we can help with <strong>{email}</strong>, you&apos;ll receive a
          secure link shortly. It may be for intake, signing in, or setting up
          access to your existing family account. The link expires in 24 hours.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => {
            setSent(false);
            clearLastFamilyLoginEmail();
            setEmail("");
          }}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <p className="text-sm text-muted-foreground">
        We&apos;ll email a one-time link to get your family set up or open your
        account on this device.
      </p>
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
        {submitting ? "Sending…" : "Email me a secure link"}
      </Button>
    </form>
  );
}
