import { NextResponse } from "next/server";
import { enrichSources } from "@/lib/enrichment";
import { captureServerException } from "@/lib/monitoring";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  let urls: string[] = [];
  let files: Array<{ name: string; type: string; buffer: Buffer }> = [];

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const rawUrls = formData.get("urls");
    urls = typeof rawUrls === "string" ? rawUrls.split(/\r?\n|,/).map((value) => value.trim()).filter(Boolean) : [];

    const formFiles = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
    files = await Promise.all(
      formFiles.map(async (file) => ({
        name: file.name,
        type: file.type,
        buffer: Buffer.from(await file.arrayBuffer()),
      })),
    );
  } else {
    const body = (await request.json()) as { urls?: string[] };
    urls = body.urls?.map((url) => url.trim()).filter(Boolean) ?? [];
  }

  if (urls.length === 0 && files.length === 0) {
    return NextResponse.json(
      { error: "Add at least one public URL or upload at least one PDF resume or cover letter to import suggestions." },
      { status: 400 },
    );
  }

  try {
    const result = await enrichSources({ urls, files });
    return NextResponse.json(result);
  } catch (error) {
    await captureServerException(error, {
      area: "enrichment",
      action: "import-sources",
      metadata: {
        urlCount: urls.length,
        fileCount: files.length,
      },
    });

    return NextResponse.json(
      { error: "Something went wrong while importing external profile data. Please try again." },
      { status: 502 },
    );
  }
}
