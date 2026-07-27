import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchTrainingStaffProfileForUser } from "@/lib/auth/training-staff";
import { isStaffRole } from "@/lib/roles";
import { getTrainingTenantIdOrNull } from "@/lib/tenant/deployment";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Server-side staff login so the session is written to HTTP cookies the App Router can read.
 * Browser-only signInWithPassword often leaves /admin without a server session.
 */
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return NextResponse.json(
      {
        error:
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      },
      { status: 503 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const pendingCookies: {
    name: string;
    value: string;
    options?: Parameters<typeof cookieStore.set>[2];
  }[] = [];

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          pendingCookies.push({ name, value, options });
        });
      },
    },
  });

  const { data: signIn, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  const userId = signIn.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  const tenantId = getTrainingTenantIdOrNull();
  if (!tenantId) {
    await supabase.auth.signOut();
    const response = NextResponse.json(
      {
        error:
          "TRAINING_TENANT_ID is not set. Add it to .env.local for DAWG on Signal Works Pro.",
        code: "MISSING_TENANT",
      },
      { status: 503 },
    );
    for (const c of pendingCookies) {
      response.cookies.set(c.name, "", { ...c.options, maxAge: 0 });
    }
    return response;
  }

  const staff = await fetchTrainingStaffProfileForUser(userId, {
    accessToken: signIn.session?.access_token,
    userClient: supabase,
  });

  if (!staff || !isStaffRole(staff.role)) {
    await supabase.auth.signOut();
    const response = NextResponse.json(
      {
        error:
          "This account is not set up for DAWG staff access. If the staff row exists in SQL, apply migration 008_training_staff_login_grants.sql on Signal Works Pro, restart the dev server, and try again.",
        code: "NO_STAFF_PROFILE",
        ...(process.env.NODE_ENV === "development"
          ? {
              debug: {
                userId,
                tenantId,
                hasSession: Boolean(signIn.session?.access_token),
                hasServiceKey: Boolean(
                  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
                ),
                role: staff?.role ?? null,
              },
            }
          : {}),
      },
      { status: 403 },
    );
    for (const c of pendingCookies) {
      response.cookies.set(c.name, "", { ...c.options, maxAge: 0 });
    }
    return response;
  }

  const response = NextResponse.json({ ok: true, redirectTo: "/admin" });
  for (const c of pendingCookies) {
    response.cookies.set(c.name, c.value, c.options);
  }
  return response;
}
