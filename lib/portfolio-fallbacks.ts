import { buildFinalPortfolio, createEmptyOverrides } from "@/lib/portfolio";
import type {
  FinalPortfolio,
} from "@/lib/portfolio";
import type {
  GeneratePreviewResponse,
  PortfolioOverrides,
  PreviewAbout,
  PreviewHero,
  PreviewLink,
  PreviewRepository,
  PreviewSection,
  PreviewTheme,
} from "@/lib/types";

export const FALLBACK_THEME: PreviewTheme = {
  id: "builder-blue",
  name: "Builder Blue",
  reason: "Default theme while no profile data is loaded.",
  palette: {
    page: "#f6f8fc",
    pageAccent: "rgba(96, 165, 250, 0.16)",
    surface: "rgba(255,255,255,0.88)",
    surfaceStrong: "#ffffff",
    border: "rgba(148, 163, 184, 0.28)",
    text: "#0f172a",
    muted: "#475569",
    accent: "#2563eb",
    accentSoft: "rgba(37, 99, 235, 0.12)",
    chip: "#e0ecff",
  },
};

export const FALLBACK_HERO: PreviewHero = {
  name: "Your Name",
  headline: "A concise profile headline generated from GitHub data will appear here.",
  subheadline:
    "Load a public GitHub profile to generate the starting draft, then refine it manually in edit mode.",
  ctaLabel: "View GitHub Profile",
};

export const FALLBACK_ABOUT: PreviewAbout = {
  title: "About Me",
  description:
    "Profile bio, focus areas, and public contribution context will appear here once a profile is generated.",
};

export const FALLBACK_CONTACT: PreviewSection = {
  title: "Contact",
  description: "Add direct contact details and a custom note to make the portfolio feel more personal.",
};

export const FALLBACK_LINKS_SECTION: PreviewSection = {
  title: "Links",
  description: "GitHub-derived links show up here first, and edit mode can extend them with your own links.",
};

export const FALLBACK_REPOSITORIES: PreviewRepository[] = [
  {
    name: "featured-repo-1",
    description: "A placeholder project summary.",
    language: "TypeScript",
    href: "https://github.com/username/featured-repo-1",
    stars: 0,
    image: null,
    readmeImages: [],
    readmeExcerpt: "",
  },
];

export const FALLBACK_LINKS: PreviewLink[] = [{ label: "GitHub", href: "https://github.com/username" }];
export const FALLBACK_TECH_STACK = ["TypeScript", "Next.js", "Tailwind CSS"];

export function buildPortfolioFromSnapshot(
  preview: GeneratePreviewResponse,
  overrides: PortfolioOverrides = createEmptyOverrides(),
): FinalPortfolio {
  return buildFinalPortfolio(preview, overrides, {
    theme: FALLBACK_THEME,
    hero: FALLBACK_HERO,
    about: FALLBACK_ABOUT,
    contact: FALLBACK_CONTACT,
    linksSection: FALLBACK_LINKS_SECTION,
    repositories: FALLBACK_REPOSITORIES,
    links: FALLBACK_LINKS,
    techStack: FALLBACK_TECH_STACK,
  });
}
