import { Star } from "lucide-react";
import type { Review } from "@/lib/types/database";
import { SITE } from "@/lib/constants";

export function HomeReviews({ reviews }: { reviews: Review[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div className="max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand">
          Reviews
        </p>
        <h2 className="font-heading text-4xl tracking-wide md:text-5xl">
          What Parents Are Saying
        </h2>
      </div>

      {reviews.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            Authentic parent reviews will appear here once approved by DAWG.
          </p>
          <a
            href={SITE.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-medium text-brand underline-offset-2 hover:underline"
          >
            See reviews on Facebook
          </a>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <blockquote
              key={review.id}
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="mb-3 flex gap-1" aria-label={`${review.rating} out of 5 stars`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < review.rating
                        ? "fill-brand text-brand"
                        : "text-border"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-foreground">
                “{review.review_text}”
              </p>
              <footer className="mt-4 text-sm">
                <cite className="not-italic font-semibold">{review.reviewer_name}</cite>
                {review.reviewer_description ? (
                  <p className="text-muted-foreground">
                    {review.reviewer_description}
                  </p>
                ) : null}
              </footer>
            </blockquote>
          ))}
        </div>
      )}
    </section>
  );
}
