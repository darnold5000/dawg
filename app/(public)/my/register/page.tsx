import { redirect } from "next/navigation";
import { sanitizeReturnPath } from "@/lib/family-auth";

export default async function FamilyRegisterRedirect({
  searchParams,
}: {
  searchParams: Promise<{ return?: string }>;
}) {
  const q = await searchParams;
  const returnTo = sanitizeReturnPath(q.return, "/schedule");
  redirect(`/my/intake?return=${encodeURIComponent(returnTo)}`);
}
