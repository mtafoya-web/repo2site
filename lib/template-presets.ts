import { buildLayoutComponents } from "@/lib/portfolio";
import type { FinalPortfolio } from "@/lib/portfolio";
import type {
  PortfolioAppearance,
  PortfolioCanvasComponent,
  PortfolioOverrides,
  PortfolioSectionId,
} from "@/lib/types";

export type TemplateStatus = "published" | "archived";
export type TemplateSortMode = "trending" | "newest" | "most-liked";
export type TemplateReaction = "like" | "dislike";
const DEFAULT_PROFESSIONAL_TITLE = "Career / Professional Info";

export type TemplateAuthor = {
  provider: "github" | "anonymous" | "account";
  id: string;
  displayName: string;
  username: string;
  profileUrl: string;
  avatarUrl: string;
};

export type TemplatePreset = {
  appearance: PortfolioAppearance;
  layout: {
    sectionOrder: PortfolioSectionId[];
    hiddenSections: PortfolioSectionId[];
    components: PortfolioCanvasComponent[];
    componentOrder: Record<string, string[]>;
    hiddenComponentIds: string[];
  };
};

export type TemplateExampleContent = {
  hero?: {
    headline: string;
    subheadline: string;
  };
  about?: {
    title: string;
    description: string;
  };
  professional?: {
    title: string;
    summary: string;
    availability: string;
  };
  contact?: {
    title: string;
    description: string;
    customText: string;
  };
  linksSection?: {
    title: string;
    description: string;
  };
};

export type TemplatePreviewSnapshot = FinalPortfolio;

export type CommunityTemplateRecord = {
  id: string;
  slug: string;
  schemaVersion: number;
  status: TemplateStatus;
  isSystem: boolean;
  isRecommended: boolean;
  title: string;
  description: string;
  category: string;
  tags: string[];
  previewImageUrl: string;
  sourceLabel: string;
  author: TemplateAuthor;
  preset: TemplatePreset;
  previewSnapshot?: TemplatePreviewSnapshot;
  exampleContent?: TemplateExampleContent;
  exampleProjects: Array<{
    name: string;
    description: string;
    tech: string[];
  }>;
  likes: number;
  dislikes: number;
  remixes: number;
  ratingAverage: number;
  ratingsCount: number;
  viewerReaction?: TemplateReaction | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
};

export function buildTemplatePreset(
  overrides: PortfolioOverrides,
  fallbackThemeId = "",
): TemplatePreset {
  return {
    appearance: {
      ...overrides.appearance,
      themeId: overrides.appearance.themeId.trim() || fallbackThemeId.trim(),
    },
    layout: {
      sectionOrder: [...overrides.layout.sectionOrder],
      hiddenSections: [...overrides.layout.hiddenSections],
      components: overrides.layout.components.map((component) => ({ ...component })),
      componentOrder: Object.fromEntries(
        Object.entries(overrides.layout.componentOrder).map(([key, ids]) => [key, [...ids]]),
      ),
      hiddenComponentIds: [...overrides.layout.hiddenComponentIds],
    },
  };
}

export function applyTemplatePreset(
  current: PortfolioOverrides,
  preset: TemplatePreset,
): PortfolioOverrides {
  return {
    ...current,
    appearance: {
      ...current.appearance,
      ...preset.appearance,
    },
    layout: {
      ...current.layout,
      sectionOrder: [...preset.layout.sectionOrder],
      hiddenSections: [...preset.layout.hiddenSections],
      components: (preset.layout.components ?? buildLayoutComponents(
        preset.layout.sectionOrder,
        preset.layout.hiddenSections,
      )).map((component) => ({ ...component })),
      componentOrder: Object.fromEntries(
        Object.entries(preset.layout.componentOrder ?? {}).map(([key, ids]) => [key, [...ids]]),
      ),
      hiddenComponentIds: [...(preset.layout.hiddenComponentIds ?? [])],
    },
  };
}

function shouldApplyTemplateValue(currentValue: string, allowDefaultProfessionalTitle = false) {
  const trimmedValue = currentValue.trim();

  if (!trimmedValue) {
    return true;
  }

  return allowDefaultProfessionalTitle && trimmedValue === DEFAULT_PROFESSIONAL_TITLE;
}

export function applyTemplateRecord(
  current: PortfolioOverrides,
  template: Pick<CommunityTemplateRecord, "preset" | "exampleContent">,
): PortfolioOverrides {
  const next = applyTemplatePreset(current, template.preset);
  const content = template.exampleContent;

  if (!content) {
    return next;
  }

  return {
    ...next,
    hero: {
      ...next.hero,
      headline:
        content.hero && shouldApplyTemplateValue(next.hero.headline) ? content.hero.headline : next.hero.headline,
      subheadline:
        content.hero && shouldApplyTemplateValue(next.hero.subheadline)
          ? content.hero.subheadline
          : next.hero.subheadline,
    },
    about: {
      ...next.about,
      title: content.about && shouldApplyTemplateValue(next.about.title) ? content.about.title : next.about.title,
      description:
        content.about && shouldApplyTemplateValue(next.about.description)
          ? content.about.description
          : next.about.description,
    },
    professional: {
      ...next.professional,
      title:
        content.professional && shouldApplyTemplateValue(next.professional.title, true)
          ? content.professional.title
          : next.professional.title,
      summary:
        content.professional && shouldApplyTemplateValue(next.professional.summary)
          ? content.professional.summary
          : next.professional.summary,
      availability:
        content.professional && shouldApplyTemplateValue(next.professional.availability)
          ? content.professional.availability
          : next.professional.availability,
    },
    contact: {
      ...next.contact,
      title:
        content.contact && shouldApplyTemplateValue(next.contact.title)
          ? content.contact.title
          : next.contact.title,
      description:
        content.contact && shouldApplyTemplateValue(next.contact.description)
          ? content.contact.description
          : next.contact.description,
      customText:
        content.contact && shouldApplyTemplateValue(next.contact.customText)
          ? content.contact.customText
          : next.contact.customText,
    },
    linksSection: {
      ...next.linksSection,
      title:
        content.linksSection && shouldApplyTemplateValue(next.linksSection.title)
          ? content.linksSection.title
          : next.linksSection.title,
      description:
        content.linksSection && shouldApplyTemplateValue(next.linksSection.description)
          ? content.linksSection.description
          : next.linksSection.description,
    },
  };
}
