"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { ClientFamily } from "@/lib/admin-clients";
import { billingTableClassNames, formatDate } from "@/lib/billing/format";

export function ClientsTable({ families }: { families: ClientFamily[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return families;
    return families.filter((family) => {
      const parentBlob = [
        family.parent.first_name,
        family.parent.last_name,
        family.parent.email,
        family.parent.phone,
      ]
        .join(" ")
        .toLowerCase();
      if (parentBlob.includes(q)) return true;
      return family.athletes.some((a) =>
        [
          a.first_name,
          a.last_name,
          a.primary_sport ?? "",
          a.experience_level ?? "",
          a.age?.toString() ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    });
  }, [families, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search parents, athletes, sport, phone…"
          className="max-w-md"
        />
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {families.length} families
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
          <p className="font-medium">
            {families.length === 0 ? "No clients yet" : "No matching clients"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {families.length === 0
              ? "Add a client above, or they will appear after a booking or package purchase."
              : "Try a different search."}
          </p>
        </div>
      ) : (
        <div className={`${billingTableClassNames.tableWrap} -mx-1`}>
          <table className={billingTableClassNames.table}>
            <thead className={billingTableClassNames.tableHead}>
              <tr>
                <th className="px-3 py-3 sm:px-4">Parent</th>
                <th className="px-3 py-3 sm:px-4">Contact</th>
                <th className="px-3 py-3 sm:px-4">Athletes</th>
                <th className="hidden px-4 py-3 md:table-cell">Package</th>
                <th className="hidden px-4 py-3 md:table-cell">Sessions left</th>
                <th className="hidden px-4 py-3 lg:table-cell">Last session</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((family) => {
                const athleteLabel =
                  family.athletes.length === 0
                    ? "—"
                    : family.athletes
                        .map((a) => {
                          const age =
                            a.age != null ? ` (${a.age})` : "";
                          return `${a.first_name} ${a.last_name}${age}`;
                        })
                        .join(", ");
                return (
                  <tr
                    key={family.parent.id}
                    className={billingTableClassNames.tableRow}
                  >
                    <td className="px-3 py-3 font-medium sm:px-4">
                      <Link
                        href={`/admin/clients/${family.parent.id}`}
                        className="underline underline-offset-2"
                      >
                        {family.parent.first_name} {family.parent.last_name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-sm text-muted-foreground sm:px-4">
                      <div className="max-w-[14rem] truncate sm:max-w-none">
                        {family.parent.email}
                      </div>
                      <div>{family.parent.phone || "—"}</div>
                    </td>
                    <td className="max-w-[12rem] px-3 py-3 text-sm sm:max-w-md sm:px-4">
                      <span className="line-clamp-2">{athleteLabel}</span>
                      {family.athletes.some((a) => a.primary_sport) ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {[
                            ...new Set(
                              family.athletes
                                .map((a) => a.primary_sport)
                                .filter(Boolean),
                            ),
                          ].join(" · ")}
                        </span>
                      ) : null}
                    </td>
                    <td className="hidden px-4 py-3 text-sm md:table-cell">
                      {family.packageSummary ?? "—"}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {family.sessionsRemaining > 0
                        ? family.sessionsRemaining
                        : "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
                      {family.lastSessionDate
                        ? formatDate(family.lastSessionDate)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
