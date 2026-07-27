"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StaffMemberRow } from "@/lib/admin-staff";
import type { UserRole } from "@/lib/types/database";
import { cn } from "@/lib/utils";

function roleLabel(role: UserRole): string {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "developer") return "Developer";
  return "Trainer";
}

type StaffSettingsPanelProps = {
  initialStaff: StaffMemberRow[];
  currentUserId: string;
};

export function StaffSettingsPanel({
  initialStaff,
  currentUserId,
}: StaffSettingsPanelProps) {
  const router = useRouter();
  const [staff, setStaff] = useState(initialStaff);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editMember, setEditMember] = useState<StaffMemberRow | null>(null);
  const [revokeMember, setRevokeMember] = useState<StaffMemberRow | null>(null);
  const [loading, setLoading] = useState(false);

  const [inviteForm, setInviteForm] = useState({
    email: "",
    fullName: "",
    phone: "",
    role: "admin" as "admin" | "trainer",
  });

  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    role: "admin" as "admin" | "trainer",
  });

  const activeStaff = useMemo(
    () => staff.filter((row) => row.active),
    [staff],
  );

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteForm.email,
          fullName: inviteForm.fullName,
          role: inviteForm.role,
          phone: inviteForm.phone || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not send invite");
        return;
      }
      setStaff((current) => {
        const without = current.filter(
          (row) => row.user_id !== data.staff.user_id,
        );
        return [...without, data.staff as StaffMemberRow].sort((a, b) =>
          a.full_name?.localeCompare(b.full_name ?? "") ?? 0,
        );
      });
      toast.success(
        data.delivery === "supabase_invite"
          ? "Invite sent via Supabase email"
          : "Invite sent",
      );
      setInviteForm({ email: "", fullName: "", phone: "", role: "admin" });
      setInviteOpen(false);
      router.refresh();
    } catch {
      toast.error("Could not send invite");
    } finally {
      setLoading(false);
    }
  }

  function openEdit(member: StaffMemberRow) {
    setEditMember(member);
    setEditForm({
      fullName: member.full_name ?? "",
      phone: member.phone ?? "",
      role: member.role === "trainer" ? "trainer" : "admin",
    });
  }

  async function submitEdit() {
    if (!editMember) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/staff/${editMember.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editForm.fullName,
          phone: editForm.phone || null,
          role: editForm.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save");
        return;
      }
      setStaff((current) =>
        current.map((row) =>
          row.user_id === editMember.user_id ? (data.staff as StaffMemberRow) : row,
        ),
      );
      toast.success("Staff updated");
      setEditMember(null);
      router.refresh();
    } catch {
      toast.error("Could not save");
    } finally {
      setLoading(false);
    }
  }

  async function confirmRevoke() {
    if (!revokeMember) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/staff/${revokeMember.user_id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not revoke access");
        return;
      }
      setStaff((current) =>
        current.map((row) =>
          row.user_id === revokeMember.user_id
            ? { ...row, active: false }
            : row,
        ),
      );
      toast.success("Staff access revoked");
      setRevokeMember(null);
      router.refresh();
    } catch {
      toast.error("Could not revoke access");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-xl tracking-wide">Staff access</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite admins and trainers. Supabase emails new users; existing
            accounts receive a DAWG invite link.
          </p>
        </div>
        <Button
          type="button"
          className="bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={() => setInviteOpen(true)}
        >
          Add staff
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeStaff.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No staff yet. Add your first team member above.
                </td>
              </tr>
            ) : (
              activeStaff.map((member) => {
                const isOwner = member.role === "owner";
                const isSelf = member.user_id === currentUserId;
                return (
                  <tr
                    key={member.user_id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">
                      {member.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {member.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                            isOwner || member.role === "developer"
                              ? "bg-brand/15 text-brand"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                        {roleLabel(member.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9"
                          disabled={isOwner}
                          aria-label={`Edit ${member.full_name ?? "staff"}`}
                          onClick={() => openEdit(member)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9 text-muted-foreground hover:text-destructive"
                          disabled={isOwner || isSelf}
                          aria-label={`Revoke ${member.full_name ?? "staff"}`}
                          onClick={() => setRevokeMember(member)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add staff member</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitInvite} className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                required
                value={inviteForm.email}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-name">Full name</Label>
              <Input
                id="staff-name"
                required
                value={inviteForm.fullName}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, fullName: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-phone">Phone (optional)</Label>
              <Input
                id="staff-phone"
                value={inviteForm.phone}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value) => {
                  if (value === "admin" || value === "trainer") {
                    setInviteForm({ ...inviteForm, role: value });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="trainer">Trainer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Sending…" : "Send invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editMember)} onOpenChange={() => setEditMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit staff</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={editMember?.email ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Full name</Label>
              <Input
                id="edit-name"
                value={editForm.fullName}
                onChange={(e) =>
                  setEditForm({ ...editForm, fullName: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => {
                  if (value === "admin" || value === "trainer") {
                    setEditForm({ ...editForm, role: value });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="trainer">Trainer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={submitEdit} disabled={loading}>
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(revokeMember)} onOpenChange={() => setRevokeMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke staff access?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {revokeMember?.full_name ?? revokeMember?.email} will no longer be
            able to sign in to the admin portal. You can invite them again later.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRevokeMember(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={loading}
              onClick={confirmRevoke}
            >
              {loading ? "Revoking…" : "Revoke access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
