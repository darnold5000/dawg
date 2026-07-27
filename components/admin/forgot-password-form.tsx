"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminPasswordResetRedirectUrl } from "@/lib/auth/admin-password-reset";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok && res.status === 400) {
        toast.error(data.error ?? "Enter a valid email address");
        setLoading(false);
        return;
      }

      setSent(true);
      toast.success("If that email is on file, we sent a reset link.");
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          If an account exists for that email, we sent a DAWG-branded link to set
          a new password. The link opens on this site (
          <span className="font-mono text-xs">{adminPasswordResetRedirectUrl()}</span>
          ).
        </p>
        <Link
          href="/admin/login"
          className="inline-block text-brand underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="reset-email">Staff email</Label>
        <Input
          id="reset-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-center text-sm">
        <Link
          href="/admin/login"
          className="text-brand underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
