"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
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
    toast.success("Template duplicated");
    router.refresh();
  }

  async function archive() {
    if (
      !window.confirm(
        `Archive "${templateName}"? Scheduled sessions stay on the calendar.`,
      )
    ) {
      return;
    }
    const res = await fetch(`/api/admin/session-templates/${templateId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Archive failed");
      return;
    }
    toast.success("Template archived");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {isActive ? (
        <Button asChild size="sm" className="bg-brand text-brand-foreground">
          <Link href={`/admin/session-templates/${templateId}/calendar`}>
            Add to calendar
          </Link>
        </Button>
      ) : null}
      <Button asChild variant="outline" size="sm">
        <Link href={`/admin/session-templates/${templateId}/edit`}>Edit</Link>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={duplicate}>
        Duplicate
      </Button>
      {isActive ? (
        <Button type="button" variant="outline" size="sm" onClick={archive}>
          Archive
        </Button>
      ) : null}
    </div>
  );
}
