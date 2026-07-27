import Link from "next/link";
import { CLIENT_FAQ_ITEMS } from "@/lib/help/client-faq";

export function AboutFaq() {
  return (
    <section
      id="help"
      className="border-t border-border bg-surface/40 py-14 md:py-20"
      aria-labelledby="about-faq-heading"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand">
          Help
        </p>
        <h2
          id="about-faq-heading"
          className="mt-2 font-heading text-3xl tracking-wide md:text-4xl"
        >
          Frequently asked questions
        </h2>
        <p className="mt-3 text-muted-foreground">
          Quick answers for booking, payments, intake, and packages. For
          cancellation and waiver language, see our{" "}
          <Link
            href="/booking-policy"
            className="font-medium text-foreground underline underline-offset-2 hover:text-brand"
          >
            booking policy
          </Link>
          .
        </p>

        <ul className="mt-8 space-y-3">
          {CLIENT_FAQ_ITEMS.map((item) => (
            <li key={item.id}>
              <details className="group rounded-xl border border-border bg-card px-4 py-3 shadow-sm open:shadow-md">
                <summary className="cursor-pointer list-none font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start justify-between gap-3">
                    <span>{item.question}</span>
                    <span
                      className="mt-0.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      aria-hidden
                    >
                      ▾
                    </span>
                  </span>
                </summary>
                <div className="mt-3 space-y-3 border-t border-border pt-3 text-sm leading-relaxed text-muted-foreground">
                  {item.answerParagraphs.map((p) => (
                    <p key={p.slice(0, 48)}>{p}</p>
                  ))}
                  {item.link ? (
                    <p>
                      <Link
                        href={item.link.href}
                        className="font-medium text-foreground underline underline-offset-2 hover:text-brand"
                      >
                        {item.link.label}
                      </Link>
                    </p>
                  ) : null}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
