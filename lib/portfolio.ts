import type {
  GeneratePreviewResponse,
  PortfolioCanvasComponent,
  PortfolioCanvasComponentOrder,
  PortfolioAppearance,
  ProfessionalCtaLabels,
  PortfolioEnhancement,
  PortfolioSectionId,
  PortfolioOverrides,
  PortfolioSectionType,
  PortfolioSectionWidth,
  PreviewAbout,
  PreviewHero,
  PreviewLink,
  PreviewProjectImage,
  PreviewRepository,
  PreviewSection,
  PreviewTheme,
} from "@/lib/types";
import { applyCustomPaletteToTheme, getPortfolioThemeById } from "@/lib/themes";

export type ContentSource = "github" | "readme" | "ai" | "user";

export type ResolvedField = {
  value: string;
  source: Exclude<ContentSource, "readme">;
};

export type ResolvedPreviewLink = PreviewLink & {
  source: Exclude<ContentSource, "readme">;
};

export type ResolvedPreviewRepository = PreviewRepository & {
  descriptionSource: Exclude<ContentSource, "readme">;
  resolvedImage: PreviewProjectImage | { url: string; alt: string; source: "user" } | null;
};

export type ResolvedProfessionalAction = {
  id: keyof ProfessionalCtaLabels | "github";
  label: string;
  href: string;
  source: Exclude<ContentSource, "readme">;
};

export type FinalPortfolio = {
  theme: PreviewTheme;
  appearance: PortfolioAppearance;
  layout: {
    sectionOrder: PortfolioSectionId[];
    hiddenSections: PortfolioSectionId[];
    components: PortfolioCanvasComponent[];
    componentOrder: PortfolioCanvasComponentOrder;
    hiddenComponentIds: string[];
  };
  profile: GeneratePreviewResponse["profile"] | null;
  summary: string;
  hero: {
    name: string;
    imageUrl: string;
    headline: ResolvedField;
    subheadline: ResolvedField;
    ctaLabel: string;
    profileLink: string;
  };
  about: {
    title: ResolvedField;
    description: ResolvedField;
  };
  contact: {
    title: ResolvedField;
    description: ResolvedField;
    customText: string;
    email: string;
    emailHref: string;
    phone: string;
    phoneHref: string;
  };
  professional: {
    title: string;
    summary: string;
    company: string;
    location: string;
    availability: string;
    actions: ResolvedProfessionalAction[];
  };
  linksSection: {
    title: ResolvedField;
    description: ResolvedField;
    links: ResolvedPreviewLink[];
  };
  customSections: Array<{
    id: string;
    title: ResolvedField;
    description: ResolvedField;
    imageUrl: string;
    cards: Array<{
      id: string;
      title: ResolvedField;
      description: ResolvedField;
    }>;
  }>;
  repositories: ResolvedPreviewRepository[];
  techStack: string[];
  hasBio: boolean;
};

export const DEFAULT_SECTION_ORDER: PortfolioSectionId[] = [
  "hero",
  "about",
  "professional",
  "projects",
  "links",
  "contact",
];

export const DEFAULT_LAYOUT_COMPONENTS: PortfolioCanvasComponent[] = DEFAULT_SECTION_ORDER.map(
  (sectionId) => ({
    id: sectionId,
    type: sectionId,
    visible: true,
    rowId: sectionId,
    width: "full",
  }),
);

export const DEFAULT_CARD_LABELS: ProfessionalCtaLabels = {
  resume: "Resume",
  coverLetter: "Cover Letter",
  handshake: "Handshake",
  linkedIn: "LinkedIn",
  portfolio: "Website",
  email: "Email",
  phone: "Phone",
};

export const DEFAULT_APPEARANCE: PortfolioAppearance = {
  themeId: "",
  colorMode: "dark",
  density: "compact",
  sectionLayout: "split",
  projectLayout: "mixed",
  cardStyle: "soft",
};

export const PROFESSIONAL_ACTION_LABELS = {
  resume: "Download Resume",
  coverLetter: "View Cover Letter",
  handshake: "Connect on Handshake",
  linkedIn: "Visit LinkedIn",
  portfolio: "Visit Website",
  email: "Email",
  phone: "Call",
  github: "View GitHub Profile",
} as const;

export const SECTION_MIN_WIDTH_RATIO = 1 / 3;
export const SECTION_SNAPPED_WIDTH_RATIOS = [1 / 3, 0.4, 0.5, 0.6, 2 / 3] as const;

type SectionLayoutRole = "full" | "heavy" | "light";

function getSectionLayoutRole(sectionType: PortfolioSectionType): SectionLayoutRole {
  switch (sectionType) {
    case "projects":
      return "full";
    case "links":
    case "contact":
      return "light";
    case "about":
    case "professional":
    case "custom":
    default:
      return "heavy";
  }
}

export function canSectionShareRow(component: Pick<PortfolioCanvasComponent, "type">) {
  return getSectionLayoutRole(component.type) !== "full";
}

export function isSectionFullWidth(component: Pick<PortfolioCanvasComponent, "type">) {
  return !canSectionShareRow(component);
}

export function canSectionsShareRow(
  leftComponent: Pick<PortfolioCanvasComponent, "id" | "type">,
  rightComponent: Pick<PortfolioCanvasComponent, "id" | "type">,
) {
  if (leftComponent.id === rightComponent.id) {
    return false;
  }

  if (!canSectionShareRow(leftComponent) || !canSectionShareRow(rightComponent)) {
    return false;
  }

  return true;
}

export function getAllowedRowWidthRatios(
  leftComponent: Pick<PortfolioCanvasComponent, "type">,
  rightComponent: Pick<PortfolioCanvasComponent, "type">,
) {
  const leftRole = getSectionLayoutRole(leftComponent.type);
  const rightRole = getSectionLayoutRole(rightComponent.type);

  if (leftRole === "light" && rightRole === "light") {
    return [0.4, 0.5, 0.6];
  }

  if (
    (leftRole === "heavy" && rightRole === "light") ||
    (leftRole === "light" && rightRole === "heavy")
  ) {
    return [...SECTION_SNAPPED_WIDTH_RATIOS];
  }

  return [0.4, 0.5, 0.6];
}

export function snapRowWidthRatio(
  value: number,
  leftComponent: Pick<PortfolioCanvasComponent, "type">,
  rightComponent: Pick<PortfolioCanvasComponent, "type">,
) {
  const allowedRatios = getAllowedRowWidthRatios(leftComponent, rightComponent);
  const clamped = Math.min(1 - SECTION_MIN_WIDTH_RATIO, Math.max(SECTION_MIN_WIDTH_RATIO, value));

  return allowedRatios.reduce((closest, candidate) =>
    Math.abs(candidate - clamped) < Math.abs(closest - clamped) ? candidate : closest,
  );
}

export function getCanvasSectionWidthRatio(
  component: Pick<PortfolioCanvasComponent, "type" | "widthRatio" | "width">,
) {
  if (isSectionFullWidth(component)) {
    return 1;
  }

  if (typeof component.widthRatio === "number" && Number.isFinite(component.widthRatio)) {
    return Math.min(1, Math.max(SECTION_MIN_WIDTH_RATIO, component.widthRatio));
  }

  return Math.min(1, Math.max(SECTION_MIN_WIDTH_RATIO, mapLegacyWidthToRatio(component.width)));
}

function getDefaultRowWidthRatio(
  leftComponent: Pick<PortfolioCanvasComponent, "type">,
  rightComponent: Pick<PortfolioCanvasComponent, "type">,
) {
  const leftRole = getSectionLayoutRole(leftComponent.type);
  const rightRole = getSectionLayoutRole(rightComponent.type);

  if (leftRole === "heavy" && rightRole === "light") {
    return 0.6;
  }

  if (leftRole === "light" && rightRole === "heavy") {
    return 0.4;
  }

  return 0.5;
}

function mapLegacyWidthToRatio(width: PortfolioSectionWidth | undefined) {
  switch (width) {
    case "half":
      return 0.5;
    case "third":
      return 1 / 3;
    case "two-thirds":
      return 2 / 3;
    case "full":
    default:
      return 1;
  }
}

export function normalizeExternalUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (/^mailto:/i.test(trimmedValue) || /^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
    return `mailto:${trimmedValue}`;
  }

  return `https://${trimmedValue.replace(/^\/+/, "")}`;
}

export function createEmptyOverrides(
  initialAppearance: Partial<PortfolioAppearance> = {},
): PortfolioOverrides {
  return {
    hero: {
      imageUrl: "",
      headline: "",
      headlineSuggestion: "",
      subheadline: "",
      subheadlineSuggestion: "",
    },
    about: {
      title: "",
      description: "",
    },
    aboutSuggestion: "",
    contact: {
      title: "",
      description: "",
      descriptionSuggestion: "",
      customText: "",
      email: "",
      phone: "",
    },
    professional: {
      title: "Career / Professional Info",
      titleSuggestion: "",
      summary: "",
      summarySuggestion: "",
      company: "",
      location: "",
      availability: "",
      ctaLabels: { ...DEFAULT_CARD_LABELS },
    },
    linksSection: {
      title: "",
      description: "",
      descriptionSuggestion: "",
      linkedIn: "",
      resumeUrl: "",
      coverLetterUrl: "",
      handshakeUrl: "",
      portfolioUrl: "",
      customLinks: [],
    },
    customSections: [],
    documents: {
      resumeAssetUrl: "",
      resumeFileName: "",
      coverLetterAssetUrl: "",
      coverLetterFileName: "",
    },
    projectOverrides: {},
    layout: {
      sectionOrder: DEFAULT_SECTION_ORDER,
      hiddenSections: [],
      projectOrder: [],
      components: DEFAULT_LAYOUT_COMPONENTS.map((component) => ({ ...component })),
      componentOrder: {},
      hiddenComponentIds: [],
    },
    appearance: {
      ...DEFAULT_APPEARANCE,
      ...initialAppearance,
    },
    aiAccepted: {
      heroHeadline: false,
      heroSubheadline: false,
      aboutDescription: false,
      contactDescription: false,
      professionalTitle: false,
      professionalSummary: false,
      linksDescription: false,
      projectDescriptions: {},
    },
  };
}

function normalizeSectionWidth(
  width: PortfolioSectionWidth | undefined,
  sectionType: PortfolioSectionType,
): PortfolioSectionWidth {
  if (getSectionLayoutRole(sectionType) === "full") {
    return "full";
  }

  if (width === "half" || width === "third" || width === "two-thirds" || width === "full") {
    return width;
  }

  return "full";
}

function normalizeWidthRatio(
  value: number | undefined,
  sectionType: PortfolioSectionType,
  legacyWidth: PortfolioSectionWidth | undefined,
) {
  if (getSectionLayoutRole(sectionType) === "full") {
    return 1;
  }

  const fallback = mapLegacyWidthToRatio(legacyWidth);
  const candidate = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(1, Math.max(SECTION_MIN_WIDTH_RATIO, candidate));
}

function normalizeRowId(value: string | undefined, fallback: string) {
  return value?.trim() ? value : fallback;
}

export function buildLayoutComponents(
  sectionOrder: PortfolioSectionId[] = DEFAULT_SECTION_ORDER,
  hiddenSections: PortfolioSectionId[] = [],
) {
  const hidden = new Set(hiddenSections);
  const ordered = normalizeSectionOrder(sectionOrder);
  const seen = new Set<string>();
  const components: PortfolioCanvasComponent[] = [];

  for (const sectionId of ordered) {
    if (seen.has(sectionId)) {
      continue;
    }

    seen.add(sectionId);
    components.push({
      id: sectionId,
      type: sectionId,
      visible: !hidden.has(sectionId),
      rowId: sectionId,
      width: "full",
      widthRatio: 1,
    });
  }

  for (const defaultComponent of DEFAULT_LAYOUT_COMPONENTS) {
    if (seen.has(defaultComponent.id)) {
      continue;
    }

    components.push({
      ...defaultComponent,
      visible: defaultComponent.type === "custom" ? true : !hidden.has(defaultComponent.type),
      widthRatio: normalizeWidthRatio(defaultComponent.widthRatio, defaultComponent.type, defaultComponent.width),
    });
  }

  return components;
}

export function normalizeLayoutComponents(
  components: PortfolioCanvasComponent[],
  sectionOrder: PortfolioSectionId[] = DEFAULT_SECTION_ORDER,
  hiddenSections: PortfolioSectionId[] = [],
) {
  if (!components.length) {
    return buildLayoutComponents(sectionOrder, hiddenSections);
  }

  const validTypes = new Set<PortfolioSectionType>([...DEFAULT_SECTION_ORDER, "custom"]);
  const seenTypes = new Set<PortfolioSectionId>();
  const normalized: PortfolioCanvasComponent[] = [];
  const seenIds = new Set<string>();

  for (const component of components) {
    if (!validTypes.has(component.type)) {
      continue;
    }

    if (component.type !== "custom" && seenTypes.has(component.type)) {
      continue;
    }

    if (seenIds.has(component.id)) {
      continue;
    }

    if (component.type !== "custom") {
      seenTypes.add(component.type);
    }

    seenIds.add(component.id);
    normalized.push({
      id: component.id || component.type,
      type: component.type,
      visible: component.visible,
      rowId: normalizeRowId(component.rowId, component.id || component.type),
      width: normalizeSectionWidth(component.width, component.type),
      widthRatio: normalizeWidthRatio(component.widthRatio, component.type, component.width),
      title: component.title?.trim() || undefined,
    });
  }

  for (const fallbackComponent of buildLayoutComponents(sectionOrder, hiddenSections)) {
    if (fallbackComponent.type !== "custom" && seenTypes.has(fallbackComponent.type)) {
      continue;
    }

    normalized.push(fallbackComponent);
  }

  const rows = normalized.reduce<Array<{ id: string; items: PortfolioCanvasComponent[] }>>((acc, component) => {
    const rowId =
      !canSectionShareRow(component) || component.widthRatio === 1
        ? component.id
        : normalizeRowId(component.rowId, component.id || component.type);
    const existing = acc.find((row) => row.id === rowId);

    if (existing) {
      existing.items.push(component);
    } else {
      acc.push({ id: rowId, items: [component] });
    }

    return acc;
  }, []);

  return rows.flatMap((row) => {
    const nextComponents: PortfolioCanvasComponent[] = [];
    const queue = [...row.items];

    while (queue.length > 0) {
      const current = queue.shift();

      if (!current) {
        continue;
      }

      if (!canSectionShareRow(current)) {
        nextComponents.push({
          ...current,
          rowId: current.id,
          width: "full",
          widthRatio: 1,
        });
        continue;
      }

      const sibling = queue[0];

      if (!sibling || !canSectionsShareRow(current, sibling)) {
        nextComponents.push({
          ...current,
          rowId: current.id,
          width: "full",
          widthRatio: 1,
        });
        continue;
      }

      queue.shift();

      const rowId = normalizeRowId(current.rowId, current.id || current.type);
      const defaultLeftRatio = getDefaultRowWidthRatio(current, sibling);
      const snappedLeftRatio = snapRowWidthRatio(
        typeof current.widthRatio === "number" && Number.isFinite(current.widthRatio)
          ? current.widthRatio
          : defaultLeftRatio,
        current,
        sibling,
      );

      nextComponents.push(
        {
          ...current,
          rowId,
          width: undefined,
          widthRatio: snappedLeftRatio,
        },
        {
          ...sibling,
          rowId,
          width: undefined,
          widthRatio: 1 - snappedLeftRatio,
        },
      );
    }

    return nextComponents;
  });
}

export function getSectionOrderFromComponents(components: PortfolioCanvasComponent[]) {
  return normalizeSectionOrder(
    components
      .map((component) => component.type)
      .filter((type): type is PortfolioSectionId => DEFAULT_SECTION_ORDER.includes(type as PortfolioSectionId)),
  );
}

export function getHiddenSectionsFromComponents(components: PortfolioCanvasComponent[]) {
  return components
    .filter((component) => !component.visible)
    .map((component) => component.type)
    .filter((type): type is PortfolioSectionId => DEFAULT_SECTION_ORDER.includes(type as PortfolioSectionId));
}

export function normalizeComponentOrderRecord(
  value: PortfolioCanvasComponentOrder | null | undefined,
) {
  if (!value) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string[]] => Array.isArray(entry[1]))
      .map(([key, ids]) => [
        key,
        Array.from(new Set(ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0))),
      ]),
  );
}

export function normalizeHiddenComponentIds(ids: string[] | null | undefined) {
  if (!ids) {
    return [];
  }

  return Array.from(new Set(ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0)));
}

export function orderCanvasChildIds(
  defaultIds: string[],
  savedOrder: string[] | null | undefined,
) {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const id of savedOrder ?? []) {
    if (!defaultIds.includes(id) || seen.has(id)) {
      continue;
    }

    seen.add(id);
    ordered.push(id);
  }

  for (const id of defaultIds) {
    if (seen.has(id)) {
      continue;
    }

    seen.add(id);
    ordered.push(id);
  }

  return ordered;
}

export function resolveTextField(
  generated: string,
  override: string,
  acceptedAi = false,
): ResolvedField {
  const trimmedOverride = override.trim();

  if (trimmedOverride) {
    return {
      value: trimmedOverride,
      source: acceptedAi ? ("ai" as const) : ("user" as const),
    };
  }

  return {
    value: generated,
    source: "github" as const,
  };
}

export function resolveProjectImage(
  repository: PreviewRepository,
  overrides: PortfolioOverrides,
): ResolvedPreviewRepository["resolvedImage"] {
  const hideImage = overrides.projectOverrides[repository.name]?.hideImage;

  if (hideImage) {
    return null;
  }

  const manualImageUrl = overrides.projectOverrides[repository.name]?.imageUrl?.trim();

  if (manualImageUrl) {
    return {
      url: manualImageUrl,
      alt: `${repository.name} manual preview`,
      source: "user",
    };
  }

  return repository.image;
}

export function buildResolvedLinks(
  baseLinks: PreviewLink[],
  overrides: PortfolioOverrides,
) {
  const resolvedLinks: ResolvedPreviewLink[] = baseLinks.map((link) => ({
    ...link,
    source: "github",
  }));

  const addUserLink = (label: string, href: string) => {
    const normalizedHref = normalizeExternalUrl(href);

    if (!normalizedHref) {
      return;
    }

    resolvedLinks.push({
      label,
      href: normalizedHref,
      source: "user",
    });
  };

  addUserLink(DEFAULT_CARD_LABELS.portfolio, overrides.linksSection.portfolioUrl);
  addUserLink(DEFAULT_CARD_LABELS.linkedIn, overrides.linksSection.linkedIn);
  addUserLink(DEFAULT_CARD_LABELS.handshake, overrides.linksSection.handshakeUrl);

  for (const link of overrides.linksSection.customLinks) {
    if (!link.label.trim() || !link.href.trim()) {
      continue;
    }

    addUserLink(link.label.trim(), link.href.trim());
  }

  return resolvedLinks;
}

export function buildProfessionalActions(
  preview: GeneratePreviewResponse | null,
  overrides: PortfolioOverrides,
): ResolvedProfessionalAction[] {
  const actions: ResolvedProfessionalAction[] = [];

  const addAction = (
    id: ResolvedProfessionalAction["id"],
    label: string,
    href: string,
    source: ResolvedProfessionalAction["source"],
  ) => {
    const normalizedHref = normalizeExternalUrl(href);

    if (!normalizedHref) {
      return;
    }

    actions.push({
      id,
      label: label.trim(),
      href: normalizedHref,
      source,
    });
  };

  addAction("github", PROFESSIONAL_ACTION_LABELS.github, preview?.profile.url ?? "", "github");
  addAction(
    "resume",
    PROFESSIONAL_ACTION_LABELS.resume,
    overrides.documents.resumeAssetUrl || overrides.linksSection.resumeUrl,
    "user",
  );
  addAction(
    "coverLetter",
    PROFESSIONAL_ACTION_LABELS.coverLetter,
    overrides.documents.coverLetterAssetUrl || overrides.linksSection.coverLetterUrl,
    "user",
  );
  addAction(
    "handshake",
    PROFESSIONAL_ACTION_LABELS.handshake,
    overrides.linksSection.handshakeUrl,
    "user",
  );
  addAction(
    "linkedIn",
    PROFESSIONAL_ACTION_LABELS.linkedIn,
    overrides.linksSection.linkedIn,
    "user",
  );
  addAction(
    "portfolio",
    PROFESSIONAL_ACTION_LABELS.portfolio,
    overrides.linksSection.portfolioUrl,
    "user",
  );
  addAction("email", PROFESSIONAL_ACTION_LABELS.email, overrides.contact.email, "user");
  addAction("phone", PROFESSIONAL_ACTION_LABELS.phone, overrides.contact.phone, "user");

  return actions.filter((action) => action.label);
}

export function buildResolvedRepositories(
  repositories: PreviewRepository[],
  overrides: PortfolioOverrides,
) {
  const orderedRepositories = [...repositories].sort((left, right) => {
    const leftIndex = overrides.layout.projectOrder.indexOf(left.name);
    const rightIndex = overrides.layout.projectOrder.indexOf(right.name);

    if (leftIndex === -1 && rightIndex === -1) {
      return 0;
    }

    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  });

  return orderedRepositories.map((repository) => {
    const projectOverride = overrides.projectOverrides[repository.name];
    const resolvedDescription = resolveTextField(
      repository.description,
      projectOverride?.description ?? "",
      projectOverride?.acceptedAi ?? false,
    );

    return {
      ...repository,
      description: resolvedDescription.value,
      descriptionSource: resolvedDescription.source,
      resolvedImage: resolveProjectImage(repository, overrides),
    };
  });
}

export function applyEnhancementToOverrides(
  current: PortfolioOverrides,
  enhancement: PortfolioEnhancement,
  repositories: PreviewRepository[],
): PortfolioOverrides {
  const nextProjectOverrides = { ...current.projectOverrides };
  const projectSuggestions = new Map(
    enhancement.featuredProjectDescriptions.map((project) => [
      project.name.trim().toLowerCase(),
      project.description.trim(),
    ]),
  );

  for (const repository of repositories) {
    const existingOverride = nextProjectOverrides[repository.name] ?? {
      imageUrl: "",
      hideImage: false,
      description: "",
      descriptionSuggestion: "",
      acceptedAi: false,
    };
    const suggestedDescription =
      projectSuggestions.get(repository.name.trim().toLowerCase()) ?? "";

    nextProjectOverrides[repository.name] = {
      ...existingOverride,
      descriptionSuggestion: suggestedDescription,
    };
  }

  return {
    ...current,
    hero: {
      ...current.hero,
      headlineSuggestion: enhancement.heroHeadline.trim(),
      subheadlineSuggestion: enhancement.heroSubheadline.trim(),
    },
    aboutSuggestion: enhancement.aboutMe.trim(),
    professional: {
      ...current.professional,
      titleSuggestion: enhancement.professionalTitle.trim(),
      summarySuggestion: enhancement.professionalSummary.trim(),
    },
    contact: {
      ...current.contact,
      descriptionSuggestion: enhancement.contactIntro.trim(),
    },
    linksSection: {
      ...current.linksSection,
      descriptionSuggestion: enhancement.linksIntro.trim(),
    },
    projectOverrides: nextProjectOverrides,
  };
}

export function buildFinalPortfolio(
  preview: GeneratePreviewResponse | null,
  overrides: PortfolioOverrides,
  fallbacks: {
    theme: PreviewTheme;
    hero: PreviewHero;
    about: PreviewAbout;
    contact: PreviewSection;
    linksSection: PreviewSection;
    repositories: PreviewRepository[];
    links: PreviewLink[];
    techStack: string[];
  },
): FinalPortfolio {
  const layoutComponents = normalizeLayoutComponents(
    overrides.layout.components,
    overrides.layout.sectionOrder,
    overrides.layout.hiddenSections,
  );
  const componentOrder = normalizeComponentOrderRecord(overrides.layout.componentOrder);
  const hiddenComponentIds = normalizeHiddenComponentIds(overrides.layout.hiddenComponentIds);
  const appearance = {
    ...DEFAULT_APPEARANCE,
    ...overrides.appearance,
  };
  const theme =
    applyCustomPaletteToTheme(
      overrides.appearance.themeId.trim()
        ? getPortfolioThemeById(overrides.appearance.themeId)
        : preview?.theme ?? fallbacks.theme,
      overrides.appearance.customPalette,
    );
  const baseHero = preview?.hero ?? fallbacks.hero;
  const baseAbout = preview?.about ?? fallbacks.about;
  const baseContact = preview?.contact ?? fallbacks.contact;
  const baseLinksSection = preview?.linksSection ?? fallbacks.linksSection;
  const baseRepositories = preview?.featuredRepositories ?? fallbacks.repositories;
  const baseLinks = preview?.links ?? fallbacks.links;
  const repositories = buildResolvedRepositories(baseRepositories, overrides);
  const links = preview
    ? buildResolvedLinks(baseLinks, overrides)
    : [
        ...baseLinks.map((link) => ({ ...link, source: "github" as const })),
        ...buildManualOnlyLinks(overrides),
      ];
  const techStack = preview?.techStack ?? fallbacks.techStack;
  const heroHeadline = resolveTextField(
    baseHero.headline,
    overrides.hero.headline,
    overrides.aiAccepted.heroHeadline,
  );
  const heroSubheadline = resolveTextField(
    baseHero.subheadline,
    overrides.hero.subheadline,
    overrides.aiAccepted.heroSubheadline,
  );
  const aboutTitle = resolveTextField(baseAbout.title, overrides.about.title);
  const aboutDescription = resolveTextField(
    baseAbout.description,
    overrides.about.description,
    overrides.aiAccepted.aboutDescription,
  );
  const contactTitle = resolveTextField(baseContact.title, overrides.contact.title);
  const contactDescription = resolveTextField(
    baseContact.description,
    overrides.contact.description,
    overrides.aiAccepted.contactDescription,
  );
  const linksTitle = resolveTextField(baseLinksSection.title, overrides.linksSection.title);
  const linksDescription = resolveTextField(
    baseLinksSection.description,
    overrides.linksSection.description,
  );
  const contactEmail = overrides.contact.email.trim();
  const contactEmailHref = normalizeExternalUrl(contactEmail);
  const contactPhone = overrides.contact.phone.trim();
  const contactPhoneHref = contactPhone ? `tel:${contactPhone.replace(/[^\d+]/g, "")}` : "";
  const manualCompany = overrides.professional.company.trim();
  const manualLocation = overrides.professional.location.trim();
  const professionalActions = buildProfessionalActions(preview, overrides);
  const customSections = overrides.customSections.map((section) => ({
    id: section.id,
    title: resolveTextField(section.title || "Custom section", section.title),
    description: resolveTextField(section.description, section.description),
    imageUrl: section.imageUrl.trim(),
    cards: section.cards.map((card) => ({
      id: card.id,
      title: resolveTextField(card.title || "Card", card.title),
      description: resolveTextField(card.description, card.description),
    })),
  }));

  return {
    theme,
    appearance,
    layout: {
      sectionOrder: getSectionOrderFromComponents(layoutComponents),
      hiddenSections: dedupeSectionIds(getHiddenSectionsFromComponents(layoutComponents)),
      components: layoutComponents,
      componentOrder,
      hiddenComponentIds,
    },
    profile: preview?.profile ?? null,
    summary: preview?.summary ?? "Generated profile summary will appear here.",
    hero: {
      name: preview?.profile.name ?? fallbacks.hero.name,
      imageUrl: overrides.hero.imageUrl.trim() || preview?.profile.avatarUrl || "",
      headline: heroHeadline,
      subheadline: heroSubheadline,
      ctaLabel: baseHero.ctaLabel,
      profileLink: preview?.profile.url ?? "https://github.com",
    },
    about: {
      title: aboutTitle,
      description: aboutDescription,
    },
    contact: {
      title: contactTitle,
      description: contactDescription,
      customText: overrides.contact.customText.trim(),
      email: contactEmail,
      emailHref: contactEmailHref,
      phone: contactPhone,
      phoneHref: contactPhoneHref,
    },
    professional: {
      title: overrides.professional.title.trim() || "Career / Professional Info",
      summary: overrides.professional.summary.trim(),
      company: manualCompany,
      location: manualLocation,
      availability: overrides.professional.availability.trim(),
      actions: professionalActions,
    },
    linksSection: {
      title: linksTitle,
      description: linksDescription,
      links,
    },
    customSections,
    repositories,
    techStack,
    hasBio: Boolean(preview?.profile.bio),
  };
}

function buildManualOnlyLinks(overrides: PortfolioOverrides): ResolvedPreviewLink[] {
  const links: ResolvedPreviewLink[] = [];

  const addLink = (label: string, href: string) => {
    const normalizedHref = normalizeExternalUrl(href);

    if (!normalizedHref) {
      return;
    }

    links.push({
      label,
      href: normalizedHref,
      source: "user",
    });
  };

  addLink(DEFAULT_CARD_LABELS.portfolio, overrides.linksSection.portfolioUrl);
  addLink(DEFAULT_CARD_LABELS.linkedIn, overrides.linksSection.linkedIn);
  addLink(DEFAULT_CARD_LABELS.handshake, overrides.linksSection.handshakeUrl);

  for (const link of overrides.linksSection.customLinks) {
    if (!link.label.trim() || !link.href.trim()) {
      continue;
    }

    addLink(link.label, link.href);
  }

  return links;
}

export function normalizeSectionOrder(sectionOrder: PortfolioSectionId[]) {
  const normalized = dedupeSectionIds(sectionOrder).filter((sectionId) =>
    DEFAULT_SECTION_ORDER.includes(sectionId),
  );

  for (const sectionId of DEFAULT_SECTION_ORDER) {
    if (!normalized.includes(sectionId)) {
      normalized.push(sectionId);
    }
  }

  return normalized;
}

function dedupeSectionIds(sectionIds: PortfolioSectionId[]) {
  return Array.from(new Set(sectionIds));
}
