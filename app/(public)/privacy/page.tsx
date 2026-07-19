import { createMetadata } from "@/lib/seo";
import { SITE } from "@/lib/constants";
import { privacyPolicyDoc } from "@/lib/agreements";

export const metadata = createMetadata({
  title: "Privacy Policy",
  description: `Privacy policy for ${SITE.name}.`,
  path: "/privacy",
});

export default function PrivacyPage() {
  const privacy = privacyPolicyDoc();

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-heading text-4xl tracking-wide">{privacy.title}</h1>
      <div className="prose prose-neutral mt-6 max-w-none space-y-4 text-sm leading-relaxed text-muted-foreground">
        {privacy.paragraphs.map((p) => (
          <p key={p.slice(0, 40)}>{p}</p>
        ))}
      </div>
    </div>
  );
}
