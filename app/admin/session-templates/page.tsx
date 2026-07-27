import { redirect } from "next/navigation";

export default function LegacySessionTemplatesPage() {
  redirect("/admin/classes");
}
