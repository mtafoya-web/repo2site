import { NextResponse } from "next/server";
import { getAuthSessionFromRequest } from "@/lib/auth-session";
import { rateCommunityTemplate } from "@/lib/template-store";

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
    return NextResponse.json({ error: "Sign in with GitHub before rating templates." }, { status: 401 });
  }

  const body = (await request.json()) as {
    rating?: number;
  };

  if (typeof body.rating !== "number") {
    return NextResponse.json({ error: "Missing rating details." }, { status: 400 });
  }

  const template = await rateCommunityTemplate({
    slug,
    actorId: session.accountId,
    rating: body.rating,
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  return NextResponse.json({ template });
}
