"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SessionTemplateActions({
  templateId,
  templateName,
  isActive,
}: {
  templateId: string;
  templateName: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function duplicate() {
    const res = await fetch(
      `/api/admin/session-templates/${templateId}/duplicate`,
      { method: "POST" },
    );
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Duplicate failed");
      return;
    }
    toast.success("Class duplicated");
    router.refresh();
  }

  async function archive() {
    if (
      !window.confirm(
        `Archive "${templateName}"? Scheduled sessions stay on the schedule.`,
      )
    ) {
      return;
    }
    const res = await fetch(
      `/api/admin/session-templates/${templateId}/archive`,
      { method: "POST" },
    );
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Archive failed");
      return;
    }
    toast.success("Class archived");
    router.refresh();
  }

  async function onDelete() {
    const warning = `Delete "${templateName}" permanently? Scheduled sessions on the calendar will stay; they will no longer link to this saved class.`;
    if (!window.confirm(warning)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/session-templates/${templateId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not delete class");
        return;
      }
      toast.success("Class deleted");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {isActive ? (
        <>
          <Button asChild size="sm" className="bg-brand text-brand-foreground">
            <Link
              href={`/admin/classes/${templateId}/calendar?preset=weekdays`}
            >
              Schedule M–F
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/classes/${templateId}/calendar?preset=once`}>
              Schedule once
            </Link>
          </Button>
        </>
      ) : null}
      <Button asChild variant="outline" size="sm">
        <Link href={`/admin/classes/${templateId}/edit`}>Edit</Link>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={duplicate}>
        Duplicate
      </Button>
      {isActive ? (
        <Button type="button" variant="outline" size="sm" onClick={archive}>
          Archive
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
        disabled={deleting}
        onClick={onDelete}
      >
        <Trash2 className="mr-1.5 size-3.5" />
        {deleting ? "Deleting…" : "Delete"}
      </Button>
    </div>
  );
}
