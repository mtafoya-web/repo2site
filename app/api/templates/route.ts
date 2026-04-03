import { NextResponse } from "next/server";
import { getAuthSessionFromRequest } from "@/lib/auth-session";
import { captureServerException } from "@/lib/monitoring";
import { buildFinalPortfolio } from "@/lib/portfolio";
import { buildTemplatePreset } from "@/lib/template-presets";
import { listCommunityTemplates, publishCommunityTemplate } from "@/lib/template-store";
import type { PortfolioOverrides, GeneratePreviewResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sort = (searchParams.get("sort") ?? "trending") as "trending" | "newest" | "most-liked";
  const session = getAuthSessionFromRequest(request);

  try {
    const templates = await listCommunityTemplates(sort, session?.accountId);
    return NextResponse.json({ templates });
  } catch (error) {
    await captureServerException(error, {
      area: "templates",
      action: "list-gallery",
      metadata: {
        sort,
      },
    });

    return NextResponse.json(
      { error: "Something went wrong while loading the template gallery." },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const session = getAuthSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { error: "Sign in with GitHub before publishing a community template." },
      { status: 401 },
    );
  }

  const body = (await request.json()) as {
    preview?: GeneratePreviewResponse;
    overrides?: PortfolioOverrides;
    title?: string;
    description?: string;
    category?: string;
    tags?: string[];
    slug?: string;
  };

  if (!body.preview || !body.overrides) {
    return NextResponse.json(
      { error: "Generate a portfolio preview before publishing a template." },
      { status: 400 },
    );
  }

  try {
    const previewSnapshot = buildFinalPortfolio(body.preview, body.overrides, {
      theme: body.preview.theme,
      hero: body.preview.hero,
      about: body.preview.about,
      contact: body.preview.contact,
      linksSection: body.preview.linksSection,
      repositories: body.preview.featuredRepositories,
      links: body.preview.links,
      techStack: body.preview.techStack,
    });
    const preset = buildTemplatePreset(body.overrides, previewSnapshot.theme.id);
    const record = await publishCommunityTemplate({
      slug: body.slug,
      title: body.title ?? "Untitled template",
      description: body.description ?? "A community template for Repo2Site.",
      category: body.category ?? "general",
      tags: body.tags ?? [],
      previewImageUrl:
        previewSnapshot.repositories.find((repository) => repository.resolvedImage?.url)?.resolvedImage?.url ||
        previewSnapshot.hero.imageUrl ||
        body.preview.profile.avatarUrl ||
        "",
      preset,
      previewSnapshot,
      author: {
        provider: "account",
        id: session.accountId,
        username: session.username,
        displayName: session.displayName,
        profileUrl: session.profileUrl,
        avatarUrl: session.avatarUrl,
      },
    });

    return NextResponse.json({ template: record });
  } catch (error) {
    await captureServerException(error, {
      area: "templates",
      action: "publish-template",
      metadata: {
        hasPreview: Boolean(body.preview),
        hasOverrides: Boolean(body.overrides),
      },
    });

    return NextResponse.json(
      { error: "Something went wrong while publishing the template." },
      { status: 502 },
    );
  }
}
