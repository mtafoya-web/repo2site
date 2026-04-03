import { NextResponse } from "next/server";
import { getAuthSessionFromRequest } from "@/lib/auth-session";
import { captureServerException } from "@/lib/monitoring";
import { buildFinalPortfolio, createEmptyOverrides } from "@/lib/portfolio";
import { checkShareSlugAvailability, publishPortfolioShare } from "@/lib/share-store";
import { getSiteOrigin } from "@/lib/site-url";
import type {
  GeneratePreviewResponse,
  PortfolioOverrides,
  PreviewAbout,
  PreviewHero,
  PreviewLink,
  PreviewRepository,
  PreviewSection,
  PreviewTheme,
} from "@/lib/types";

export const runtime = "nodejs";

const FALLBACK_THEME: PreviewTheme = {
  id: "builder-blue",
  name: "Builder Blue",
  reason: "Default theme while no profile data is loaded.",
  palette: {
    page: "#f6f8fc",
    pageAccent: "rgba(96, 165, 250, 0.16)",
    surface: "rgba(255,255,255,0.88)",
    surfaceStrong: "#ffffff",
    border: "rgba(148, 163, 184, 0.28)",
    text: "#0f172a",
    muted: "#475569",
    accent: "#2563eb",
    accentSoft: "rgba(37, 99, 235, 0.12)",
    chip: "#e0ecff",
  },
};

const FALLBACK_HERO: PreviewHero = {
  name: "Your Name",
  headline: "A concise profile headline generated from GitHub data will appear here.",
  subheadline:
    "Load a public GitHub profile to generate the starting draft, then refine it manually in edit mode.",
  ctaLabel: "View GitHub Profile",
};

const FALLBACK_ABOUT: PreviewAbout = {
  title: "About Me",
  description:
    "Profile bio, focus areas, and public contribution context will appear here once a profile is generated.",
};

const FALLBACK_CONTACT: PreviewSection = {
  title: "Contact",
  description: "Add direct contact details and a custom note to make the portfolio feel more personal.",
};

const FALLBACK_LINKS_SECTION: PreviewSection = {
  title: "Links",
  description: "GitHub-derived links show up here first, and edit mode can extend them with your own links.",
};

const FALLBACK_REPOSITORIES: PreviewRepository[] = [
  {
    name: "featured-repo-1",
    description: "A placeholder project summary.",
    language: "TypeScript",
    href: "https://github.com/username/featured-repo-1",
    stars: 0,
    image: null,
    readmeImages: [],
    readmeExcerpt: "",
  },
];

const FALLBACK_LINKS: PreviewLink[] = [{ label: "GitHub", href: "https://github.com/username" }];
const FALLBACK_TECH_STACK = ["TypeScript", "Next.js", "Tailwind CSS"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") ?? "";
  const session = getAuthSessionFromRequest(request);
  const ownerHint = session ? `account:${session.accountId}` : searchParams.get("ownerHint") ?? "";

  if (!slug.trim()) {
    return NextResponse.json(
      { error: "Provide a slug to check availability." },
      { status: 400 },
    );
  }

  try {
    const availability = await checkShareSlugAvailability({
      slug,
      ownerHint,
    });

    return NextResponse.json(availability);
  } catch (error) {
    await captureServerException(error, {
      area: "share",
      action: "check-slug-availability",
      metadata: {
        slug,
      },
    });

    return NextResponse.json(
      { error: "Something went wrong while checking that public URL." },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const session = getAuthSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { error: "Sign in with GitHub before publishing a public portfolio link." },
      { status: 401 },
    );
  }

  const body = (await request.json()) as {
    preview?: GeneratePreviewResponse;
    overrides?: PortfolioOverrides;
    slug?: string;
  };

  if (!body.preview) {
    return NextResponse.json(
      { error: "Generate a portfolio preview before creating a public share link." },
      { status: 400 },
    );
  }

  try {
    const overrides = body.overrides ?? createEmptyOverrides();
    const portfolio = buildFinalPortfolio(body.preview, overrides, {
      theme: FALLBACK_THEME,
      hero: FALLBACK_HERO,
      about: FALLBACK_ABOUT,
      contact: FALLBACK_CONTACT,
      linksSection: FALLBACK_LINKS_SECTION,
      repositories: FALLBACK_REPOSITORIES,
      links: FALLBACK_LINKS,
      techStack: FALLBACK_TECH_STACK,
    });

    const record = await publishPortfolioShare({
      portfolio,
      requestedSlug: body.slug,
      siteOrigin: getSiteOrigin(),
      owner: {
        provider: "account",
        id: session.accountId,
        displayName: session.displayName,
      },
    });

    return NextResponse.json({
      id: record.id,
      slug: record.slug,
      path: `/u/${record.slug}`,
      updatedAt: record.updatedAt,
      publishedAt: record.publishedAt,
      metadata: record.metadata,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("already taken")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    await captureServerException(error, {
      area: "share",
      action: "publish-public-link",
      metadata: {
        hasPreview: Boolean(body.preview),
        hasOverrides: Boolean(body.overrides),
      },
    });

    return NextResponse.json(
      { error: "Something went wrong while creating the public share link. Please try again." },
      { status: 502 },
    );
  }
}
