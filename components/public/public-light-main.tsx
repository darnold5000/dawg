"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LIGHT_PATH_PREFIXES = [
  "/my/intake",
  "/packages",
];

function usesLightSurface(pathname: string): boolean {
  return LIGHT_PATH_PREFIXES.some(
    (prefix) =>
      pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix),
  );
}

export function PublicLightMain({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const light = usesLightSurface(pathname);

  return (
    <main
      id="main-content"
      className={cn("flex-1", light && "public-light", className)}
    >
      {children}
    </main>
  );
}
