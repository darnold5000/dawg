import { redirect } from "next/navigation";

export default function LegacyNewTemplatePage() {
  redirect("/admin/classes/new");
}
