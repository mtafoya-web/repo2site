import type {
  PortfolioOverrides,
  PortfolioSectionType,
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
  {
    name: "featured-repo-2",
    description: "A placeholder project summary.",
    language: "JavaScript",
    href: "https://github.com/username/featured-repo-2",
    stars: 0,
    image: null,
    readmeImages: [],
    readmeExcerpt: "",
  },
  {
    name: "featured-repo-3",
    description: "A placeholder project summary.",
    language: "Tailwind CSS",
    href: "https://github.com/username/featured-repo-3",
    stars: 0,
    image: null,
    readmeImages: [],
    readmeExcerpt: "",
  },
];

export const FALLBACK_LINKS: PreviewLink[] = [{ label: "GitHub", href: "https://github.com/username" }];
export const FALLBACK_TECH_STACK = ["TypeScript", "Next.js", "Tailwind CSS"];

export const PALETTE_FIELD_LABELS: Record<keyof PreviewTheme["palette"], string> = {
  accent: "Accent",
  accentSoft: "Accent Soft",
  border: "Border",
  chip: "Chip",
  muted: "Muted Text",
  page: "Background",
  pageAccent: "Background Accent",
  surface: "Surface",
  surfaceStrong: "Strong Surface",
  text: "Text",
};

export const SECTION_CONTENT_HINTS: Record<PortfolioSectionType, string> = {
  hero: "Edit the opening message, actions, and visual treatment directly in the canvas to shape the first impression.",
  about: "Use this section for context and positioning. Keep it concise, specific, and easy to scan.",
  professional:
    "Fine-tune your role framing, summary, and availability here to make the portfolio feel intentional instead of auto-generated.",
  projects:
    "Reorder projects, swap the featured project, and rewrite summaries so the strongest work leads the story.",
  links: "Add the links you actually want recruiters to click. Resume, LinkedIn, portfolio, and supporting docs work best here.",
  contact: "Keep contact options clear and low-friction. A short note plus one or two reliable channels is usually enough.",
  custom: "Use custom sections for awards, testimonials, writing, speaking, or anything that makes the portfolio feel more complete.",
};

export function createLinkId() {
  return `link-${Math.random().toString(36).slice(2, 10)}`;
}

export function getInitialPortfolioColorMode(): PortfolioOverrides["appearance"]["colorMode"] {
  return "dark";
}

export function buildShareSlug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "portfolio"
  );
}

export function createCustomSectionId() {
  return `custom-${Math.random().toString(36).slice(2, 10)}`;
}

export function createCustomSectionBlockId() {
  return `custom-block-${Math.random().toString(36).slice(2, 10)}`;
}

export function createCustomProjectId() {
  return `project-${Math.random().toString(36).slice(2, 10)}`;
}

export function createLayoutRowId() {
  return `row-${Math.random().toString(36).slice(2, 10)}`;
}
