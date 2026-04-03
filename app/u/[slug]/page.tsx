import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Repo2SitePublicPage } from "@/components/repo2site-public-page";
import { getSharedPortfolioBySlug, getSharedPortfolioForPublicView } from "@/lib/share-store";
import { getSiteOrigin } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const record = await getSharedPortfolioBySlug(slug);

  if (!record) {
    return {
      title: "Portfolio not found | Repo2Site",
      description: "This public portfolio link is no longer available.",
    };
  }

  const origin = getSiteOrigin();
  const title = record.metadata.title;
  const description = record.metadata.description;
  const ogImageUrl = `${origin}/u/${record.slug}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${origin}/u/${record.slug}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${record.portfolio.hero.name} portfolio preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function PublicPortfolioPage({ params }: PageProps) {
  const { slug } = await params;
  const requestHeaders = await headers();
  const viewerHint = [
    requestHeaders.get("x-forwarded-for") ?? "",
    requestHeaders.get("user-agent") ?? "",
  ]
    .filter(Boolean)
    .join("|");
  const record = await getSharedPortfolioForPublicView(slug, viewerHint);

  if (!record) {
    notFound();
  }

  return <Repo2SitePublicPage record={record} />;
}
