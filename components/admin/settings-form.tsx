"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BusinessSettings } from "@/lib/types/database";

export function SettingsForm({ settings }: { settings: BusinessSettings }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    business_name: settings.business_name,
    phone: settings.phone ?? "",
    email: settings.email ?? "",
    address_line_1: settings.address_line_1 ?? "",
    address_line_2: settings.address_line_2 ?? "",
    city: settings.city ?? "",
    state: settings.state ?? "",
    postal_code: settings.postal_code ?? "",
    facebook_url: settings.facebook_url ?? "",
    business_hours: settings.business_hours ?? "",
    homepage_announcement: settings.homepage_announcement ?? "",
    map_embed_url: settings.map_embed_url ?? "",
    cancellation_policy: settings.cancellation_policy ?? "",
    booking_policy: settings.booking_policy ?? "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: settings.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save settings");
        return;
      }
      toast.success("Settings saved");
      router.refresh();
    } catch {
      toast.error("Could not save settings");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {(
        [
          ["business_name", "Business name"],
          ["phone", "Phone"],
          ["email", "Email"],
          ["address_line_1", "Address line 1"],
          ["address_line_2", "Address line 2"],
          ["city", "City"],
          ["state", "State"],
          ["postal_code", "Postal code"],
          ["facebook_url", "Facebook URL"],
        ] as const
      ).map(([key, label]) => (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={key}>{label}</Label>
          <Input
            id={key}
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        </div>
      ))}
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="business_hours">Business hours</Label>
        <Textarea
          id="business_hours"
          value={form.business_hours}
          onChange={(e) => setForm({ ...form, business_hours: e.target.value })}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="homepage_announcement">Homepage announcement</Label>
        <Textarea
          id="homepage_announcement"
          value={form.homepage_announcement}
          onChange={(e) =>
            setForm({ ...form, homepage_announcement: e.target.value })
          }
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="map_embed_url">Map embed URL</Label>
        <Input
          id="map_embed_url"
          value={form.map_embed_url}
          onChange={(e) => setForm({ ...form, map_embed_url: e.target.value })}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="cancellation_policy">Cancellation policy</Label>
        <Textarea
          id="cancellation_policy"
          value={form.cancellation_policy}
          onChange={(e) =>
            setForm({ ...form, cancellation_policy: e.target.value })
          }
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="booking_policy">Booking policy</Label>
        <Textarea
          id="booking_policy"
          value={form.booking_policy}
          onChange={(e) => setForm({ ...form, booking_policy: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2">
        <Button
          type="submit"
          disabled={loading}
          className="bg-brand text-brand-foreground hover:bg-brand/90"
        >
          {loading ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
