"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  ContactRound,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  Dumbbell,
  Star,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";
import { isAdminRole } from "@/lib/roles";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/sessions", label: "Sessions", icon: CalendarDays },
  { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/admin/clients", label: "Clients", icon: ContactRound },
  { href: "/admin/availability", label: "Availability", icon: Clock },
  { href: "/admin/programs", label: "Programs", icon: Dumbbell, adminOnly: true },
  { href: "/admin/trainers", label: "Trainers", icon: Users, adminOnly: true },
  { href: "/admin/reviews", label: "Reviews", icon: Star, adminOnly: true },
  { href: "/admin/settings", label: "Settings", icon: Settings, adminOnly: true },
];

export function AdminShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: Profile;
}) {
  const pathname = usePathname();

  async function handleLogout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore when supabase not configured
    }
    window.location.href = "/admin/login";
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">
              Staff
            </p>
            <h1 className="font-heading text-xl tracking-wide text-foreground">
              DAWG Admin
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {profile.full_name ?? "Staff"}
              <span className="text-border"> · </span>
              <span className="capitalize">{profile.role}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              className="border-border bg-white shadow-sm"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
        <nav
          className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-4 sm:px-6"
          aria-label="Admin"
        >
          {NAV.filter(
            (item) => !item.adminOnly || isAdminRole(profile.role),
          ).map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-brand text-brand-foreground shadow-sm"
                    : "border border-border bg-white text-foreground hover:border-brand/30 hover:bg-slate-50",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0 opacity-90" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
