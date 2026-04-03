import type {
  EnrichmentSourceResult,
  GeneratePreviewResponse,
  GitHubProfileInfo,
  PortfolioOverrides,
} from "@/lib/types";

export function buildPreviewPromptSeed(profile: GitHubProfileInfo) {
  return [
    `GitHub profile: ${profile.username}`,
    `Display name: ${profile.name}`,
    profile.bio ? `Bio: ${profile.bio}` : "Bio: not provided",
    "Goal: generate a polished portfolio-style personal website preview.",
    "Inputs to use later: public profile metadata, pinned items, repositories, README signals, languages, and links.",
    "Output should feel credible, specific, and easy to scan without generic builder filler.",
  ].join("\n");
}

const GENERIC_DRAFT_PATTERNS = [
  /public repository with limited metadata/i,
  /keep the generated profile as a starting draft/i,
  /github-derived links appear first/i,
  /this preview is using profile-level data while repository highlights are still sparse/i,
  /featuring \d+ repositories selected from public github data/i,
];

function sanitizeDraftText(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  const isGenericDraft = GENERIC_DRAFT_PATTERNS.some((pattern) => pattern.test(trimmedValue));

  return isGenericDraft ? "" : trimmedValue;
}

function describeFieldStrength(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "missing";
  }

  if (trimmedValue.length < 45 || trimmedValue.split(/\s+/).length < 7) {
    return "weak";
  }

  return "strong";
}

export function buildEnhancementPromptInput(params: {
  draft: GeneratePreviewResponse;
  overrides: PortfolioOverrides;
  enrichmentResults: EnrichmentSourceResult[];
}) {
  const { draft, overrides, enrichmentResults } = params;
  const heroHeadline = sanitizeDraftText(draft.hero.headline);
  const heroSubheadline = sanitizeDraftText(draft.hero.subheadline);
  const aboutDescription = sanitizeDraftText(draft.about.description);
  const contactDescription = sanitizeDraftText(draft.contact.description);
  const importedContext = enrichmentResults.map((source) => ({
    sourceType: source.sourceType,
    sourceLabel: source.sourceLabel,
    pageTitle: source.pageTitle,
    status: source.status,
    failureReason: source.failureReason ?? "",
    suggestions: source.suggestions.map((suggestion) => ({
      field: suggestion.field,
      label: suggestion.label,
      value: suggestion.value,
      note: suggestion.note ?? "",
    })),
    notes: source.notes,
    warnings: source.warnings,
  }));

  return [
    "Improve this generated developer portfolio draft using only the supplied data.",
    "Return JSON only.",
    "Do not generate HTML, JSX, markdown, links, or unsupported fields.",
    "Keep the tone grounded, specific, and credible for a production-ready personal portfolio.",
    "For portfolio and project structure, prioritize evidence in this order: 1. GitHub repositories, README evidence, and existing portfolio/project data, 2. accepted manual edits, 3. resume and cover letter documents as supplemental context.",
    "Write in polished portfolio language that sounds professionally authored and technically grounded.",
    "About Me, Professional Summary, contact intro, and similar profile-personalization copy may use restrained first-person wording when it genuinely improves clarity and is directly supported by the evidence.",
    "When first-person is used, keep 'I' minimal and natural. Do not invent goals, experience, skills, titles, or claims.",
    "Hero headline, hero intro, links intro, professional headings, and project descriptions should avoid first-person narration.",
    "For non-first-person sections, prefer concise recruiter-friendly phrasing such as 'Engineered', 'Created', 'Developed', 'Built', 'Designed', or 'Focused on'.",
    "Write richer suggestions than the source draft: the hero, about, professional summary, and contact intro should feel complete and polished rather than placeholder-like.",
    "Hero headline should usually be one sentence. Hero subheadline should usually be 2-3 sentences. About and professional summary should usually be 3-5 sentences when evidence supports it. Links and contact intros should usually be 1-3 sentences.",
    "Project descriptions should read like short portfolio case-study summaries grounded primarily in repository description, languages, links, README excerpts, and accepted manual edits. Resume and cover letter content may support tone or context, but must not replace repository-backed evidence.",
    "If a field is missing or weak, generate a tasteful portfolio-ready suggestion using the remaining GitHub, README-derived, imported, and manual context.",
    "Use manual edits and imported public document/profile context as additional evidence when present, but do not contradict accepted edits.",
    "Prefer concrete phrasing about technical focus, public work, collaboration style, and project intent over vague claims about passion or innovation.",
    "Avoid hype, corporate marketing language, and generic AI phrasing such as 'leveraging cutting-edge solutions' or 'passionate developer dedicated to innovation'.",
    "Do not invent employers, timelines, project outcomes, users, or technologies that are not supported by the input.",
    "Treat empty sourceText as a signal to fill the presentation gap rather than leaving the suggestion blank.",
    "When enrichment sources failed because a site is private or blocked, rely on the remaining imported materials, GitHub evidence, and manual edits instead of mentioning the failure in the output.",
    "Input draft:",
    JSON.stringify(
      {
        profile: {
          username: draft.profile.username,
          name: draft.profile.name,
          bio: draft.profile.bio,
          company: draft.profile.company,
          location: draft.profile.location,
          blog: draft.profile.blog,
          followers: draft.profile.followers,
          publicRepos: draft.profile.publicRepos,
        },
        hero: {
          ...draft.hero,
          headline: {
            sourceText: heroHeadline,
            strength: describeFieldStrength(heroHeadline),
          },
          subheadline: {
            sourceText: heroSubheadline,
            strength: describeFieldStrength(heroSubheadline),
          },
        },
        about: {
          ...draft.about,
          description: {
            sourceText: aboutDescription,
            strength: describeFieldStrength(aboutDescription),
          },
        },
        contact: {
          ...draft.contact,
          description: {
            sourceText: contactDescription,
            strength: describeFieldStrength(contactDescription),
          },
        },
        acceptedManualEdits: {
          heroHeadline: overrides.hero.headline,
          heroIntro: overrides.hero.subheadline,
          aboutTitle: overrides.about.title,
          aboutDescription: overrides.about.description,
          professionalSummary: overrides.professional.summary,
          professionalTitle: overrides.professional.title,
          contactDescription: overrides.contact.description,
          contactEmail: overrides.contact.email,
          contactPhone: overrides.contact.phone,
          professionalCompany: overrides.professional.company,
          professionalLocation: overrides.professional.location,
          professionalAvailability: overrides.professional.availability,
          links: {
            sectionDescription: overrides.linksSection.description,
            resumeUrl: overrides.linksSection.resumeUrl,
            coverLetterUrl: overrides.linksSection.coverLetterUrl,
            linkedIn: overrides.linksSection.linkedIn,
            handshakeUrl: overrides.linksSection.handshakeUrl,
            portfolioUrl: overrides.linksSection.portfolioUrl,
          },
          documents: {
            hasResumeAsset: Boolean(overrides.documents.resumeAssetUrl),
            resumeFileName: overrides.documents.resumeFileName,
            hasCoverLetterAsset: Boolean(overrides.documents.coverLetterAssetUrl),
            coverLetterFileName: overrides.documents.coverLetterFileName,
          },
          projects: Object.entries(overrides.projectOverrides).map(([name, project]) => ({
            name,
            description: project.description,
            imageUrl: project.imageUrl,
          })),
        },
        importedContext,
        techStack: draft.techStack,
        summary: draft.summary,
        featuredRepositories: draft.featuredRepositories.map((repository) => ({
          name: repository.name,
          description: {
            sourceText: sanitizeDraftText(repository.description),
            strength: describeFieldStrength(sanitizeDraftText(repository.description)),
          },
          readmeExcerpt: {
            sourceText: repository.readmeExcerpt,
            strength: describeFieldStrength(repository.readmeExcerpt),
          },
          language: repository.language,
          stars: repository.stars,
          href: repository.href,
          readmeImages: repository.readmeImages.slice(0, 3),
        })),
      },
      null,
      2,
    ),
  ].join("\n\n");
}
