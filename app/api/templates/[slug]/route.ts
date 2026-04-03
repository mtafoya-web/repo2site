import { NextResponse } from "next/server";
import { getAuthSessionFromRequest } from "@/lib/auth-session";
import { getCommunityTemplateBySlug } from "@/lib/template-store";

export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { slug } = await params;
  const session = getAuthSessionFromRequest(_request);
  const template = await getCommunityTemplateBySlug(slug, session?.accountId);

  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  return NextResponse.json({ template });
}
