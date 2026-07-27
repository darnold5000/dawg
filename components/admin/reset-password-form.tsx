"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  dawgAuthHashErrorMessages,
  dawgInvalidRecoveryLinkMessage,
  establishSessionFromAuthRedirect,
} from "@/lib/auth/auth-callback";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!isSupabaseConfigured()) {
        if (!cancelled) {
          setSessionError("Password reset is not configured.");
          setChecking(false);
        }
        return;
      }

      const supabase = createClient();
      const result = await establishSessionFromAuthRedirect(supabase, {
        hashErrorMessages: dawgAuthHashErrorMessages,
        invalidLinkMessage: dawgInvalidRecoveryLinkMessage,
        logTag: "dawg-reset-password",
      });

      if (cancelled) return;

      if (!result.ok) {
        setSessionError(result.message);
        setChecking(false);
        return;
      }

      setReady(true);
      setChecking(false);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured()) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password updated. Sign in with your new password.");
      await supabase.auth.signOut();
      router.push("/admin/login");
      router.refresh();
    } catch {
      toast.error("Could not update password.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <p className="text-sm text-muted-foreground">Validating your reset link…</p>
    );
  }

  if (sessionError) {
    return (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p className="text-foreground" role="alert">
          {sessionError}
        </p>
        <Link
          href="/admin/forgot-password"
          className="inline-block text-brand underline-offset-4 hover:underline"
        >
          Request a new reset link
        </Link>
        <Link
          href="/admin/login"
          className="block text-brand underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  if (!ready) {
    return null;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Saving…" : "Set password"}
      </Button>
    </form>
  );
}
