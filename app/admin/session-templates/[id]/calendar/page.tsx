import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export default async function LegacyCalendarTemplatePage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/admin/classes/${id}/calendar`);
}
