import { NextResponse } from "next/server";
import { getAuthSessionFromRequest } from "@/lib/auth-session";
import type { TemplateReaction } from "@/lib/template-presets";
import { reactCommunityTemplate } from "@/lib/template-store";

export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const { slug } = await params;
  const session = getAuthSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Sign in with GitHub before reacting to templates." }, { status: 401 });
  }

  const body = (await request.json()) as {
    reaction?: TemplateReaction;
  };

  if (body.reaction !== "like" && body.reaction !== "dislike") {
    return NextResponse.json({ error: "Invalid reaction type." }, { status: 400 });
  }

  const template = await reactCommunityTemplate({
    slug,
    actorId: session.accountId,
    reaction: body.reaction,
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  return NextResponse.json({ template });
}
