import { Star } from "lucide-react";
import type { Review } from "@/lib/types/database";
import { SITE } from "@/lib/constants";

export function HomeReviews({ reviews }: { reviews: Review[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div className="max-w-2xl">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-gold">
          Parent reviews
        </p>
        <h2 className="font-heading text-4xl tracking-wide md:text-5xl">
          100% Recommend
        </h2>
          <p className="mt-3 text-muted-foreground">
            Families recommend DAWGZ for stronger athletes and bigger confidence.
          </p>
      </div>

      {reviews.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="font-medium">Parent reviews will appear here</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow{" "}
            <a
              href={SITE.facebookUrl}
              className="underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              DAWGZ on Facebook
            </a>{" "}
            for family updates, or contact us to share your experience.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <blockquote
              key={review.id}
              className="rounded-xl border border-brand/25 bg-card p-6 shadow-[0_0_40px_rgba(31,92,255,0.12)]"
            >
              <div
                className="mb-3 flex gap-1"
                aria-label={`${review.rating} out of 5 stars`}
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < review.rating
                        ? "fill-gold text-gold"
                        : "text-border"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-foreground">
                “{review.review_text}”
              </p>
              <footer className="mt-4 text-sm">
                <cite className="not-italic font-bold text-gold">
                  {review.reviewer_name}
                </cite>
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

      <a
        href={SITE.facebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-block text-sm font-semibold text-brand underline-offset-2 hover:underline"
      >
        See all reviews on Facebook
      </a>
    </section>
  );
}
