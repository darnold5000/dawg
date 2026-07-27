import { redirect } from "next/navigation";

/** Family portal sign-in removed — session tracking will live on schedule/booking flow. */
export default function MyAccountPage() {
  redirect("/schedule");
}
