import { NextResponse } from "next/server";
import { enhancePortfolioDraft, isAiEnhancementError } from "@/lib/ai";
import { captureServerException } from "@/lib/monitoring";
import { createEmptyOverrides } from "@/lib/portfolio";
import type { EnrichmentSourceResult, GeneratePreviewResponse, PortfolioOverrides } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    draft?: GeneratePreviewResponse;
    overrides?: PortfolioOverrides;
    enrichmentResults?: EnrichmentSourceResult[];
  };
  const draft = body.draft;
  const overrides = body.overrides ?? createEmptyOverrides();
  const enrichmentResults = body.enrichmentResults ?? [];

  if (!draft) {
    return NextResponse.json(
      { error: "Missing portfolio draft. Generate a preview before requesting AI enhancements." },
      { status: 400 },
    );
  }

  try {
    const result = await enhancePortfolioDraft({ draft, overrides, enrichmentResults });

    return NextResponse.json(result);
  } catch (error) {
    if (isAiEnhancementError(error)) {
      if (error.status >= 500) {
        await captureServerException(error, {
          area: "ai-enhance",
          action: "generate-suggestions",
          metadata: {
            hasDraft: Boolean(draft),
            enrichmentSourceCount: enrichmentResults.length,
          },
        });
      }

      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    await captureServerException(error, {
      area: "ai-enhance",
      action: "unexpected-error",
      metadata: {
        hasDraft: Boolean(draft),
        enrichmentSourceCount: enrichmentResults.length,
      },
    });

    return NextResponse.json(
      { error: "Something went wrong while generating AI suggestions. Please try again." },
      { status: 502 },
    );
  }
}
