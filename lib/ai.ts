import { buildEnhancementPromptInput } from "@/lib/prompt";
import type {
  EnrichmentSourceResult,
  GeneratePreviewResponse,
  PortfolioEnhancement,
  PortfolioOverrides,
} from "@/lib/types";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";

class AiEnhancementError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "AiEnhancementError";
    this.status = status;
  }
}

type ResponsesApiPayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
};

const enhancementSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "heroHeadline",
    "heroSubheadline",
    "aboutMe",
    "professionalTitle",
    "professionalSummary",
    "contactIntro",
    "linksIntro",
    "featuredProjectDescriptions",
  ],
  properties: {
    heroHeadline: {
      type: "string",
      description: "A concise, polished portfolio hero headline grounded in the supplied GitHub context, even if the current draft field is empty.",
    },
    heroSubheadline: {
      type: "string",
      description: "A fuller supporting hero subheadline of 2-3 sentences grounded in the supplied context, even if the current draft field is empty.",
    },
    aboutMe: {
      type: "string",
      description: "An improved About Me section of 3-5 sentences with no HTML or markdown. If the source field is weak or blank, write a grounded default from the available context.",
    },
    professionalTitle: {
      type: "string",
      description: "A concise professional section heading grounded in the supplied context, suitable for a portfolio section title.",
    },
    professionalSummary: {
      type: "string",
      description: "A portfolio-ready professional summary of 3-5 sentences grounded in the GitHub draft, imported materials, and accepted manual edits. No HTML or markdown.",
    },
    contactIntro: {
      type: "string",
      description: "A stronger contact section intro of 2-3 sentences with no HTML or markdown. If the source field is weak or blank, write a grounded default from the available context.",
    },
    linksIntro: {
      type: "string",
      description: "A concise links section introduction that frames the professional links and supporting materials without sounding generic.",
    },
    featuredProjectDescriptions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "description"],
        properties: {
          name: {
            type: "string",
            description: "Repository name exactly as provided in the input draft.",
          },
          description: {
            type: "string",
            description: "A stronger portfolio-ready project description of 2-4 sentences with no HTML or markdown. If the source field is weak or blank, write a grounded default from the available context for that repository.",
          },
        },
      },
    },
  },
} as const;

function extractStructuredOutput(payload: ResponsesApiPayload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "refusal" && content.refusal) {
        throw new AiEnhancementError("The AI request was refused. Please try again with a different profile.", 502);
      }

      if (content.type === "output_text" && content.text?.trim()) {
        return content.text;
      }
    }
  }

  throw new AiEnhancementError("The AI response did not include any structured output.", 502);
}

function isValidEnhancement(value: unknown): value is PortfolioEnhancement {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as PortfolioEnhancement;

  return (
    typeof candidate.heroHeadline === "string" &&
    typeof candidate.heroSubheadline === "string" &&
    typeof candidate.aboutMe === "string" &&
    typeof candidate.professionalTitle === "string" &&
    typeof candidate.professionalSummary === "string" &&
    typeof candidate.contactIntro === "string" &&
    typeof candidate.linksIntro === "string" &&
    Array.isArray(candidate.featuredProjectDescriptions) &&
    candidate.featuredProjectDescriptions.every(
      (project) =>
        project &&
        typeof project === "object" &&
        typeof project.name === "string" &&
        typeof project.description === "string",
    )
  );
}

export function isAiEnhancementError(error: unknown): error is AiEnhancementError {
  return error instanceof AiEnhancementError;
}

export async function enhancePortfolioDraft(
  params: {
    draft: GeneratePreviewResponse;
    overrides: PortfolioOverrides;
    enrichmentResults: EnrichmentSourceResult[];
  },
): Promise<{ enhancement: PortfolioEnhancement; model: string }> {
  const { draft, overrides, enrichmentResults } = params;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new AiEnhancementError(
      "AI enhancements are not configured yet. Add OPENAI_API_KEY before using this feature.",
      500,
    );
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You enhance portfolio copy. Stay grounded in the provided GitHub-derived draft, imported public materials such as resumes, cover letters, LinkedIn, Handshake, README-derived repository signals, and accepted manual edits. For site structure and project content, prioritize GitHub repositories, README evidence, and existing portfolio/project data first, accepted edits second, and resume/cover-letter documents third as supplemental context. Resume and cover letter content should improve personalization and supporting summaries, but must never replace repository-backed project content or rewrite the site's structure. When a field is empty, generic, or weak, generate a stronger, more complete portfolio-style suggestion from the remaining evidence instead of returning an empty string. About, professional summary, contact introduction, and other profile-personalization copy may use restrained first-person phrasing when it clearly improves authenticity and is directly supported by the source material. Use 'I' sparingly. Hero headline, hero intro, links intro, professional headings, and project descriptions should stay in concise portfolio tone using phrasing such as 'Engineered', 'Created', 'Developed', 'Built', 'Designed', or 'Focused on', without first-person narration. Improve tone, specificity, and polish, but do not fabricate specific facts, employers, metrics, timelines, or outcomes. Return strict JSON only.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildEnhancementPromptInput({ draft, overrides, enrichmentResults }),
            },
          ],
        },
      ],
      max_output_tokens: 2400,
      text: {
        format: {
          type: "json_schema",
          name: "portfolio_enhancement",
          strict: true,
          schema: enhancementSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new AiEnhancementError(
      detail || "The AI provider returned an unsuccessful response.",
      response.status >= 400 && response.status < 500 ? response.status : 502,
    );
  }

  const payload = (await response.json()) as ResponsesApiPayload;
  const outputText = extractStructuredOutput(payload);

  let parsed: unknown;

  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new AiEnhancementError("The AI response could not be parsed as valid JSON.", 502);
  }

  if (!isValidEnhancement(parsed)) {
    throw new AiEnhancementError("The AI response JSON did not match the expected enhancement shape.", 502);
  }

  return {
    enhancement: parsed,
    model: DEFAULT_OPENAI_MODEL,
  };
}
