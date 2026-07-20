"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateClientForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    parentFirstName: "",
    parentLastName: "",
    parentEmail: "",
    parentPhone: "",
    athleteFirstName: "",
    athleteLastName: "",
    athleteDob: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not add client");
        return;
      }
      toast.success("Client added");
      setForm({
        parentFirstName: "",
        parentLastName: "",
        parentEmail: "",
        parentPhone: "",
        athleteFirstName: "",
        athleteLastName: "",
        athleteDob: "",
      });
      router.refresh();
      if (data.parentId) {
        router.push(`/admin/clients/${data.parentId}`);
      }
    } catch {
      toast.error("Could not add client");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-border bg-card p-5"
    >
      <h3 className="font-heading text-xl tracking-wide">Add client</h3>
      <p className="text-xs text-muted-foreground">
        Create a parent profile manually. Athlete details are optional.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="parentFirstName">Parent first name</Label>
          <Input
            id="parentFirstName"
            required
            value={form.parentFirstName}
            onChange={(e) =>
              setForm({ ...form, parentFirstName: e.target.value })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="parentLastName">Parent last name</Label>
          <Input
            id="parentLastName"
            required
            value={form.parentLastName}
            onChange={(e) =>
              setForm({ ...form, parentLastName: e.target.value })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="parentEmail">Email</Label>
          <Input
            id="parentEmail"
            type="email"
            required
            value={form.parentEmail}
            onChange={(e) => setForm({ ...form, parentEmail: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="parentPhone">Phone</Label>
          <Input
            id="parentPhone"
            type="tel"
            required
            value={form.parentPhone}
            onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
          />
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <p className="mb-3 text-sm font-medium">Athlete (optional)</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="athleteFirstName">First name</Label>
            <Input
              id="athleteFirstName"
              value={form.athleteFirstName}
              onChange={(e) =>
                setForm({ ...form, athleteFirstName: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="athleteLastName">Last name</Label>
            <Input
              id="athleteLastName"
              value={form.athleteLastName}
              onChange={(e) =>
                setForm({ ...form, athleteLastName: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="athleteDob">Date of birth</Label>
            <Input
              id="athleteDob"
              type="date"
              value={form.athleteDob}
              onChange={(e) => setForm({ ...form, athleteDob: e.target.value })}
            />
          </div>
        </div>
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="bg-brand text-brand-foreground hover:bg-brand/90"
      >
        {loading ? "Saving…" : "Add client"}
      </Button>
    </form>
  );
}
