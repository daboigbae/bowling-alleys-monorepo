import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverApiRequest } from "@/lib/api-client";
import { hubToPageProps } from "@/lib/firestore";
import CityHubPage from "@/components/CityHubPage";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bowlingalleys.io";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  try {
    const hub = await serverApiRequest(`/api/hubs/${params.slug}`);
    if (!hub) return {};
    const city = hub.city ?? hub.title?.replace(/best bowling (in )?/i, "").trim();
    const title = `Best Bowling Alleys in ${city} | BowlingAlleys.io`;
    const description =
      hub.description ??
      hub.subtitle ??
      `Find the best bowling alleys in ${city}. Compare prices, hours, and reviews. Plan your bowling night with BowlingAlleys.io.`;
    const canonicalUrl = `${siteUrl}/${params.slug}`;
    return {
      title,
      description,
      openGraph: {
        type: "website",
        title,
        description,
        url: canonicalUrl,
        siteName: "BowlingAlleys.io",
        ...(hub.heroOgImageUrl && !hub.heroOgImageUrl.startsWith("data:")
          ? { images: [{ url: hub.heroOgImageUrl, width: 1200, height: 630, alt: title }] }
          : {}),
      },
      twitter: { card: "summary_large_image", title, description },
      alternates: { canonical: canonicalUrl },
    };
  } catch {
    return {};
  }
}

export default async function CityHubRoute({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  if (!slug) notFound();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) notFound();

  try {
    const hub = await serverApiRequest(`/api/hubs/${slug}`);
    const props = hubToPageProps(hub);
    const city = hub.city ?? hub.title?.replace(/best bowling (in )?/i, "").trim() ?? slug;
    const canonicalUrl = `${siteUrl}/${slug}`;

    const schema = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `Best Bowling Alleys in ${city}`,
      description:
        hub.description ??
        hub.subtitle ??
        `Find and compare bowling alleys in ${city}.`,
      url: canonicalUrl,
      ...(hub.heroOgImageUrl && !hub.heroOgImageUrl.startsWith("data:")
        ? { image: hub.heroOgImageUrl }
        : {}),
      about: {
        "@type": "City",
        name: city,
        ...(hub.stateCode ? { containedInPlace: { "@type": "State", name: hub.stateCode } } : {}),
      },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: `Bowling in ${city}`, item: canonicalUrl },
        ],
      },
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
        <CityHubPage {...props} />
      </>
    );
  } catch {
    notFound();
  }
}
