"use client";

import {
  hhmmTo12Parts,
  parts12ToHHMM,
  timeToHHMM,
  type Meridiem,
} from "@/lib/session-time";

const HOUR_OPTIONS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i);

type AdminTimeSelectProps = {
  id?: string;
  value: string;
  onChange: (hhmm: string) => void;
  required?: boolean;
  className?: string;
};

export function AdminTimeSelect({
  id,
  value,
  onChange,
  required,
  className,
}: AdminTimeSelectProps) {
  const hhmm = timeToHHMM(value);
  const { hour12, minute, meridiem } = hhmmTo12Parts(hhmm);

  function emit(h: number, m: number, period: Meridiem) {
    onChange(parts12ToHHMM(h, m, period));
  }

  return (
    <div
      id={id}
      className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}
    >
      <select
        aria-label="Hour"
        className="form-select w-[4.5rem]"
        required={required}
        value={hour12}
        onChange={(e) =>
          emit(Number(e.target.value), minute, meridiem)
        }
      >
        {HOUR_OPTIONS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-muted-foreground">:</span>
      <select
        aria-label="Minute"
        className="form-select w-[4.5rem]"
        required={required}
        value={minute}
        onChange={(e) =>
          emit(hour12, Number(e.target.value), meridiem)
        }
      >
        {MINUTE_OPTIONS.map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, "0")}
          </option>
        ))}
      </select>
      <div
        className="flex flex-col gap-0.5"
        role="group"
        aria-label="AM or PM"
      >
        {(["AM", "PM"] as const).map((period) => (
          <button
            key={period}
            type="button"
            className={`min-w-[2.75rem] rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
              meridiem === period
                ? "border-brand bg-brand text-brand-foreground"
                : "border-input bg-background text-foreground hover:bg-muted"
            }`}
            aria-pressed={meridiem === period}
            onClick={() => emit(hour12, minute, period)}
          >
            {period}
          </button>
        ))}
      </div>
    </div>
  );
}
