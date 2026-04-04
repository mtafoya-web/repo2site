export type GitHubProfileInfo = {
  username: string;
  url: string;
  name: string;
  bio: string;
  avatarUrl: string;
  location: string;
  company: string;
  blog: string;
  followers: number;
  following: number;
  publicRepos: number;
};

export type GitHubRepo = {
  id: number;
  name: string;
  fullName: string;
  description: string;
  htmlUrl: string;
  homepage: string;
  stargazersCount: number;
  forksCount: number;
  language: string;
  topics: string[];
  updatedAt: string;
  isFork: boolean;
  isArchived: boolean;
};

export type PreviewHero = {
  name: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
};

export type PreviewAbout = {
  title: string;
  description: string;
};

export type PreviewSection = {
  title: string;
  description: string;
};

export type PreviewProjectImage = {
  url: string;
  alt: string;
  source: "readme";
};

export type PreviewRepository = {
  name: string;
  description: string;
  language: string;
  href: string;
  origin?: "github" | "custom";
  stars: number;
  image: PreviewProjectImage | null;
  readmeImages: string[];
  readmeExcerpt: string;
};

export type PreviewLink = {
  label: string;
  href: string;
};

export type ProfessionalCtaLabels = {
  resume: string;
  coverLetter: string;
  handshake: string;
  linkedIn: string;
  portfolio: string;
  email: string;
  phone: string;
};

export type PortfolioOverrideLink = {
  id: string;
  label: string;
  href: string;
};

export type PortfolioCustomProject = {
  id: string;
  name: string;
  description: string;
  language: string;
  href: string;
  imageUrl: string;
};

export type PortfolioCustomSectionBlockType = "text" | "image";
export type PortfolioCustomSectionBlockWidth = "full" | "half";

export type PortfolioCustomSectionBlock = {
  id: string;
  type: PortfolioCustomSectionBlockType;
  width: PortfolioCustomSectionBlockWidth;
  label: string;
  title: string;
  text: string;
  imageUrl: string;
};

export type PortfolioCustomSection = {
  id: string;
  title: string;
  description: string;
  blocks: PortfolioCustomSectionBlock[];
};

export type PortfolioSectionId =
  | "hero"
  | "about"
  | "professional"
  | "projects"
  | "contact"
  | "links";

export type PortfolioSectionType = PortfolioSectionId | "custom";
export type PortfolioSectionWidth = "full" | "half" | "third" | "two-thirds";

export type PortfolioCanvasComponent = {
  id: string;
  type: PortfolioSectionType;
  visible: boolean;
  rowId?: string;
  width?: PortfolioSectionWidth;
  widthRatio?: number;
  title?: string;
};

export type PortfolioCanvasComponentOrder = Record<string, string[]>;

export type PortfolioDensity = "compact" | "spacious";
export type PortfolioSectionLayout = "split" | "stacked";
export type PortfolioCardStyle = "soft" | "outlined" | "elevated";
export type PortfolioColorMode = "light" | "dark";
export type PortfolioProjectsLayoutMode = "side-by-side" | "stacked" | "hybrid";
export type PortfolioProjectsOverflowSize = "compact" | "expanded";

export type PortfolioAppearance = {
  themeId: string;
  colorMode: PortfolioColorMode;
  density: PortfolioDensity;
  sectionLayout: PortfolioSectionLayout;
  projectsLayout: PortfolioProjectsLayoutMode;
  projectsOverflowSize: PortfolioProjectsOverflowSize;
  cardStyle: PortfolioCardStyle;
  customPalette?: Partial<PreviewTheme["palette"]>;
};

export type PortfolioOverrides = {
  hero: {
    imageUrl: string;
    headline: string;
    headlineSuggestion: string;
    subheadline: string;
    subheadlineSuggestion: string;
  };
  about: PreviewAbout;
  aboutSuggestion: string;
  contact: {
    title: string;
    description: string;
    descriptionSuggestion: string;
    customText: string;
    email: string;
    phone: string;
  };
  professional: {
    title: string;
    titleSuggestion: string;
    summary: string;
    summarySuggestion: string;
    company: string;
    location: string;
    availability: string;
    ctaLabels: ProfessionalCtaLabels;
  };
  linksSection: {
    title: string;
    description: string;
    descriptionSuggestion: string;
    linkedIn: string;
    resumeUrl: string;
    coverLetterUrl: string;
    handshakeUrl: string;
    portfolioUrl: string;
      customLinks: PortfolioOverrideLink[];
  };
  customSections: PortfolioCustomSection[];
  customProjects: PortfolioCustomProject[];
  documents: {
    resumeAssetUrl: string;
    resumeFileName: string;
    coverLetterAssetUrl: string;
    coverLetterFileName: string;
  };
  projectOverrides: Record<
    string,
    {
      imageUrl: string;
      hideImage: boolean;
      description: string;
      descriptionSuggestion: string;
      acceptedAi: boolean;
    }
  >;
  layout: {
    sectionOrder: PortfolioSectionId[];
    hiddenSections: PortfolioSectionId[];
    projectOrder: string[];
    hiddenProjectNames: string[];
    components: PortfolioCanvasComponent[];
    componentOrder: PortfolioCanvasComponentOrder;
    hiddenComponentIds: string[];
  };
  appearance: PortfolioAppearance;
  aiAccepted: {
    heroHeadline: boolean;
    heroSubheadline: boolean;
    aboutDescription: boolean;
    contactDescription: boolean;
    professionalTitle: boolean;
    professionalSummary: boolean;
    linksDescription: boolean;
    projectDescriptions: Record<string, boolean>;
  };
};

export type PreviewTheme = {
  id: string;
  name: string;
  reason: string;
  palette: {
    page: string;
    pageAccent: string;
    surface: string;
    surfaceStrong: string;
    border: string;
    text: string;
    muted: string;
    accent: string;
    accentSoft: string;
    chip: string;
  };
};

export type GeneratePreviewResponse = {
  profile: GitHubProfileInfo;
  summary: string;
  hero: PreviewHero;
  about: PreviewAbout;
  contact: PreviewSection;
  linksSection: PreviewSection;
  featuredRepositories: PreviewRepository[];
  techStack: string[];
  links: PreviewLink[];
  theme: PreviewTheme;
  promptSeed: string;
};

export type PortfolioEnhancement = {
  heroHeadline: string;
  heroSubheadline: string;
  aboutMe: string;
  professionalTitle: string;
  professionalSummary: string;
  contactIntro: string;
  linksIntro: string;
  featuredProjectDescriptions: Array<{
    name: string;
    description: string;
  }>;
};

export type EnrichmentSourceType =
  | "personal-website"
  | "portfolio-website"
  | "resume"
  | "cover-letter"
  | "linkedin"
  | "handshake"
  | "custom-profile"
  | "local-resume"
  | "local-cover-letter";

export type EnrichmentSuggestionField =
  | "hero.headline"
  | "hero.subheadline"
  | "about.description"
  | "professional.summary"
  | "professional.company"
  | "professional.location"
  | "professional.availability"
  | "contact.email"
  | "contact.phone"
  | "linksSection.resumeUrl"
  | "linksSection.coverLetterUrl"
  | "linksSection.linkedIn"
  | "linksSection.handshakeUrl"
  | "linksSection.portfolioUrl"
  | "linksSection.customLink";

export type EnrichmentSuggestion = {
  id: string;
  field: EnrichmentSuggestionField;
  label: string;
  value: string;
  sourceType: EnrichmentSourceType;
  sourceUrl: string;
  sourceLabel: string;
  note?: string;
  auxiliaryLabel?: string;
};

export type EnrichmentSourceResult = {
  sourceUrl: string;
  sourceName?: string;
  sourceType: EnrichmentSourceType;
  sourceLabel: string;
  pageTitle: string;
  suggestions: EnrichmentSuggestion[];
  notes: string[];
  images: string[];
  warnings: string[];
  status: "success" | "failed";
  failureReason?: string;
};
