import { AdminShell } from "@/components/admin/admin-shell";
import { ReviewCreateForm } from "@/components/admin/review-create-form";
import { Badge } from "@/components/ui/badge";
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
            Unpublished by default. Only approved authentic reviews should go
            live.
          </p>
        </div>
        <ReviewCreateForm />
        <div className="grid gap-3">
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews stored yet.</p>
          ) : (
            reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap gap-2">
                  <Badge variant={review.published ? "default" : "secondary"}>
                    {review.published ? "Published" : "Hidden"}
                  </Badge>
                  {review.featured ? <Badge>Featured</Badge> : null}
                  <Badge variant="outline">{review.rating}/5</Badge>
                </div>
                <p className="mt-2 font-medium">{review.reviewer_name}</p>
                <p className="text-sm text-muted-foreground">
                  {review.review_text}
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </AdminShell>
  );
}
