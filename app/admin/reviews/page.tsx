import { AdminShell } from "@/components/admin/admin-shell";
import { ReviewsAdminPanel } from "@/components/admin/reviews-admin-panel";
import { requireAdmin } from "@/lib/auth";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import type { Review } from "@/lib/types/database";

export default async function AdminReviewsPage() {
  const profile = await requireAdmin();
  let reviews: Review[] = [];

  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from(DAWG_TABLES.reviews)
        .select("*")
        .order("display_order");
      reviews = (data as Review[]) ?? [];
    } catch {
      reviews = [];
    }
  }

  return (
    <AdminShell profile={profile}>
      <div className="space-y-8">
        <div>
          <h2 className="font-heading text-3xl tracking-wide">Reviews</h2>
          <p className="text-sm text-muted-foreground">
            Only reviews marked &quot;Publish on website&quot; appear on the home
            page. Deleting a review removes it permanently.
          </p>
        </div>
        <ReviewsAdminPanel reviews={reviews} />
      </div>
    </AdminShell>
  );
}
