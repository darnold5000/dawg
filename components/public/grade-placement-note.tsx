import { GRADE_PLACEMENT_NOTE } from "@/lib/program-grades";

export function GradePlacementNote({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-sm leading-relaxed text-muted-foreground"}>
      {GRADE_PLACEMENT_NOTE}
    </p>
  );
}
