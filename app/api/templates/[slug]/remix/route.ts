import { NextResponse } from "next/server";
import { incrementTemplateRemixCount } from "@/lib/template-store";

export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteProps) {
  const { slug } = await params;
  const template = await incrementTemplateRemixCount(slug);

  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  return NextResponse.json({ template });
}
