"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured } from "@/lib/supabase/client";

type AdminLoginFormProps = {
  staffAccessDenied?: boolean;
};

export function AdminLoginForm({ staffAccessDenied }: AdminLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      toast.message("Supabase is not configured", {
        description:
          "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirectTo?: string;
      };

      if (!res.ok) {
        toast.error(body.error ?? "Unable to sign in");
        return;
      }

      const dest =
        body.redirectTo?.startsWith("/") && !body.redirectTo.startsWith("//")
          ? body.redirectTo
          : "/admin";
      window.location.assign(dest);
    } catch {
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {staffAccessDenied ? (
        <p className="text-sm text-muted-foreground">
          Sign in with a DAWG staff account to continue.
        </p>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
      >
        {loading ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm">
        <Link
          href="/admin/forgot-password"
          className="text-brand underline-offset-4 hover:underline"
        >
          Forgot password?
        </Link>
      </p>
      <p className="text-center text-xs text-muted-foreground">
        Invitation-only. Public registration is disabled.
      </p>
    </form>
  );
}
