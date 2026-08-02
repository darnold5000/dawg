"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatScheduleDaySubdate, formatSessionTime } from "@/lib/format";

export type ScheduleClassOption = {
  id: string;
  default_start_time: string;
  default_duration_minutes: number;
  program: { name: string; calendar_color: string | null } | null;
  trainer: { name: string } | null;
};

export function AddClassToDayPicker({
  dateKey,
  templates,
  alwaysVisible = false,
}: {
  dateKey: string;
  templates: ScheduleClassOption[];
  alwaysVisible?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function schedule(templateId: string) {
    setLoadingId(templateId);
    try {
      const res = await fetch(
        `/api/admin/session-templates/${templateId}/schedule`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "once",
            session_date: dateKey,
            recurrence: "none",
            skip_duplicates: true,
            status: "published",
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not add class");
        return;
      }
      toast.success("Class added to calendar");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Could not add class");
    } finally {
      setLoadingId(null);
    }
  }

  const visibilityClass = alwaysVisible
    ? "opacity-100"
    : "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100";

  if (templates.length === 0) {
    return (
      <Button
        asChild
        size="sm"
        variant="ghost"
        className={`mt-2 h-7 w-full justify-start px-1 text-xs text-brand ${visibilityClass}`}
      >
        <Link href="/admin/classes/new">
          <Plus className="mr-1 size-3" />
          Create class
        </Link>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={`mt-2 flex h-7 w-full items-center justify-start gap-1 rounded-md px-1 text-xs font-medium text-brand transition-opacity hover:bg-brand/10 ${visibilityClass}`}
      >
        <Plus className="size-3" />
        Add class
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <PopoverHeader className="border-b border-border px-3 py-2">
          <PopoverTitle>Add class</PopoverTitle>
          <PopoverDescription>
            {formatScheduleDaySubdate(dateKey)}
          </PopoverDescription>
        </PopoverHeader>
        <ul className="max-h-64 overflow-y-auto p-1">
          {templates.map((template) => {
            const color = template.program?.calendar_color;
            const busy = loadingId === template.id;
            return (
              <li key={template.id}>
                <button
                  type="button"
                  disabled={busy || loadingId !== null}
                  className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                  onClick={() => schedule(template.id)}
                >
                  {color ? (
                    <span
                      className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                  ) : (
                    <span className="mt-1.5 inline-block h-2 w-2 shrink-0" />
                  )}
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {template.program?.name?.trim() || "Class"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatSessionTime(template.default_start_time)} ·{" "}
                      {template.default_duration_minutes} min
                      {template.trainer?.name
                        ? ` · ${template.trainer.name}`
                        : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-border p-2">
          <Button asChild size="sm" variant="ghost" className="w-full justify-start">
            <Link
              href={`/admin/sessions/add`}
              onClick={() => setOpen(false)}
            >
              More options…
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
