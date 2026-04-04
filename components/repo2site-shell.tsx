"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type {
  ChangeEvent,
  CSSProperties,
  DragEvent,
  FormEvent,
  MouseEvent,
  PointerEvent,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { Fragment, useEffect, useRef, useState } from "react";
import { useAppTheme } from "@/components/app-theme-provider";
import { useRepo2SiteCompanion } from "@/components/repo2site-companion-dock";
import {
  Repo2SiteGuidedTour,
  Repo2SiteWalkthroughLauncher,
} from "@/components/repo2site-guided-tour";
import { useRepo2SiteWalkthrough } from "@/hooks/use-repo2site-walkthrough";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { buildAppThemeStyles } from "@/lib/app-theme";
import { reportClientError } from "@/lib/monitoring";
import {
  SECTION_MIN_WIDTH_RATIO,
  DEFAULT_CARD_LABELS,
  DEFAULT_SECTION_ORDER,
  applyEnhancementToOverrides,
  buildFinalPortfolio,
  buildLayoutComponents,
  canSectionShareRow,
  canSectionsShareRow,
  createEmptyOverrides,
  getCanvasSectionWidthRatio,
  getAllowedRowWidthRatios,
  getHiddenSectionsFromComponents,
  getSectionOrderFromComponents,
  normalizeExternalUrl,
  normalizeLayoutComponents,
  orderCanvasChildIds,
  snapRowWidthRatio,
} from "@/lib/portfolio";
import type { ContentSource, ResolvedPreviewRepository } from "@/lib/portfolio";
import { applyTemplateRecord, buildTemplatePreset } from "@/lib/template-presets";
import { PORTFOLIO_THEMES } from "@/lib/themes";
import { WALKTHROUGH_TARGET_ATTRIBUTE } from "@/lib/repo2site-walkthrough";
import type {
  EnrichmentSourceResult,
  EnrichmentSuggestion,
  GeneratePreviewResponse,
  PortfolioCanvasComponent,
  PortfolioEnhancement,
  PortfolioOverrides,
  PortfolioSectionId,
  PortfolioSectionType,
  PreviewAbout,
  PreviewHero,
  PreviewLink,
  PreviewRepository,
  PreviewSection,
  PreviewTheme,
} from "@/lib/types";

type AuthSummary = {
  provider: "github";
  username: string;
  displayName: string;
  avatarUrl: string;
  profileUrl: string;
} | null;

const SAMPLE_URL = "https://github.com/vercel";

const FALLBACK_THEME: PreviewTheme = {
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

const FALLBACK_HERO: PreviewHero = {
  name: "Your Name",
  headline: "A concise profile headline generated from GitHub data will appear here.",
  subheadline:
    "Load a public GitHub profile to generate the starting draft, then refine it manually in edit mode.",
  ctaLabel: "View GitHub Profile",
};

const FALLBACK_ABOUT: PreviewAbout = {
  title: "About Me",
  description:
    "Profile bio, focus areas, and public contribution context will appear here once a profile is generated.",
};

const FALLBACK_CONTACT: PreviewSection = {
  title: "Contact",
  description: "Add direct contact details and a custom note to make the portfolio feel more personal.",
};

const FALLBACK_LINKS_SECTION: PreviewSection = {
  title: "Links",
  description: "GitHub-derived links show up here first, and edit mode can extend them with your own links.",
};

const FALLBACK_REPOSITORIES: PreviewRepository[] = [
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

const SECTION_RESIZE_HANDLE_HIT_WIDTH = 22;

const FALLBACK_LINKS: PreviewLink[] = [{ label: "GitHub", href: "https://github.com/username" }];
const FALLBACK_TECH_STACK = ["TypeScript", "Next.js", "Tailwind CSS"];

function toCanvasKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

const TECH_ICON_ALIASES: Record<string, string> = {
  "c#": "csharp",
  "c++": "cplusplus",
  css: "css3",
  dockerfile: "docker",
  expressjs: "express",
  "github actions": "github",
  golang: "go",
  html: "html5",
  javascript: "javascript",
  "js": "javascript",
  mongodb: "mongo",
  "next": "nextjs",
  "next.js": "nextjs",
  "nextjs": "nextjs",
  "node": "nodejs",
  "node.js": "nodejs",
  postgres: "postgresql",
  "react.js": "react",
  "tailwind css": "tailwind",
  tailwindcss: "tailwind",
  ts: "typescript",
  typescript: "typescript",
};

const TECH_ICONS: Record<
  string,
  {
    accent: string;
    label: string;
    shortLabel: string;
  }
> = {
  aws: { accent: "#FF9900", label: "AWS", shortLabel: "AWS" },
  cplusplus: { accent: "#00599C", label: "C++", shortLabel: "C+" },
  csharp: { accent: "#512BD4", label: "C#", shortLabel: "C#" },
  css3: { accent: "#1572B6", label: "CSS", shortLabel: "CSS" },
  docker: { accent: "#2496ED", label: "Docker", shortLabel: "DK" },
  express: { accent: "#6B7280", label: "Express", shortLabel: "EX" },
  figma: { accent: "#A259FF", label: "Figma", shortLabel: "FG" },
  git: { accent: "#F05032", label: "Git", shortLabel: "GT" },
  github: { accent: "#6E5494", label: "GitHub", shortLabel: "GH" },
  go: { accent: "#00ADD8", label: "Go", shortLabel: "GO" },
  html5: { accent: "#E34F26", label: "HTML", shortLabel: "HTML" },
  java: { accent: "#F89820", label: "Java", shortLabel: "JV" },
  javascript: { accent: "#F7DF1E", label: "JavaScript", shortLabel: "JS" },
  mongo: { accent: "#47A248", label: "MongoDB", shortLabel: "MG" },
  nextjs: { accent: "#111827", label: "Next.js", shortLabel: "N" },
  nodejs: { accent: "#339933", label: "Node.js", shortLabel: "ND" },
  postgresql: { accent: "#4169E1", label: "PostgreSQL", shortLabel: "PG" },
  prisma: { accent: "#2D3748", label: "Prisma", shortLabel: "PR" },
  python: { accent: "#3776AB", label: "Python", shortLabel: "PY" },
  react: { accent: "#61DAFB", label: "React", shortLabel: "RE" },
  rust: { accent: "#DEA584", label: "Rust", shortLabel: "RS" },
  tailwind: { accent: "#06B6D4", label: "Tailwind", shortLabel: "TW" },
  typescript: { accent: "#3178C6", label: "TypeScript", shortLabel: "TS" },
  vercel: { accent: "#000000", label: "Vercel", shortLabel: "VC" },
};

type ThemePreset = {
  lightBackgroundPattern: string;
  darkBackgroundPattern: string;
  lightHeroOverlay: string;
  darkHeroOverlay: string;
  lightNavOverlay: string;
  darkNavOverlay: string;
  lightSectionTone: string;
  darkSectionTone: string;
  cardGlow: string;
  lightProjectSurface: string;
  darkProjectSurface: string;
  projectInset: string;
  headlineWeight: "600" | "700";
};

function getThemePreset(themeId: string): ThemePreset {
  if (themeId === "systems-green") {
    return {
      lightBackgroundPattern:
        "linear-gradient(140deg, rgba(22, 101, 52, 0.14), transparent 45%), repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(22, 101, 52, 0.05) 28px, rgba(22, 101, 52, 0.05) 29px)",
      darkBackgroundPattern:
        "linear-gradient(145deg, rgba(22, 101, 52, 0.24), transparent 50%), radial-gradient(circle at 82% 16%, rgba(74, 222, 128, 0.14), transparent 26%)",
      lightHeroOverlay:
        "linear-gradient(135deg, rgba(22, 101, 52, 0.22), rgba(34, 197, 94, 0.08))",
      darkHeroOverlay:
        "linear-gradient(135deg, rgba(22, 101, 52, 0.26), rgba(74, 222, 128, 0.08))",
      lightNavOverlay:
        "linear-gradient(135deg, rgba(21, 128, 61, 0.18), rgba(74, 222, 128, 0.08))",
      darkNavOverlay:
        "linear-gradient(135deg, rgba(21, 128, 61, 0.24), rgba(74, 222, 128, 0.08))",
      lightSectionTone:
        "linear-gradient(180deg, rgba(240, 253, 244, 0.66), rgba(255, 255, 255, 0.85))",
      darkSectionTone:
        "linear-gradient(180deg, rgba(10, 23, 17, 0.96), rgba(12, 28, 20, 0.92))",
      cardGlow: "0 20px 48px -34px rgba(21, 128, 61, 0.72)",
      lightProjectSurface:
        "linear-gradient(160deg, rgba(240, 253, 244, 0.94), rgba(255, 255, 255, 0.98))",
      darkProjectSurface:
        "linear-gradient(160deg, rgba(8, 24, 17, 0.98), rgba(13, 35, 24, 0.96))",
      projectInset: "inset 0 1px 0 rgba(255,255,255,0.75)",
      headlineWeight: "700",
    };
  }

  if (themeId === "editorial-amber") {
    return {
      lightBackgroundPattern:
        "linear-gradient(165deg, rgba(245, 158, 11, 0.2), transparent 45%), radial-gradient(circle at 85% 15%, rgba(194, 65, 12, 0.14), transparent 32%)",
      darkBackgroundPattern:
        "linear-gradient(165deg, rgba(194, 65, 12, 0.24), transparent 50%), radial-gradient(circle at 84% 18%, rgba(251, 191, 36, 0.14), transparent 28%)",
      lightHeroOverlay:
        "linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(194, 65, 12, 0.08))",
      darkHeroOverlay:
        "linear-gradient(135deg, rgba(194, 65, 12, 0.24), rgba(251, 191, 36, 0.08))",
      lightNavOverlay:
        "linear-gradient(135deg, rgba(194, 65, 12, 0.2), rgba(251, 191, 36, 0.1))",
      darkNavOverlay:
        "linear-gradient(135deg, rgba(194, 65, 12, 0.22), rgba(251, 191, 36, 0.08))",
      lightSectionTone:
        "linear-gradient(180deg, rgba(255, 247, 237, 0.72), rgba(255, 255, 255, 0.84))",
      darkSectionTone:
        "linear-gradient(180deg, rgba(38, 21, 10, 0.96), rgba(31, 19, 10, 0.92))",
      cardGlow: "0 20px 48px -34px rgba(194, 65, 12, 0.7)",
      lightProjectSurface:
        "linear-gradient(160deg, rgba(255, 247, 237, 0.96), rgba(255, 253, 248, 0.98))",
      darkProjectSurface:
        "linear-gradient(160deg, rgba(40, 21, 10, 0.98), rgba(30, 19, 12, 0.95))",
      projectInset: "inset 0 1px 0 rgba(255,255,255,0.8)",
      headlineWeight: "600",
    };
  }

  if (themeId === "signal-violet") {
    return {
      lightBackgroundPattern:
        "radial-gradient(circle at 16% 10%, rgba(139, 92, 246, 0.24), transparent 34%), radial-gradient(circle at 84% 24%, rgba(167, 139, 250, 0.18), transparent 34%)",
      darkBackgroundPattern:
        "radial-gradient(circle at 18% 12%, rgba(124, 58, 237, 0.3), transparent 32%), radial-gradient(circle at 82% 20%, rgba(196, 181, 253, 0.14), transparent 28%)",
      lightHeroOverlay:
        "linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(139, 92, 246, 0.08))",
      darkHeroOverlay:
        "linear-gradient(135deg, rgba(124, 58, 237, 0.24), rgba(139, 92, 246, 0.08))",
      lightNavOverlay:
        "linear-gradient(135deg, rgba(124, 58, 237, 0.18), rgba(196, 181, 253, 0.08))",
      darkNavOverlay:
        "linear-gradient(135deg, rgba(124, 58, 237, 0.22), rgba(196, 181, 253, 0.08))",
      lightSectionTone:
        "linear-gradient(180deg, rgba(245, 243, 255, 0.68), rgba(255, 255, 255, 0.86))",
      darkSectionTone:
        "linear-gradient(180deg, rgba(20, 15, 39, 0.96), rgba(16, 12, 32, 0.92))",
      cardGlow: "0 20px 48px -34px rgba(91, 33, 182, 0.78)",
      lightProjectSurface:
        "linear-gradient(160deg, rgba(245, 243, 255, 0.95), rgba(255, 255, 255, 0.98))",
      darkProjectSurface:
        "linear-gradient(160deg, rgba(20, 15, 39, 0.98), rgba(24, 17, 44, 0.96))",
      projectInset: "inset 0 1px 0 rgba(255,255,255,0.78)",
      headlineWeight: "700",
    };
  }

  return {
    lightBackgroundPattern:
      "radial-gradient(circle at 88% 16%, rgba(59, 130, 246, 0.22), transparent 34%), radial-gradient(circle at 10% 4%, rgba(96, 165, 250, 0.16), transparent 30%)",
    darkBackgroundPattern:
      "radial-gradient(circle at 86% 14%, rgba(37, 99, 235, 0.26), transparent 32%), radial-gradient(circle at 12% 6%, rgba(96, 165, 250, 0.12), transparent 28%)",
    lightHeroOverlay:
      "linear-gradient(135deg, rgba(37, 99, 235, 0.22), rgba(37, 99, 235, 0.08))",
    darkHeroOverlay:
      "linear-gradient(135deg, rgba(37, 99, 235, 0.24), rgba(96, 165, 250, 0.08))",
    lightNavOverlay:
      "linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(96, 165, 250, 0.08))",
    darkNavOverlay:
      "linear-gradient(135deg, rgba(37, 99, 235, 0.22), rgba(96, 165, 250, 0.08))",
    lightSectionTone:
      "linear-gradient(180deg, rgba(239, 246, 255, 0.72), rgba(255, 255, 255, 0.86))",
    darkSectionTone:
      "linear-gradient(180deg, rgba(10, 18, 34, 0.96), rgba(11, 21, 40, 0.92))",
    cardGlow: "0 20px 48px -34px rgba(37, 99, 235, 0.78)",
    lightProjectSurface:
      "linear-gradient(160deg, rgba(239, 246, 255, 0.95), rgba(255, 255, 255, 0.98))",
    darkProjectSurface:
      "linear-gradient(160deg, rgba(10, 18, 34, 0.98), rgba(12, 23, 44, 0.96))",
    projectInset: "inset 0 1px 0 rgba(255,255,255,0.78)",
    headlineWeight: "700",
  };
}

function buildThemeStyles(
  theme: PreviewTheme,
  cardStyle: PortfolioOverrides["appearance"]["cardStyle"],
  colorMode: PortfolioOverrides["appearance"]["colorMode"],
) {
  const preset = getThemePreset(theme.id);
  const isDarkMode = colorMode === "dark";
  const cardShadow =
    cardStyle === "outlined"
      ? "none"
      : cardStyle === "elevated"
        ? isDarkMode
          ? "0 24px 56px -30px rgba(2, 6, 23, 0.72)"
          : "0 26px 58px -34px rgba(15,23,42,0.4)"
        : preset.cardGlow;
  const pageColor = isDarkMode ? "#09111f" : theme.palette.page;
  const surfaceColor = isDarkMode ? "rgba(13, 21, 35, 0.9)" : theme.palette.surface;
  const surfaceStrongColor = isDarkMode ? "#0f1729" : theme.palette.surfaceStrong;
  const subtleSurfaceColor = isDarkMode ? "rgba(15, 23, 41, 0.58)" : theme.palette.pageAccent;
  const borderColor = isDarkMode ? "rgba(148, 163, 184, 0.2)" : theme.palette.border;
  const textColor = isDarkMode ? "#e5eefb" : theme.palette.text;
  const mutedColor = isDarkMode ? "#93a4bf" : theme.palette.muted;
  const chipBackground = isDarkMode ? theme.palette.accentSoft : theme.palette.chip;
  const chipText = isDarkMode ? "#f8fbff" : theme.palette.accent;
  const accentBlockText = isDarkMode ? "#dbeafe" : theme.palette.accent;
  const ghostBackground = isDarkMode ? "rgba(15, 23, 41, 0.82)" : theme.palette.surfaceStrong;
  const placeholderColor = isDarkMode ? "#7f93b0" : "#64748b";
  const helperColor = isDarkMode ? "#c6d4ea" : "#334155";
  const successColor = isDarkMode ? "#86efac" : "#166534";
  const errorColor = isDarkMode ? "#fca5a5" : "#b91c1c";
  const infoColor = isDarkMode ? "#bfdbfe" : "#1d4ed8";
  const userBadge = isDarkMode
    ? {
        backgroundColor: "rgba(16, 185, 129, 0.16)",
        color: "#a7f3d0",
        borderColor: "rgba(52, 211, 153, 0.24)",
      }
    : {
        backgroundColor: "rgba(16, 185, 129, 0.12)",
        color: "#047857",
        borderColor: "rgba(16, 185, 129, 0.18)",
      };
  const aiBadge = isDarkMode
    ? {
        backgroundColor: "rgba(59, 130, 246, 0.18)",
        color: "#bfdbfe",
        borderColor: "rgba(96, 165, 250, 0.24)",
      }
    : {
        backgroundColor: "rgba(59, 130, 246, 0.12)",
        color: "#1d4ed8",
        borderColor: "rgba(59, 130, 246, 0.18)",
      };
  const readmeBadge = isDarkMode
    ? {
        backgroundColor: "rgba(249, 115, 22, 0.18)",
        color: "#fdba74",
        borderColor: "rgba(251, 146, 60, 0.24)",
      }
    : {
        backgroundColor: "rgba(249, 115, 22, 0.12)",
        color: "#c2410c",
        borderColor: "rgba(249, 115, 22, 0.2)",
      };

  return {
    page: {
      background: `${isDarkMode ? preset.darkBackgroundPattern : preset.lightBackgroundPattern}, ${pageColor}`,
      color: textColor,
    } satisfies CSSProperties,
    surface: {
      backgroundColor: surfaceColor,
      borderColor,
      color: textColor,
      ["--field-placeholder" as string]: placeholderColor,
    } satisfies CSSProperties,
    strongSurface: {
      backgroundColor: surfaceStrongColor,
      borderColor,
      color: textColor,
      ["--field-placeholder" as string]: placeholderColor,
    } satisfies CSSProperties,
    subtleSurface: {
      backgroundColor: subtleSurfaceColor,
      borderColor,
      color: textColor,
      ["--field-placeholder" as string]: placeholderColor,
    } satisfies CSSProperties,
    heroSurface: {
      background: `${isDarkMode ? preset.darkHeroOverlay : preset.lightHeroOverlay}, ${surfaceStrongColor}`,
      borderColor,
      color: textColor,
    } satisfies CSSProperties,
    navSurface: {
      background: `${isDarkMode ? preset.darkNavOverlay : preset.lightNavOverlay}, ${surfaceStrongColor}`,
      borderColor,
      color: textColor,
    } satisfies CSSProperties,
    sectionSurface: {
      background: isDarkMode ? preset.darkSectionTone : preset.lightSectionTone,
      borderColor,
      color: textColor,
    } satisfies CSSProperties,
    projectShowcase: {
      background: isDarkMode ? preset.darkProjectSurface : preset.lightProjectSurface,
      borderColor,
      color: textColor,
      boxShadow: `${preset.projectInset}, ${cardShadow}`,
    } satisfies CSSProperties,
    projectCard: {
      backgroundColor: surfaceStrongColor,
      borderColor,
      color: textColor,
      boxShadow: cardShadow,
    } satisfies CSSProperties,
    mutedText: {
      color: mutedColor,
    } satisfies CSSProperties,
    helperText: {
      color: helperColor,
    } satisfies CSSProperties,
    chip: {
      backgroundColor: chipBackground,
      color: chipText,
      borderColor,
    } satisfies CSSProperties,
    accentBlock: {
      backgroundColor: theme.palette.accentSoft,
      color: accentBlockText,
      borderColor,
    } satisfies CSSProperties,
    accentButton: {
      backgroundColor: theme.palette.accent,
      color: "#ffffff",
      boxShadow: `0 18px 30px -20px ${theme.palette.accent}`,
    } satisfies CSSProperties,
    ghostButton: {
      borderColor,
      color: textColor,
      backgroundColor: ghostBackground,
    } satisfies CSSProperties,
    infoText: {
      color: infoColor,
    } satisfies CSSProperties,
    successText: {
      color: successColor,
    } satisfies CSSProperties,
    errorText: {
      color: errorColor,
    } satisfies CSSProperties,
    headline: {
      fontWeight: preset.headlineWeight,
    } satisfies CSSProperties,
    githubBadge: {
      backgroundColor: theme.palette.accentSoft,
      color: accentBlockText,
      borderColor,
    } satisfies CSSProperties,
    userBadge: userBadge satisfies CSSProperties,
    aiBadge: aiBadge satisfies CSSProperties,
    readmeBadge: readmeBadge satisfies CSSProperties,
  };
}

const PALETTE_FIELD_LABELS: Record<keyof PreviewTheme["palette"], string> = {
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

type ThemeStyleMap = ReturnType<typeof buildThemeStyles>;
type InspectorTab = "content" | "layout" | "style" | "theme" | "section";
const SECTION_CONTENT_HINTS: Record<PortfolioSectionType, string> = {
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

function createLinkId() {
  return `link-${Math.random().toString(36).slice(2, 10)}`;
}

function getInitialPortfolioColorMode(): PortfolioOverrides["appearance"]["colorMode"] {
  return "dark";
}

function buildShareSlug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "portfolio"
  );
}

function createCustomSectionId() {
  return `custom-${Math.random().toString(36).slice(2, 10)}`;
}

function createLayoutRowId() {
  return `row-${Math.random().toString(36).slice(2, 10)}`;
}

function isBuiltInSectionType(type: PortfolioSectionType): type is PortfolioSectionId {
  return ["hero", "about", "professional", "projects", "contact", "links"].includes(type);
}

function formatSourceLabel(source: ContentSource | "github") {
  if (source === "user") {
    return "Edited";
  }

  if (source === "ai") {
    return "AI";
  }

  if (source === "readme") {
    return "README";
  }

  return "GitHub";
}

function SourceBadge({
  source,
  themeStyles,
}: {
  source: ContentSource | "github";
  themeStyles: ThemeStyleMap;
}) {
  const badgeStyle =
    source === "user"
      ? themeStyles.userBadge
      : source === "ai"
        ? themeStyles.aiBadge
      : source === "readme"
        ? themeStyles.readmeBadge
        : themeStyles.githubBadge;

  return (
    <span className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]" style={badgeStyle}>
      {formatSourceLabel(source)}
    </span>
  );
}

function normalizeTechKey(value: string) {
  const baseKey = value.trim().toLowerCase().replace(/[._/]+/g, " ");
  return TECH_ICON_ALIASES[baseKey] ?? baseKey.replace(/\s+/g, "");
}

function TechBadge({
  label,
  themeStyles,
  compact = false,
}: {
  label: string;
  themeStyles: ThemeStyleMap;
  compact?: boolean;
}) {
  const techIcon = TECH_ICONS[normalizeTechKey(label)];

  if (!techIcon) {
    return (
      <span
        className={`rounded-full border font-medium ${compact ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"}`}
        style={themeStyles.chip}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-medium ${compact ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"}`}
      style={themeStyles.chip}
    >
      <svg
        viewBox="0 0 28 28"
        aria-hidden="true"
        className={compact ? "h-4 w-4 shrink-0" : "h-5 w-5 shrink-0"}
      >
        <rect x="1.5" y="1.5" width="25" height="25" rx="8" fill={techIcon.accent} opacity="0.16" />
        <rect x="5" y="5" width="18" height="18" rx="6" fill={techIcon.accent} />
        <text
          x="14"
          y="14.6"
          fill="#ffffff"
          fontSize={techIcon.shortLabel.length > 2 ? "6.5" : "8.5"}
          fontWeight="700"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontFamily: "var(--font-mono), monospace", letterSpacing: "-0.04em" }}
        >
          {techIcon.shortLabel}
        </text>
      </svg>
      <span>{label}</span>
    </span>
  );
}

function ActionLink({
  href,
  label,
  themeStyles,
  primary = false,
}: {
  href: string;
  label: string;
  themeStyles: ThemeStyleMap;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("#") ? undefined : "_blank"}
      rel={href.startsWith("#") ? undefined : "noreferrer"}
      className="inline-flex rounded-xl border px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
      style={primary ? themeStyles.accentButton : themeStyles.ghostButton}
    >
      {label}
    </a>
  );
}

function ProjectImagePreview({
  repository,
  themeStyles,
  compact = false,
}: {
  repository: ResolvedPreviewRepository;
  themeStyles: ThemeStyleMap;
  compact?: boolean;
}) {
  if (!repository.resolvedImage) {
    return null;
  }

  return (
    <div className={`relative overflow-hidden rounded-[1.4rem] border ${compact ? "h-32" : "h-52"}`} style={themeStyles.strongSurface}>
      <img
        src={repository.resolvedImage.url}
        alt={repository.resolvedImage.alt}
        className="h-full w-full object-cover"
      />
      <div className="absolute left-3 top-3">
        <SourceBadge source={repository.resolvedImage.source} themeStyles={themeStyles} />
      </div>
    </div>
  );
}

function AutoResizeTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      onInput={(event) => {
        const element = event.currentTarget;
        element.style.height = "auto";
        element.style.height = `${element.scrollHeight}px`;
        props.onInput?.(event);
      }}
    />
  );
}

function InlineEditableField({
  label,
  value,
  onChange,
  generatedValue,
  suggestedValue = "",
  activeSource = "github",
  placeholder,
  themeStyles,
  onReset,
  onApplySuggestion,
  onDismissSuggestion,
  editing,
  multiline = false,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  generatedValue: string;
  suggestedValue?: string;
  activeSource?: Exclude<ContentSource, "readme">;
  placeholder: string;
  themeStyles: ThemeStyleMap;
  onReset: () => void;
  onApplySuggestion?: () => void;
  onDismissSuggestion?: () => void;
  editing: boolean;
  multiline?: boolean;
  compact?: boolean;
}) {
  const source = value.trim() ? activeSource : "github";
  const generatedPreview = generatedValue.trim();
  const aiPreview = suggestedValue.trim();
  const hasManualValue = value.trim().length > 0;
  const hasGeneratedPreview = generatedPreview.length > 0;

  if (!editing) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-2.5 rounded-[1rem] border border-transparent p-1">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
        <span style={themeStyles.mutedText}>{label}</span>
        <div className="flex items-center gap-2">
          <SourceBadge source={source} themeStyles={themeStyles} />
        </div>
      </div>
      {multiline ? (
        <AutoResizeTextarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={compact ? 2 : 4}
          placeholder={placeholder}
          className={`rounded-[0.95rem] border px-3 py-3 text-sm leading-7 outline-none transition ${compact ? "min-h-[72px]" : "min-h-[108px]"}`}
          style={themeStyles.strongSurface}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-11 rounded-[0.95rem] border px-3 text-sm outline-none transition"
          style={themeStyles.strongSurface}
        />
      )}
      {hasGeneratedPreview || hasManualValue ? (
        <div className="flex flex-wrap items-start justify-between gap-3 text-xs leading-5" style={themeStyles.mutedText}>
          <span className="min-w-0 flex-1 break-words">
            {hasManualValue
              ? "Manual edit active"
              : hasGeneratedPreview
                ? `Using GitHub copy: ${generatedPreview}`
                : ""}
          </span>
          {hasManualValue ? (
            <button type="button" onClick={onReset} className="shrink-0 font-semibold" style={{ color: themeStyles.githubBadge.color }}>
              Revert
            </button>
          ) : null}
        </div>
      ) : null}
      {aiPreview ? (
        <div className="rounded-[0.95rem] border px-3 py-3 text-xs leading-6" style={themeStyles.surface}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SourceBadge source="ai" themeStyles={themeStyles} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                Suggested revision
              </span>
            </div>
            <div className="flex items-center gap-3">
              {onApplySuggestion ? (
                <button
                  type="button"
                  onClick={onApplySuggestion}
                  className="font-semibold"
                  style={{ color: themeStyles.aiBadge.color }}
                >
                  Apply
                </button>
              ) : null}
              {onDismissSuggestion ? (
                <button
                  type="button"
                  onClick={onDismissSuggestion}
                  className="font-semibold"
                  style={{ color: themeStyles.githubBadge.color }}
                >
                  Hide
                </button>
              ) : null}
            </div>
          </div>
          <p className="mt-2 break-words">{aiPreview}</p>
        </div>
      ) : null}
    </div>
  );
}

function CompactActionMenu({
  themeStyles,
  items,
}: {
  themeStyles: ThemeStyleMap;
  items: Array<{
    label: string;
    onSelect: () => void;
    tone?: "default" | "danger";
  }>;
}) {
  return (
    <details className="relative">
      <summary
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border text-base font-semibold transition [&::-webkit-details-marker]:hidden"
        style={themeStyles.ghostButton}
        onClick={(event) => event.stopPropagation()}
      >
        <span aria-hidden="true">•••</span>
      </summary>
      <div
        className="absolute right-0 top-[calc(100%+0.45rem)] z-40 grid min-w-[10.5rem] gap-1 rounded-[1rem] border p-1.5 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.45)]"
        style={themeStyles.strongSurface}
      >
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              item.onSelect();
              event.currentTarget.closest("details")?.removeAttribute("open");
            }}
            className="rounded-[0.8rem] px-3 py-2 text-left text-sm font-medium transition"
            style={item.tone === "danger" ? { color: themeStyles.errorText.color } : themeStyles.ghostButton}
          >
            {item.label}
          </button>
        ))}
      </div>
    </details>
  );
}

function InlineActionButton({
  label,
  onClick,
  themeStyles,
}: {
  label: string;
  onClick: () => void;
  themeStyles: ThemeStyleMap;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition hover:-translate-y-0.5"
      style={themeStyles.ghostButton}
    >
      {label}
    </button>
  );
}

function PaletteFieldControl({
  label,
  value,
  onChange,
  onReset,
  themeStyles,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  onReset: () => void;
  themeStyles: ThemeStyleMap;
}) {
  return (
    <div className="grid gap-2 rounded-[0.95rem] border p-3" style={themeStyles.surface}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
          {label}
        </p>
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={themeStyles.ghostButton}
        >
          Reset
        </button>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 rounded border bg-transparent p-1"
          style={themeStyles.strongSurface}
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#000000"
          className="h-10 flex-1 rounded-[0.85rem] border px-3 text-sm outline-none"
          style={themeStyles.strongSurface}
        />
      </div>
    </div>
  );
}

function PreviewSectionFrame({
  sectionId,
  label,
  themeStyles,
  theme,
  isDragging,
  isResizing,
  isSelected,
  isHovered,
  isDropTarget,
  dropPosition,
  widthRatio,
  canResize,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove,
  onSelect,
  onHoverChange,
  duplicateLabel,
  onDuplicate,
  children,
}: {
  sectionId: string;
  label: string;
  themeStyles: ThemeStyleMap;
  theme: PreviewTheme;
  isDragging: boolean;
  isResizing: boolean;
  isSelected: boolean;
  isHovered: boolean;
  isDropTarget: boolean;
  dropPosition: "before" | "after" | "left" | "right" | null;
  widthRatio: number;
  canResize: boolean;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onRemove: () => void;
  onSelect: () => void;
  onHoverChange: (hovered: boolean) => void;
  duplicateLabel?: string;
  onDuplicate?: () => void;
  children: ReactNode;
}) {
  const showToolbar = isHovered || isSelected || isResizing;

  return (
    <section
      id={sectionId}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onSelect}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      className={`group/section relative h-full min-w-0 cursor-pointer transition ${isDragging ? "opacity-60" : ""}`}
    >
      {isDropTarget && dropPosition === "before" ? (
        <div
          className="absolute inset-x-4 top-0 z-20 h-1 rounded-full"
          style={{ backgroundColor: theme.palette.accent }}
        />
      ) : null}
      {isDropTarget && dropPosition === "after" ? (
        <div
          className="absolute inset-x-4 bottom-0 z-20 h-1 rounded-full"
          style={{ backgroundColor: theme.palette.accent }}
        />
      ) : null}
      {isDropTarget && dropPosition === "left" ? (
        <div
          className="absolute inset-y-4 left-0 z-20 w-1 rounded-full"
          style={{ backgroundColor: theme.palette.accent }}
        />
      ) : null}
      {isDropTarget && dropPosition === "right" ? (
        <div
          className="absolute inset-y-4 right-0 z-20 w-1 rounded-full"
          style={{ backgroundColor: theme.palette.accent }}
        />
      ) : null}
      <div
        className="flex h-full min-w-0 flex-col rounded-[1.75rem] border px-4 py-4 sm:px-5 sm:py-5"
        style={{
          ...themeStyles.surface,
          borderColor: isDropTarget || isSelected ? theme.palette.accent : themeStyles.surface.borderColor,
          boxShadow:
            isDropTarget || isSelected
              ? `0 0 0 1px ${theme.palette.accent}`
              : isHovered
                ? `0 0 0 1px ${themeStyles.surface.borderColor}`
                : undefined,
        }}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={themeStyles.mutedText}>
              {label}
            </p>
          </div>
          <div
            className={`flex items-center gap-2 transition ${showToolbar ? "opacity-100" : "pointer-events-none opacity-0 group-hover/section:opacity-100 group-hover/section:pointer-events-auto"}`}
          >
            {canResize && (isSelected || isResizing) ? (
              <span
                className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={themeStyles.mutedText}
              >
                {Math.round(widthRatio * 100)}%
              </span>
            ) : null}
            <button
              type="button"
              draggable
              onDragStart={(event) => {
                event.stopPropagation();
                onDragStart(event);
              }}
              onDragEnd={onDragEnd}
              className="inline-flex cursor-grab items-center justify-center rounded-full border p-2 text-xs font-semibold uppercase tracking-[0.16em] active:cursor-grabbing"
              style={themeStyles.ghostButton}
              aria-label={`Drag ${label}`}
              title={`Drag ${label}`}
            >
              <span aria-hidden="true">⋮⋮</span>
            </button>
            <CompactActionMenu
              themeStyles={themeStyles}
              items={[
                ...(onDuplicate
                  ? [
                      {
                        label: duplicateLabel || "Duplicate section",
                        onSelect: onDuplicate,
                      },
                    ]
                  : []),
                {
                  label: "Remove section",
                  onSelect: onRemove,
                  tone: "danger" as const,
                },
              ]}
            />
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

function PreviewRowResizeHandle({
  themeStyles,
  theme,
  isActive,
  onPointerDown,
}: {
  themeStyles: ThemeStyleMap;
  theme: PreviewTheme;
  isActive: boolean;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="hidden xl:flex xl:w-5 xl:flex-none xl:items-stretch xl:justify-center">
      <button
        type="button"
        onPointerDown={onPointerDown}
        className="group relative h-full min-h-[12rem] cursor-ew-resize touch-none"
        aria-label="Resize sections"
        title="Drag to resize sections"
      >
        <span
          className="absolute inset-y-3 left-1/2 -translate-x-1/2 rounded-full transition"
          style={{
            width: "2px",
            backgroundColor: isActive ? theme.palette.accent : themeStyles.surface.borderColor,
          }}
        />
        <span
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition"
          style={{
            width: `${SECTION_RESIZE_HANDLE_HIT_WIDTH}px`,
            height: "2.75rem",
            ...themeStyles.strongSurface,
            borderColor: isActive ? theme.palette.accent : themeStyles.strongSurface.borderColor,
            boxShadow: isActive ? `0 0 0 1px ${theme.palette.accent}` : undefined,
          }}
        >
          <span className="flex items-center gap-1">
            <span className="h-4 w-[2px] rounded-full" style={{ backgroundColor: theme.palette.muted }} />
            <span className="h-4 w-[2px] rounded-full" style={{ backgroundColor: theme.palette.muted }} />
          </span>
        </span>
      </button>
    </div>
  );
}

function PreviewCanvasItemFrame({
  label,
  themeStyles,
  isEditing,
  isDragging = false,
  isDropTarget = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove,
  children,
}: {
  label: string;
  themeStyles: ThemeStyleMap;
  isEditing: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onDragStart?: (event: DragEvent<HTMLElement>) => void;
  onDragOver?: (event: DragEvent<HTMLElement>) => void;
  onDrop?: (event: DragEvent<HTMLElement>) => void;
  onDragEnd?: () => void;
  onRemove?: () => void;
  children: ReactNode;
}) {
  if (!isEditing) {
    return <>{children}</>;
  }

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`group/item relative rounded-[1.2rem] border p-3 transition ${isDragging ? "opacity-60" : ""}`}
      style={{
        ...themeStyles.strongSurface,
        borderColor: isDropTarget ? themeStyles.accentButton.backgroundColor : themeStyles.strongSurface.borderColor,
        boxShadow: isDropTarget
          ? `0 0 0 1px ${themeStyles.accentButton.backgroundColor}`
          : undefined,
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={themeStyles.mutedText}>
          {label}
        </p>
        <div className="flex items-center gap-2 opacity-0 transition group-hover/item:opacity-100 focus-within:opacity-100">
          {onDragStart ? (
            <button
              type="button"
              draggable
              onDragStart={(event) => {
                event.stopPropagation();
                onDragStart(event);
              }}
              onDragEnd={onDragEnd}
              className="rounded-full border p-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={themeStyles.ghostButton}
              aria-label={`Drag ${label}`}
              title={`Drag ${label}`}
            >
              <span aria-hidden="true">⋮⋮</span>
            </button>
          ) : null}
          {onRemove ? (
            <CompactActionMenu
              themeStyles={themeStyles}
              items={[
                {
                  label: "Hide block",
                  onSelect: onRemove,
                  tone: "danger",
                },
              ]}
            />
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function formatEnrichmentFieldLabel(field: EnrichmentSuggestion["field"]) {
  switch (field) {
    case "hero.headline":
      return "Hero headline";
    case "hero.subheadline":
      return "Hero intro";
    case "about.description":
      return "About copy";
    case "professional.summary":
      return "Professional summary";
    case "professional.company":
      return "Company";
    case "professional.location":
      return "Location";
    case "professional.availability":
      return "Availability";
    case "contact.email":
      return "Email";
    case "contact.phone":
      return "Phone";
    case "linksSection.resumeUrl":
      return "Resume link";
    case "linksSection.coverLetterUrl":
      return "Cover letter link";
    case "linksSection.linkedIn":
      return "LinkedIn link";
    case "linksSection.handshakeUrl":
      return "Handshake link";
    case "linksSection.portfolioUrl":
      return "Website link";
    case "linksSection.customLink":
      return "Custom link";
    default:
      return "Imported field";
  }
}

function moveCanvasComponent(
  components: PortfolioCanvasComponent[],
  componentId: string,
  direction: -1 | 1,
) {
  const currentIndex = components.findIndex((component) => component.id === componentId);

  if (currentIndex === -1) {
    return components;
  }

  const nextIndex = currentIndex + direction;

  if (nextIndex < 0 || nextIndex >= components.length) {
    return components;
  }

  const nextComponents = [...components];
  const [movedComponent] = nextComponents.splice(currentIndex, 1);
  nextComponents.splice(nextIndex, 0, movedComponent);
  return nextComponents;
}

function reorderCanvasComponent(
  components: PortfolioCanvasComponent[],
  draggedComponentId: string,
  targetComponentId: string,
  position: "before" | "after" | "left" | "right" = "before",
) {
  const draggedIndex = components.findIndex((component) => component.id === draggedComponentId);
  const targetIndex = components.findIndex((component) => component.id === targetComponentId);

  if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
    return components;
  }

  const nextComponents = [...components];
  const [draggedComponent] = nextComponents.splice(draggedIndex, 1);
  const targetComponent = nextComponents.find((component) => component.id === targetComponentId);
  const adjustedTargetIndex = nextComponents.findIndex((component) => component.id === targetComponentId);

  if (!targetComponent) {
    return components;
  }

  if (position === "left" || position === "right") {
    const sharedRowId =
      canSectionsShareRow(draggedComponent, targetComponent)
        ? targetComponent.rowId || targetComponent.id
        : createLayoutRowId();

    if (canSectionsShareRow(draggedComponent, targetComponent)) {
      const leftComponent = position === "left" ? draggedComponent : targetComponent;
      const rightComponent = position === "left" ? targetComponent : draggedComponent;
      const leftRatio = getAllowedRowWidthRatios(leftComponent, rightComponent).includes(0.6) ? 0.6 : 0.5;

      draggedComponent.rowId = sharedRowId;
      targetComponent.rowId = sharedRowId;
      draggedComponent.width = undefined;
      targetComponent.width = undefined;
      draggedComponent.widthRatio = position === "left" ? leftRatio : 1 - leftRatio;
      targetComponent.widthRatio = position === "left" ? 1 - leftRatio : leftRatio;
    } else {
      draggedComponent.rowId = createLayoutRowId();
      draggedComponent.width = "full";
      draggedComponent.widthRatio = 1;
    }
  } else {
    draggedComponent.rowId = createLayoutRowId();
    draggedComponent.width = "full";
    draggedComponent.widthRatio = 1;
  }

  const insertIndex =
    position === "after" || position === "right" ? adjustedTargetIndex + 1 : adjustedTargetIndex;
  nextComponents.splice(insertIndex, 0, draggedComponent);
  return nextComponents;
}

function mergeEnrichmentResults(
  current: EnrichmentSourceResult[],
  incoming: EnrichmentSourceResult[],
) {
  const merged = new Map(current.map((source) => [source.sourceUrl, source]));

  for (const source of incoming) {
    merged.set(source.sourceUrl, source);
  }

  return Array.from(merged.values());
}

export function Repo2SiteShell() {
  const { renderTheme, themeChoice, setThemeChoice, isHydrated } = useAppTheme();
  const searchParams = useSearchParams();
  const initialPortfolioColorModeRef = useRef<PortfolioOverrides["appearance"]["colorMode"]>(
    getInitialPortfolioColorMode(),
  );
  const buildEmptyOverrides = () =>
    createEmptyOverrides({ colorMode: initialPortfolioColorModeRef.current });
  const [profileUrl, setProfileUrl] = useState(SAMPLE_URL);
  const [preview, setPreview] = useState<GeneratePreviewResponse | null>(null);
  const [overrides, setOverrides] = useState<PortfolioOverrides>(() => buildEmptyOverrides());
  const [error, setError] = useState<string | null>(null);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [enrichmentInput, setEnrichmentInput] = useState("");
  const [uploadedResumeFiles, setUploadedResumeFiles] = useState<File[]>([]);
  const [enrichmentResults, setEnrichmentResults] = useState<EnrichmentSourceResult[]>([]);
  const [openProjectImports, setOpenProjectImports] = useState<Record<string, boolean>>({});
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dropTargetSectionId, setDropTargetSectionId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | "left" | "right" | null>(null);
  const [draggedChildComponentId, setDraggedChildComponentId] = useState<string | null>(null);
  const [dropTargetChildComponentId, setDropTargetChildComponentId] = useState<string | null>(null);
  const [draggedProjectName, setDraggedProjectName] = useState<string | null>(null);
  const [projectDropTargetName, setProjectDropTargetName] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<InspectorTab>("layout");
  const [resizingSectionIds, setResizingSectionIds] = useState<string[]>([]);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isQuickStartExpanded, setIsQuickStartExpanded] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateCategory, setTemplateCategory] = useState("general");
  const [templateTags, setTemplateTags] = useState("");
  const [isPublishingTemplate, setIsPublishingTemplate] = useState(false);
  const [templateMessage, setTemplateMessage] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [shareSlug, setShareSlug] = useState("");
  const [sharedPortfolioUrl, setSharedPortfolioUrl] = useState("");
  const [shareImageUrl, setShareImageUrl] = useState("");
  const [shareCaption, setShareCaption] = useState("");
  const [sharePublishedAt, setSharePublishedAt] = useState("");
  const [shareError, setShareError] = useState<string | null>(null);
  const [isPublishingShare, setIsPublishingShare] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareCaptionCopied, setShareCaptionCopied] = useState(false);
  const [shareAvailability, setShareAvailability] = useState<{
    available: boolean;
    reason: "available" | "owned" | "taken" | "invalid";
    normalizedSlug: string;
    suggestedSlug?: string;
  } | null>(null);
  const [isCheckingShareSlug, setIsCheckingShareSlug] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSummary>(null);
  const [githubImportAutofillNotice, setGitHubImportAutofillNotice] = useState<string | null>(null);
  const [isGitHubSignInHelpOpen, setIsGitHubSignInHelpOpen] = useState(false);
  const { triggerSpriteReaction } = useRepo2SiteCompanion();
  const resumeUploadInputRef = useRef<HTMLInputElement | null>(null);
  const heroImageInputRef = useRef<HTMLInputElement | null>(null);
  const shareSlugCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appliedTemplateSlugRef = useRef<string | null>(null);
  const aiAcceptedCountRef = useRef<number | null>(null);
  const lastGitHubAutofillUsernameRef = useRef<string | null>(null);
  const sectionResizeRef = useRef<{
    leftSectionId: string;
    rightSectionId: string;
    rowId: string;
    startX: number;
    rowWidth: number;
    leftStart: number;
    rightStart: number;
  } | null>(null);
  const hasResumeContext =
    uploadedResumeFiles.length > 0 ||
    Boolean(overrides.documents.resumeAssetUrl) ||
    Boolean(overrides.documents.coverLetterAssetUrl);
  const pendingAiSuggestionCount = countPendingAiSuggestions(overrides);
  const walkthrough = useRepo2SiteWalkthrough({
    context: {
      hasPreview: Boolean(preview),
      hasResume: hasResumeContext,
      hasProjects: Boolean(preview?.featuredRepositories.length),
      hasPendingAiSuggestions: pendingAiSuggestionCount > 0,
      isCustomizeOpen,
      isEditMode,
    },
    onOpenProfileEdit: () => setIsEditMode(true),
    onTrackEvent: trackAnalyticsEvent,
  });

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    setOverrides((current) => {
      if (current.appearance.colorMode !== initialPortfolioColorModeRef.current) {
        return current;
      }

      if (current.appearance.colorMode === renderTheme) {
        return current;
      }

      return {
        ...current,
        appearance: {
          ...current.appearance,
          colorMode: renderTheme,
        },
      };
    });
  }, [isHydrated, renderTheme]);

  useEffect(() => {
    let isCancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        const result = (await response.json()) as { session: AuthSummary };

        if (!isCancelled) {
          setAuthSession(result.session);
        }
      } catch {
        if (!isCancelled) {
          setAuthSession(null);
        }
      }
    }

    void loadSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authSession?.username) {
      setGitHubImportAutofillNotice(null);
      return;
    }

    if (lastGitHubAutofillUsernameRef.current === authSession.username) {
      return;
    }

    if (profileUrl.trim()) {
      return;
    }

    const suggestedProfileUrl =
      authSession.profileUrl?.trim() || `https://github.com/${authSession.username}`;

    setProfileUrl(suggestedProfileUrl);
    setGitHubImportAutofillNotice(authSession.username);
    lastGitHubAutofillUsernameRef.current = authSession.username;
  }, [authSession, profileUrl]);

  useEffect(() => {
    if (!preview) {
      setShareSlug("");
      setSharedPortfolioUrl("");
      setShareImageUrl("");
      setShareCaption("");
      setSharePublishedAt("");
      setShareCopied(false);
      setShareCaptionCopied(false);
      setShareAvailability(null);
      return;
    }

    setShareSlug((current) => {
      if (current.trim()) {
        return current;
      }

      return buildShareSlug(preview.profile.username || preview.profile.name || "portfolio");
    });

    setTemplateTitle((current) => current || `${preview.profile.name || preview.profile.username} ${portfolio.theme.name} Template`);
    setTemplateDescription((current) =>
      current ||
      "A reusable Repo2Site layout preset that keeps your own GitHub content while applying this design system.",
    );
  }, [preview]);

  useEffect(() => {
    const templateSlug = searchParams.get("template");

    if (!templateSlug || appliedTemplateSlugRef.current === templateSlug) {
      return;
    }

    async function applyTemplateFromQuery() {
      try {
        const response = await fetch(`/api/templates/${templateSlug}`, {
          cache: "no-store",
        });
        const result = (await response.json()) as
          | {
              template: {
                slug: string;
                title: string;
                preset: ReturnType<typeof buildTemplatePreset>;
                exampleContent?: {
                  hero?: { headline: string; subheadline: string };
                  about?: { title: string; description: string };
                  professional?: { title: string; summary: string; availability: string };
                  contact?: { title: string; description: string; customText: string };
                  linksSection?: { title: string; description: string };
                };
              };
            }
          | { error: string };

        if (!response.ok || "error" in result) {
          return;
        }

        updateOverrides((current) => applyTemplateRecord(current, result.template));
        appliedTemplateSlugRef.current = templateSlug;
        setTemplateMessage(`Applied template: ${result.template.title}`);
        setTemplateError(null);
        trackAnalyticsEvent("Template Applied", {
          slug: result.template.slug,
          source: "query",
        });
        void fetch(`/api/templates/${templateSlug}/remix`, {
          method: "POST",
        });
        window.history.replaceState({}, "", "/builder");
      } catch {
        // ignore silent query failures so the builder still loads normally
      }
    }

    void applyTemplateFromQuery();
  }, [searchParams]);

  useEffect(() => {
    const authError = searchParams.get("authError");

    if (!authError) {
      return;
    }

    if (authError === "github_not_configured") {
      setError(
        "GitHub sign-in is not configured yet. Add GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and REPO2SITE_AUTH_SECRET to enable account-backed publishing.",
      );
      return;
    }

    if (authError === "invalid_state") {
      setError("GitHub sign-in could not be completed safely. Please try again.");
      return;
    }

    if (authError === "github_sign_in_failed") {
      setError("GitHub sign-in failed. Please try again in a moment.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isShareOpen || !preview || !shareSlug.trim()) {
      setIsCheckingShareSlug(false);
      return;
    }

    if (shareSlugCheckTimeoutRef.current) {
      clearTimeout(shareSlugCheckTimeoutRef.current);
    }

    setIsCheckingShareSlug(true);

    shareSlugCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/share?slug=${encodeURIComponent(shareSlug)}`);
        const result = (await response.json()) as
          | {
              available: boolean;
              reason: "available" | "owned" | "taken" | "invalid";
              normalizedSlug: string;
              suggestedSlug?: string;
            }
          | { error: string };

        if (!response.ok || "error" in result) {
          setShareAvailability(null);
          return;
        }

        setShareAvailability(result);
      } catch {
        setShareAvailability(null);
      } finally {
        setIsCheckingShareSlug(false);
      }
    }, 280);

    return () => {
      if (shareSlugCheckTimeoutRef.current) {
        clearTimeout(shareSlugCheckTimeoutRef.current);
      }
    };
  }, [isShareOpen, preview, shareSlug]);

  useEffect(() => {
    function handlePointerMove(event: globalThis.PointerEvent) {
      const resizeState = sectionResizeRef.current;

      if (!resizeState) {
        return;
      }

      const deltaRatio = (event.clientX - resizeState.startX) / resizeState.rowWidth;

      updateLayoutComponents((components) => {
        const leftComponent = components.find((component) => component.id === resizeState.leftSectionId);
        const rightComponent = components.find((component) => component.id === resizeState.rightSectionId);

        if (!leftComponent || !rightComponent) {
          return components;
        }

        if (
          !leftComponent.visible ||
          !rightComponent.visible ||
          !canSectionsShareRow(leftComponent, rightComponent) ||
          (leftComponent.rowId || leftComponent.id) !== resizeState.rowId ||
          (rightComponent.rowId || rightComponent.id) !== resizeState.rowId
        ) {
          return components;
        }

        const pairTotal = resizeState.leftStart + resizeState.rightStart;
        const rawLeft = Math.min(
          pairTotal - SECTION_MIN_WIDTH_RATIO,
          Math.max(SECTION_MIN_WIDTH_RATIO, resizeState.leftStart + deltaRatio),
        );
        const normalizedLeft = snapRowWidthRatio(rawLeft, leftComponent, rightComponent);
        const nextRight = 1 - normalizedLeft;

        return components.map((component) => {
          if ((component.rowId || component.id) !== resizeState.rowId || !canSectionShareRow(component)) {
            return component;
          }

          if (component.id === resizeState.leftSectionId) {
            return {
              ...component,
              widthRatio: normalizedLeft,
              width: undefined,
            };
          }

          if (component.id === resizeState.rightSectionId) {
            return {
              ...component,
              widthRatio: nextRight,
              width: undefined,
            };
          }

          return component;
        });
      });
    }

    function handlePointerUp() {
      stopSectionResize();
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [updateLayoutComponents]);

  useEffect(() => {
    function handleWindowError(event: ErrorEvent) {
      void reportClientError({
        message: event.message || "Unhandled browser error",
        stack: event.error instanceof Error ? event.error.stack : undefined,
        name: event.error instanceof Error ? event.error.name : "WindowError",
        pathname: window.location.pathname,
        metadata: {
          source: "window.error",
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
        },
      });
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const reason =
        event.reason instanceof Error
          ? event.reason
          : new Error(typeof event.reason === "string" ? event.reason : "Unhandled promise rejection");

      void reportClientError({
        message: reason.message,
        stack: reason.stack,
        name: reason.name,
        pathname: window.location.pathname,
        metadata: {
          source: "window.unhandledrejection",
        },
      });
    }

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    const acceptedCount =
      Number(overrides.aiAccepted.heroHeadline) +
      Number(overrides.aiAccepted.heroSubheadline) +
      Number(overrides.aiAccepted.aboutDescription) +
      Number(overrides.aiAccepted.contactDescription) +
      Number(overrides.aiAccepted.professionalTitle) +
      Number(overrides.aiAccepted.professionalSummary) +
      Number(overrides.aiAccepted.linksDescription) +
      Object.values(overrides.aiAccepted.projectDescriptions).filter(Boolean).length;

    if (aiAcceptedCountRef.current !== null && acceptedCount > aiAcceptedCountRef.current) {
      triggerSpriteReaction("ai-accepted");
    }

    aiAcceptedCountRef.current = acceptedCount;
  }, [overrides.aiAccepted]);

  function toggleCustomizePanel(nextOpen?: boolean) {
    setIsCustomizeOpen((current) => {
      const resolved = typeof nextOpen === "boolean" ? nextOpen : !current;

      if (resolved) {
        trackAnalyticsEvent("Customize Panel Opened");
      }

      return resolved;
    });
  }

  function revealInspector(nextTab?: InspectorTab) {
    if (nextTab) {
      setActiveInspectorTab(nextTab);
    }

    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1279px)").matches) {
      toggleCustomizePanel(true);
    }
  }

  function focusSection(sectionId: string, nextTab: InspectorTab = "section") {
    setSelectedSectionId(sectionId);
    if (!isEditMode) {
      toggleEditMode(true);
    }
    revealInspector(nextTab);
  }

  function stopSectionResize() {
    sectionResizeRef.current = null;
    setResizingSectionIds([]);
  }

  function startSectionResize(
    rowId: string,
    leftSectionId: string,
    rightSectionId: string,
    event: PointerEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (overrides.appearance.sectionLayout === "stacked") {
      return;
    }

    const leftComponent = overrides.layout.components.find((item) => item.id === leftSectionId);
    const rightComponent = overrides.layout.components.find((item) => item.id === rightSectionId);

    if (!leftComponent || !rightComponent || !canSectionsShareRow(leftComponent, rightComponent)) {
      return;
    }

    if ((leftComponent.rowId || leftComponent.id) !== rowId || (rightComponent.rowId || rightComponent.id) !== rowId) {
      return;
    }

    const rowElement = event.currentTarget.closest("[data-layout-row-id]");

    if (!(rowElement instanceof HTMLElement)) {
      return;
    }

    sectionResizeRef.current = {
      leftSectionId,
      rightSectionId,
      rowId,
      startX: event.clientX,
      rowWidth: Math.max(rowElement.getBoundingClientRect().width, 1),
      leftStart: getCanvasSectionWidthRatio(leftComponent),
      rightStart: getCanvasSectionWidthRatio(rightComponent),
    };
    setResizingSectionIds([leftSectionId, rightSectionId]);
  }

  function toggleEditMode(nextOpen?: boolean) {
    setIsEditMode((current) => {
      const resolved = typeof nextOpen === "boolean" ? nextOpen : !current;

      if (resolved && !current) {
        triggerSpriteReaction("editor-open");
      }

      return resolved;
    });
  }

  function cycleAppTheme() {
    const nextTheme =
      themeChoice === "system" ? "light" : themeChoice === "light" ? "dark" : "system";

    setThemeChoice(nextTheme);
    triggerSpriteReaction("theme-change", nextTheme);
  }

  function getTourHighlightProps(targetId: string) {
    return {
      [WALKTHROUGH_TARGET_ATTRIBUTE]: targetId,
    };
  }

  function countPendingAiSuggestions(current: PortfolioOverrides) {
    let count = 0;

    if (current.hero.headlineSuggestion.trim()) count += 1;
    if (current.hero.subheadlineSuggestion.trim()) count += 1;
    if (current.aboutSuggestion.trim()) count += 1;
    if (current.contact.descriptionSuggestion.trim()) count += 1;
    if (current.professional.titleSuggestion.trim()) count += 1;
    if (current.professional.summarySuggestion.trim()) count += 1;
    if (current.linksSection.descriptionSuggestion.trim()) count += 1;

    for (const project of Object.values(current.projectOverrides)) {
      if (project.descriptionSuggestion.trim()) {
        count += 1;
      }
    }

    return count;
  }

  function acceptAllAiSuggestions() {
    updateOverrides((current) => {
      const nextProjectOverrides = { ...current.projectOverrides };

      for (const [name, project] of Object.entries(nextProjectOverrides)) {
        if (!project.descriptionSuggestion.trim()) {
          continue;
        }

        nextProjectOverrides[name] = {
          ...project,
          description: project.descriptionSuggestion,
          descriptionSuggestion: "",
          acceptedAi: true,
        };
      }

      return {
        ...current,
        hero: {
          ...current.hero,
          headline: current.hero.headlineSuggestion.trim() || current.hero.headline,
          headlineSuggestion: "",
          subheadline: current.hero.subheadlineSuggestion.trim() || current.hero.subheadline,
          subheadlineSuggestion: "",
        },
        about: {
          ...current.about,
          description: current.aboutSuggestion.trim() || current.about.description,
        },
        aboutSuggestion: "",
        contact: {
          ...current.contact,
          description: current.contact.descriptionSuggestion.trim() || current.contact.description,
          descriptionSuggestion: "",
        },
        professional: {
          ...current.professional,
          title: current.professional.titleSuggestion.trim() || current.professional.title,
          titleSuggestion: "",
          summary: current.professional.summarySuggestion.trim() || current.professional.summary,
          summarySuggestion: "",
        },
        projectOverrides: nextProjectOverrides,
        linksSection: {
          ...current.linksSection,
          description: current.linksSection.descriptionSuggestion.trim() || current.linksSection.description,
          descriptionSuggestion: "",
        },
        aiAccepted: {
          ...current.aiAccepted,
          heroHeadline: Boolean(current.hero.headlineSuggestion.trim() || current.aiAccepted.heroHeadline),
          heroSubheadline: Boolean(current.hero.subheadlineSuggestion.trim() || current.aiAccepted.heroSubheadline),
          aboutDescription: Boolean(current.aboutSuggestion.trim() || current.aiAccepted.aboutDescription),
          contactDescription: Boolean(current.contact.descriptionSuggestion.trim() || current.aiAccepted.contactDescription),
          professionalTitle: Boolean(current.professional.titleSuggestion.trim() || current.aiAccepted.professionalTitle),
          professionalSummary: Boolean(current.professional.summarySuggestion.trim() || current.aiAccepted.professionalSummary),
          linksDescription: Boolean(current.linksSection.descriptionSuggestion.trim() || current.aiAccepted.linksDescription),
          projectDescriptions: Object.fromEntries(
            Object.entries(nextProjectOverrides).map(([name, project]) => [
              name,
              project.acceptedAi || false,
            ]),
          ),
        },
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setEnhanceError(null);
    setEnrichError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profileUrl }),
      });

      const result = (await response.json()) as
        | GeneratePreviewResponse
        | { error: string };

      if (!response.ok) {
        setPreview(null);
        setOverrides(buildEmptyOverrides());
        setError("error" in result ? result.error : "Something went wrong.");
        trackAnalyticsEvent("GitHub Import Failed", {
          stage: "response",
        });
        return;
      }

      if ("error" in result) {
        setPreview(null);
        setOverrides(buildEmptyOverrides());
        setError(result.error);
        trackAnalyticsEvent("GitHub Import Failed", {
          stage: "payload",
        });
        return;
      }

      setPreview(result);
      setOverrides((current) => {
        const reset = buildEmptyOverrides();

        return {
          ...reset,
          layout: {
            ...current.layout,
            projectOrder: [],
          },
          appearance: current.appearance,
          linksSection: {
            ...reset.linksSection,
            resumeUrl: current.linksSection.resumeUrl,
            coverLetterUrl: current.linksSection.coverLetterUrl,
          },
          documents: current.documents,
        };
      });
      setIsEditMode(false);
      trackAnalyticsEvent("GitHub Import Completed", {
        repositoryCount: result.featuredRepositories.length,
        techCount: result.techStack.length,
      });
    } catch {
      setPreview(null);
      setOverrides(buildEmptyOverrides());
      setError("Something went wrong while creating the preview.");
      trackAnalyticsEvent("GitHub Import Failed", {
        stage: "network",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function updateOverrides(updater: (current: PortfolioOverrides) => PortfolioOverrides) {
    setOverrides((current) => updater(current));
  }

  async function handleEnhance() {
    if (!preview) {
      return;
    }

    setIsEnhancing(true);
    setEnhanceError(null);

    try {
      const response = await fetch("/api/enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ draft: preview, overrides, enrichmentResults }),
      });

      const result = (await response.json()) as
        | { enhancement: PortfolioEnhancement; model: string }
        | { error: string };

      if (!response.ok || "error" in result) {
        setEnhanceError("error" in result ? result.error : "AI enhancement failed.");
        trackAnalyticsEvent("AI Enhance Failed");
        return;
      }

      setOverrides((current) =>
        applyEnhancementToOverrides(current, result.enhancement, preview.featuredRepositories),
      );
      trackAnalyticsEvent("AI Enhance Completed", {
        projectCount: preview.featuredRepositories.length,
      });
    } catch {
      setEnhanceError("Something went wrong while requesting AI suggestions.");
      trackAnalyticsEvent("AI Enhance Failed");
    } finally {
      setIsEnhancing(false);
    }
  }

  async function handleExportZip() {
    if (!preview) {
      return;
    }

    setIsExporting(true);

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ preview, overrides }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(result?.error ?? "Something went wrong while exporting the portfolio ZIP.");
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename=\"([^\"]+)\"/i);
      const filename = filenameMatch?.[1] ?? "portfolio-export.zip";
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
      triggerSpriteReaction("export");
      trackAnalyticsEvent("Portfolio Exported");
    } catch {
      setError("Something went wrong while exporting the portfolio ZIP.");
      trackAnalyticsEvent("Portfolio Export Failed");
    } finally {
      setIsExporting(false);
    }
  }

  async function handlePublishShareLink() {
    if (!preview) {
      return;
    }

    if (!authSession) {
      setShareError("Sign in with GitHub before publishing a public portfolio link.");
      return;
    }

    setIsPublishingShare(true);
    setShareError(null);

    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preview,
          overrides,
          slug: shareSlug.trim(),
        }),
      });

      const result = (await response.json()) as
        | {
            id: string;
            slug: string;
            path: string;
            updatedAt: string;
            publishedAt: string;
            metadata: {
              imageUrl: string;
              shareText: string;
            };
          }
        | { error: string };

      if (!response.ok || "error" in result) {
        setShareError("error" in result ? result.error : "Something went wrong while creating the public link.");
        trackAnalyticsEvent("Portfolio Share Failed");
        return;
      }

      const absoluteUrl = `${window.location.origin}${result.path}`;
      setShareSlug(result.slug);
      setSharedPortfolioUrl(absoluteUrl);
      setShareImageUrl(result.metadata.imageUrl);
      setShareCaption(result.metadata.shareText);
      setSharePublishedAt(result.publishedAt);
      setShareCopied(false);
      setShareCaptionCopied(false);
      trackAnalyticsEvent("Portfolio Shared", {
        slug: result.slug,
      });
    } catch {
      setShareError("Something went wrong while creating the public link.");
      trackAnalyticsEvent("Portfolio Share Failed");
    } finally {
      setIsPublishingShare(false);
    }
  }

  async function handleCopyShareLink() {
    if (!sharedPortfolioUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(sharedPortfolioUrl);
      setShareCopied(true);
      trackAnalyticsEvent("Portfolio Share Link Copied");
    } catch {
      setShareError("Copy did not work in this browser. You can still use the public link directly.");
    }
  }

  async function handleCopyShareCaption() {
    if (!shareCaption) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareCaption);
      setShareCaptionCopied(true);
      trackAnalyticsEvent("Portfolio Share Caption Copied");
    } catch {
      setShareError("Copy did not work in this browser. You can still select the share text manually.");
    }
  }

  async function handlePublishTemplate() {
    if (!preview) {
      return;
    }

    if (!authSession) {
      setTemplateError("Sign in with GitHub before publishing a community template.");
      setTemplateMessage(null);
      return;
    }

    setIsPublishingTemplate(true);
    setTemplateError(null);
    setTemplateMessage(null);

    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preview,
          overrides,
          title: templateTitle,
          description: templateDescription,
          category: templateCategory,
          tags: templateTags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });

      const result = (await response.json()) as
        | {
            template: {
              title: string;
              slug: string;
            };
          }
        | { error: string };

      if (!response.ok || "error" in result) {
        setTemplateError("error" in result ? result.error : "Something went wrong while publishing the template.");
        return;
      }

      setTemplateMessage(`Published template: ${result.template.title}`);
      trackAnalyticsEvent("Template Published", {
        slug: result.template.slug,
      });
    } catch {
      setTemplateError("Something went wrong while publishing the template.");
    } finally {
      setIsPublishingTemplate(false);
    }
  }

  async function handleShareAnywhere() {
    if (!sharedPortfolioUrl || typeof navigator === "undefined" || !("share" in navigator)) {
      return;
    }

    try {
      await navigator.share({
        title: `${portfolio.hero.name} | Portfolio`,
        text: shareCaption || `Take a look at ${portfolio.hero.name}'s portfolio`,
        url: sharedPortfolioUrl,
      });
      trackAnalyticsEvent("Portfolio Shared Anywhere");
    } catch {
      // Ignore cancel/error because the panel still offers explicit fallback actions.
    }
  }

  function openPlatformFallback(url: string, analyticsEvent: string) {
    window.open(url, "_blank", "noopener,noreferrer");
    trackAnalyticsEvent(analyticsEvent);
  }

  async function handleEnrich() {
    const urls = enrichmentInput
      .split(/\r?\n|,/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (urls.length === 0 && uploadedResumeFiles.length === 0) {
      setEnrichError("Paste at least one public URL or upload at least one PDF resume or cover letter to import suggestions.");
      return;
    }

    setIsEnriching(true);
    setEnrichError(null);

    try {
      const hasFiles = uploadedResumeFiles.length > 0;
      const response = await fetch(
        "/api/enrich",
        hasFiles
          ? {
              method: "POST",
              body: (() => {
                const formData = new FormData();
                formData.set("urls", urls.join("\n"));
                for (const file of uploadedResumeFiles) {
                  formData.append("files", file);
                }
                return formData;
              })(),
            }
          : {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ urls }),
            },
      );

      const result = (await response.json()) as
        | { sources: EnrichmentSourceResult[] }
        | { error: string };

      if (!response.ok || "error" in result) {
        setEnrichError("error" in result ? result.error : "Import failed.");
        trackAnalyticsEvent("Profile Import Failed", {
          sourceCount: urls.length + uploadedResumeFiles.length,
        });
        return;
      }

      setEnrichmentResults((current) => mergeEnrichmentResults(current, result.sources));
      trackAnalyticsEvent("Profile Import Completed", {
        sourceCount: result.sources.length,
      });
    } catch {
      setEnrichError("Something went wrong while importing external profile data.");
      trackAnalyticsEvent("Profile Import Failed", {
        sourceCount: urls.length + uploadedResumeFiles.length,
      });
    } finally {
      setIsEnriching(false);
    }
  }

  async function importResumeFiles(files: File[]) {
    if (files.length === 0) {
      return;
    }

    trackAnalyticsEvent("Resume Upload Started", {
      fileCount: files.length,
    });

    setUploadedResumeFiles(files);
    setIsEnriching(true);
    setEnrichError(null);

    try {
      const dataUrlEntries = await Promise.all(
        files.map(async (file) => ({
          file,
          dataUrl: await readFileAsDataUrl(file),
        })),
      );
      const resumeEntry = dataUrlEntries.find(({ file }) => !/cover[-_\s]?letter/i.test(file.name));
      const coverLetterEntry = dataUrlEntries.find(({ file }) => /cover[-_\s]?letter/i.test(file.name));

      updateOverrides((current) => ({
        ...current,
        documents: {
          ...current.documents,
          resumeAssetUrl: resumeEntry?.dataUrl ?? current.documents.resumeAssetUrl,
          resumeFileName: resumeEntry?.file.name ?? current.documents.resumeFileName,
          coverLetterAssetUrl:
            coverLetterEntry?.dataUrl ?? current.documents.coverLetterAssetUrl,
          coverLetterFileName:
            coverLetterEntry?.file.name ?? current.documents.coverLetterFileName,
        },
      }));

      const formData = new FormData();
      formData.set("urls", enrichmentInput.trim());

      for (const file of files) {
        formData.append("files", file);
      }

      const response = await fetch("/api/enrich", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as
        | { sources: EnrichmentSourceResult[] }
        | { error: string };

      if (!response.ok || "error" in result) {
        setEnrichError("error" in result ? result.error : "Import failed.");
        trackAnalyticsEvent("Resume Upload Failed", {
          fileCount: files.length,
        });
        return;
      }

      setEnrichmentResults((current) => mergeEnrichmentResults(current, result.sources));
      trackAnalyticsEvent("Resume Upload Completed", {
        fileCount: files.length,
      });
    } catch {
      setEnrichError("Something went wrong while importing external profile data.");
      trackAnalyticsEvent("Resume Upload Failed", {
        fileCount: files.length,
      });
    } finally {
      setIsEnriching(false);
    }
  }

  function handleResumeUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf"),
    );

    if ((event.target.files?.length ?? 0) > files.length) {
      setEnrichError("Only PDF resumes and cover letters are supported right now.");
    } else {
      setEnrichError(null);
    }

    if (files.length > 0) {
      void importResumeFiles(files);
    }

    event.target.value = "";
  }

  function removeUploadedResume(name: string) {
    setUploadedResumeFiles((current) => current.filter((file) => file.name !== name));
    setEnrichmentResults((current) =>
      current.filter((source) => source.sourceUrl !== `upload://${name}`),
    );
    updateOverrides((current) => {
      const isResume = current.documents.resumeFileName === name;
      const isCoverLetter = current.documents.coverLetterFileName === name;

      if (!isResume && !isCoverLetter) {
        return current;
      }

      return {
        ...current,
        documents: {
          ...current.documents,
          resumeAssetUrl: isResume ? "" : current.documents.resumeAssetUrl,
          resumeFileName: isResume ? "" : current.documents.resumeFileName,
          coverLetterAssetUrl: isCoverLetter ? "" : current.documents.coverLetterAssetUrl,
          coverLetterFileName: isCoverLetter ? "" : current.documents.coverLetterFileName,
        },
      };
    });
  }

  function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }

        reject(new Error("Unable to read file."));
      };
      reader.onerror = () => reject(reader.error ?? new Error("Unable to read file."));
      reader.readAsDataURL(file);
    });
  }

  function handleProjectImageUpload(repositoryName: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !file.type.startsWith("image/")) {
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";

      if (result) {
        setProjectImageOverride(repositoryName, result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function handleHeroImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !file.type.startsWith("image/")) {
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      updateOverrides((current) => ({
        ...current,
        hero: {
          ...current.hero,
          imageUrl: dataUrl,
        },
      }));
    } finally {
      event.target.value = "";
    }
  }

  function dismissEnrichmentSuggestion(sourceUrl: string, suggestionId: string) {
    setEnrichmentResults((current) =>
      current
        .map((source) =>
          source.sourceUrl === sourceUrl
            ? {
                ...source,
                suggestions: source.suggestions.filter((suggestion) => suggestion.id !== suggestionId),
              }
            : source,
        )
        .filter(
          (source) =>
            source.status === "failed" ||
            source.suggestions.length > 0 ||
            source.notes.length > 0 ||
            source.images.length > 0,
        ),
    );
  }

  function applyEnrichmentSuggestion(suggestion: EnrichmentSuggestion) {
    updateOverrides((current) => {
      switch (suggestion.field) {
        case "hero.headline":
          return { ...current, hero: { ...current.hero, headline: suggestion.value } };
        case "hero.subheadline":
          return { ...current, hero: { ...current.hero, subheadline: suggestion.value } };
        case "about.description":
          return { ...current, about: { ...current.about, description: suggestion.value } };
        case "professional.summary":
          return { ...current, professional: { ...current.professional, summary: suggestion.value } };
        case "professional.company":
          return { ...current, professional: { ...current.professional, company: suggestion.value } };
        case "professional.location":
          return { ...current, professional: { ...current.professional, location: suggestion.value } };
        case "professional.availability":
          return { ...current, professional: { ...current.professional, availability: suggestion.value } };
        case "contact.email":
          return { ...current, contact: { ...current.contact, email: suggestion.value } };
        case "contact.phone":
          return { ...current, contact: { ...current.contact, phone: suggestion.value } };
        case "linksSection.resumeUrl":
          return { ...current, linksSection: { ...current.linksSection, resumeUrl: suggestion.value } };
        case "linksSection.coverLetterUrl":
          return { ...current, linksSection: { ...current.linksSection, coverLetterUrl: suggestion.value } };
        case "linksSection.linkedIn":
          return { ...current, linksSection: { ...current.linksSection, linkedIn: suggestion.value } };
        case "linksSection.handshakeUrl":
          return { ...current, linksSection: { ...current.linksSection, handshakeUrl: suggestion.value } };
        case "linksSection.portfolioUrl":
          return { ...current, linksSection: { ...current.linksSection, portfolioUrl: suggestion.value } };
        case "linksSection.customLink": {
          const exists = current.linksSection.customLinks.some((link) => link.href === suggestion.value);

          if (exists) {
            return current;
          }

          return {
            ...current,
            linksSection: {
              ...current.linksSection,
              customLinks: [
                ...current.linksSection.customLinks,
                {
                  id: createLinkId(),
                  label: suggestion.auxiliaryLabel || "Imported Link",
                  href: suggestion.value,
                },
              ],
            },
          };
        }
        default:
          return current;
      }
    });

    dismissEnrichmentSuggestion(suggestion.sourceUrl, suggestion.id);
  }

  function updateCustomLink(linkId: string, key: "label" | "href", value: string) {
    updateOverrides((current) => ({
      ...current,
      linksSection: {
        ...current.linksSection,
        customLinks: current.linksSection.customLinks.map((link) =>
          link.id === linkId ? { ...link, [key]: value } : link,
        ),
      },
    }));
  }

  function addCustomLink() {
    updateOverrides((current) => ({
      ...current,
      linksSection: {
        ...current.linksSection,
        customLinks: [
          ...current.linksSection.customLinks,
          {
            id: createLinkId(),
            label: "",
            href: "",
          },
        ],
      },
    }));
  }

  function removeCustomLink(linkId: string) {
    updateOverrides((current) => ({
      ...current,
      linksSection: {
        ...current.linksSection,
        customLinks: current.linksSection.customLinks.filter((link) => link.id !== linkId),
      },
    }));
  }

  function setProjectImageOverride(repositoryName: string, imageUrl: string) {
    updateOverrides((current) => {
      const nextProjectOverrides = { ...current.projectOverrides };
      const existingOverride = current.projectOverrides[repositoryName];

      if (imageUrl.trim()) {
        nextProjectOverrides[repositoryName] = {
          imageUrl,
          hideImage: false,
          description: existingOverride?.description ?? "",
          descriptionSuggestion: existingOverride?.descriptionSuggestion ?? "",
          acceptedAi: existingOverride?.acceptedAi ?? false,
        };
      } else if (existingOverride?.description || existingOverride?.descriptionSuggestion) {
        nextProjectOverrides[repositoryName] = {
          imageUrl: "",
          hideImage: existingOverride?.hideImage ?? false,
          description: existingOverride.description,
          descriptionSuggestion: existingOverride.descriptionSuggestion,
          acceptedAi: existingOverride.acceptedAi,
        };
      } else {
        delete nextProjectOverrides[repositoryName];
      }

      return {
        ...current,
        projectOverrides: nextProjectOverrides,
      };
    });
  }

  function removeProjectImage(repositoryName: string) {
    updateOverrides((current) => {
      const nextProjectOverrides = { ...current.projectOverrides };
      const existingOverride = current.projectOverrides[repositoryName];

      const nextOverride = {
        imageUrl: "",
        hideImage: true,
        description: existingOverride?.description ?? "",
        descriptionSuggestion: existingOverride?.descriptionSuggestion ?? "",
        acceptedAi: existingOverride?.acceptedAi ?? false,
      };

      if (!nextOverride.description.trim() && !nextOverride.descriptionSuggestion.trim()) {
        nextProjectOverrides[repositoryName] = nextOverride;
      } else {
        nextProjectOverrides[repositoryName] = nextOverride;
      }

      return {
        ...current,
        projectOverrides: nextProjectOverrides,
      };
    });
  }

  function restoreDefaultProjectImage(repositoryName: string) {
    updateOverrides((current) => {
      const nextProjectOverrides = { ...current.projectOverrides };
      const existingOverride = current.projectOverrides[repositoryName];

      if (!existingOverride) {
        return current;
      }

      const nextOverride = {
        imageUrl: "",
        hideImage: false,
        description: existingOverride.description ?? "",
        descriptionSuggestion: existingOverride.descriptionSuggestion ?? "",
        acceptedAi: existingOverride.acceptedAi ?? false,
      };

      if (!nextOverride.description.trim() && !nextOverride.descriptionSuggestion.trim()) {
        delete nextProjectOverrides[repositoryName];
      } else {
        nextProjectOverrides[repositoryName] = nextOverride;
      }

      return {
        ...current,
        projectOverrides: nextProjectOverrides,
      };
    });
  }

  function setProjectDescriptionOverride(
    repositoryName: string,
    description: string,
    source: "user" | "ai" = "user",
  ) {
    updateOverrides((current) => {
      const nextProjectOverrides = { ...current.projectOverrides };
      const existingOverride = current.projectOverrides[repositoryName];
      const nextOverride = {
        imageUrl: existingOverride?.imageUrl ?? "",
        hideImage: existingOverride?.hideImage ?? false,
        description,
        descriptionSuggestion:
          source === "ai" ? "" : (existingOverride?.descriptionSuggestion ?? ""),
        acceptedAi: source === "ai",
      };

      if (
        !nextOverride.imageUrl.trim() &&
        !nextOverride.hideImage &&
        !nextOverride.description.trim() &&
        !nextOverride.descriptionSuggestion.trim()
      ) {
        delete nextProjectOverrides[repositoryName];
      } else {
        nextProjectOverrides[repositoryName] = nextOverride;
      }

      return {
        ...current,
        projectOverrides: nextProjectOverrides,
        aiAccepted: {
          ...current.aiAccepted,
          projectDescriptions: {
            ...current.aiAccepted.projectDescriptions,
            [repositoryName]: source === "ai",
          },
        },
      };
    });
  }

  function dismissProjectDescriptionSuggestion(repositoryName: string) {
    updateOverrides((current) => {
      const nextProjectOverrides = { ...current.projectOverrides };
      const existingOverride = current.projectOverrides[repositoryName];
      const nextOverride = {
        imageUrl: existingOverride?.imageUrl ?? "",
        hideImage: existingOverride?.hideImage ?? false,
        description: existingOverride?.description ?? "",
        descriptionSuggestion: "",
        acceptedAi: existingOverride?.acceptedAi ?? false,
      };

      if (!nextOverride.imageUrl.trim() && !nextOverride.hideImage && !nextOverride.description.trim()) {
        delete nextProjectOverrides[repositoryName];
      } else {
        nextProjectOverrides[repositoryName] = nextOverride;
      }

      return {
        ...current,
        projectOverrides: nextProjectOverrides,
      };
    });
  }

  function appendEnrichmentSource(nextSource: string) {
    setEnrichmentInput((current) => {
      const trimmed = nextSource.trim();

      if (!trimmed) {
        return current;
      }

      const existing = current
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean);

      if (existing.includes(trimmed)) {
        return current;
      }

      return existing.length > 0 ? `${current.trim()}\n${trimmed}` : trimmed;
    });
  }

  function toggleProjectImportPanel(repositoryName: string) {
    setOpenProjectImports((current) => ({
      ...current,
      [repositoryName]: !current[repositoryName],
    }));
  }

  function reorderProjects(draggedName: string, targetName: string) {
    updateOverrides((current) => {
      const baseOrder =
        current.layout.projectOrder.length > 0
          ? current.layout.projectOrder
          : (preview?.featuredRepositories ?? FALLBACK_REPOSITORIES).map((repository) => repository.name);
      const draggedIndex = baseOrder.indexOf(draggedName);
      const targetIndex = baseOrder.indexOf(targetName);

      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
        return current;
      }

      const nextOrder = [...baseOrder];
      const [draggedProject] = nextOrder.splice(draggedIndex, 1);
      nextOrder.splice(targetIndex, 0, draggedProject);

      return {
        ...current,
        layout: {
          ...current.layout,
          projectOrder: nextOrder,
        },
      };
    });
  }

  function makeFeaturedProject(repositoryName: string) {
    const currentOrder =
      overrides.layout.projectOrder.length > 0
        ? overrides.layout.projectOrder
        : repositories.map((repository) => repository.name);
    const remaining = currentOrder.filter((name) => name !== repositoryName);

    updateOverrides((current) => ({
      ...current,
      layout: {
        ...current.layout,
        projectOrder: [repositoryName, ...remaining],
      },
    }));
  }

  function handleProjectDragStart(repositoryName: string) {
    setDraggedProjectName(repositoryName);
    setProjectDropTargetName(null);
    triggerSpriteReaction("drag-start", repositoryName);
  }

  function handleProjectDragOver(repositoryName: string) {
    if (!draggedProjectName || draggedProjectName === repositoryName) {
      return;
    }

    setProjectDropTargetName(repositoryName);
  }

  function handleProjectDrop(repositoryName: string) {
    if (!draggedProjectName || draggedProjectName === repositoryName) {
      setDraggedProjectName(null);
      setProjectDropTargetName(null);
      return;
    }

    reorderProjects(draggedProjectName, repositoryName);
    setDraggedProjectName(null);
    setProjectDropTargetName(null);
  }

  function handleProjectDragEnd() {
    setDraggedProjectName(null);
    setProjectDropTargetName(null);
    triggerSpriteReaction("drag-end");
  }

  function updateLayoutComponents(
    updater: (components: PortfolioCanvasComponent[]) => PortfolioCanvasComponent[],
  ) {
    updateOverrides((current) => {
      const nextComponents = normalizeLayoutComponents(
        updater(
          normalizeLayoutComponents(
            current.layout.components,
            current.layout.sectionOrder,
            current.layout.hiddenSections,
          ),
        ),
        current.layout.sectionOrder,
        current.layout.hiddenSections,
      );

      return {
        ...current,
        layout: {
          ...current.layout,
          components: nextComponents,
          sectionOrder: getSectionOrderFromComponents(nextComponents),
          hiddenSections: getHiddenSectionsFromComponents(nextComponents),
          componentOrder: { ...current.layout.componentOrder },
          hiddenComponentIds: [...current.layout.hiddenComponentIds],
        },
      };
    });
  }

  function updateChildComponentOrder(
    parentId: string,
    defaultIds: string[],
    updater: (ids: string[]) => string[],
  ) {
    updateOverrides((current) => {
      const baseOrder = orderCanvasChildIds(
        defaultIds,
        current.layout.componentOrder[parentId],
      );
      const nextOrder = orderCanvasChildIds(defaultIds, updater(baseOrder));

      return {
        ...current,
        layout: {
          ...current.layout,
          componentOrder: {
            ...current.layout.componentOrder,
            [parentId]: nextOrder,
          },
        },
      };
    });
  }

  function moveChildComponent(
    parentId: string,
    defaultIds: string[],
    componentId: string,
    direction: -1 | 1,
  ) {
    updateChildComponentOrder(parentId, defaultIds, (ids) => {
      const index = ids.indexOf(componentId);

      if (index === -1) {
        return ids;
      }

      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= ids.length) {
        return ids;
      }

      const next = [...ids];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  function reorderChildComponent(
    parentId: string,
    defaultIds: string[],
    draggedId: string,
    targetId: string,
  ) {
    updateChildComponentOrder(parentId, defaultIds, (ids) => {
      const draggedIndex = ids.indexOf(draggedId);
      const targetIndex = ids.indexOf(targetId);

      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
        return ids;
      }

      const next = [...ids];
      const [item] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  }

  function setChildComponentVisible(componentId: string, visible: boolean) {
    updateOverrides((current) => {
      const nextHidden = new Set(current.layout.hiddenComponentIds);

      if (visible) {
        nextHidden.delete(componentId);
      } else {
        nextHidden.add(componentId);
      }

      return {
        ...current,
        layout: {
          ...current.layout,
          hiddenComponentIds: Array.from(nextHidden),
        },
      };
    });
  }

  function resetCanvasLayout() {
    updateOverrides((current) => ({
      ...current,
      layout: {
        ...current.layout,
        sectionOrder: [...DEFAULT_SECTION_ORDER],
        hiddenSections: [],
        components: [
          ...buildLayoutComponents(),
          ...current.customSections.map((section) => ({
            id: section.id,
            type: "custom" as const,
            visible: true,
            rowId: section.id,
            width: "full" as const,
            widthRatio: 1,
            title: section.title,
          })),
        ],
        componentOrder: {},
        hiddenComponentIds: [],
      },
    }));
  }

  function updateCustomPalette(
    key: keyof PreviewTheme["palette"],
    value: string,
  ) {
    updateOverrides((current) => ({
      ...current,
      appearance: {
        ...current.appearance,
        customPalette: {
          ...(current.appearance.customPalette ?? {}),
          [key]: value,
        },
      },
    }));
  }

  function resetCustomPaletteField(key: keyof PreviewTheme["palette"]) {
    updateOverrides((current) => {
      const nextPalette = { ...(current.appearance.customPalette ?? {}) };
      delete nextPalette[key];

      return {
        ...current,
        appearance: {
          ...current.appearance,
          customPalette: nextPalette,
        },
      };
    });
  }

  function clearCustomPalette() {
    updateOverrides((current) => ({
      ...current,
      appearance: {
        ...current.appearance,
        customPalette: {},
      },
    }));
  }

  function updateSectionOrder(sectionId: PortfolioSectionId, direction: -1 | 1) {
    updateLayoutComponents((components) => moveCanvasComponent(components, sectionId, direction));
  }

  function toggleSectionVisibility(sectionId: string) {
    updateLayoutComponents((components) =>
      components.map((component) =>
        component.id === sectionId ? { ...component, visible: !component.visible } : component,
      ),
    );
  }

  function restoreSection(sectionId: string) {
    updateLayoutComponents((components) =>
      components.map((component) =>
        component.id === sectionId ? { ...component, visible: true } : component,
      ),
    );
  }

  function handleSectionDragStart(sectionId: string) {
    setDraggedSectionId(sectionId);
    setDropTargetSectionId(null);
    setDropPosition(null);
    triggerSpriteReaction("drag-start", sectionId);
  }

  function handleSectionDragOver(event: DragEvent<HTMLElement>, sectionId: string) {
    if (!draggedSectionId || draggedSectionId === sectionId) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const targetComponent = overrides.layout.components.find((component) => component.id === sectionId);
    const draggedComponent = overrides.layout.components.find((component) => component.id === draggedSectionId);
    const relativeX = event.clientX - bounds.left;
    const relativeY = event.clientY - bounds.top;
    const horizontalDropAllowed =
      overrides.appearance.sectionLayout !== "stacked" &&
      targetComponent &&
      draggedComponent &&
      canSectionShareRow(targetComponent) &&
      canSectionShareRow(draggedComponent);

    const nextDropPosition =
      horizontalDropAllowed && relativeX <= bounds.width * 0.3
        ? "left"
        : horizontalDropAllowed && relativeX >= bounds.width * 0.7
          ? "right"
          : relativeY >= bounds.height / 2
            ? "after"
            : "before";
    setDropTargetSectionId(sectionId);
    setDropPosition(nextDropPosition);
  }

  function handleSectionDrop(sectionId: string) {
    if (!draggedSectionId || draggedSectionId === sectionId) {
      setDraggedSectionId(null);
      setDropTargetSectionId(null);
      setDropPosition(null);
      return;
    }

    updateLayoutComponents((components) =>
      reorderCanvasComponent(components, draggedSectionId, sectionId, dropPosition ?? "before"),
    );

    setDraggedSectionId(null);
    setDropTargetSectionId(null);
    setDropPosition(null);
  }

  function handleSectionDragEnd() {
    setDraggedSectionId(null);
    setDropTargetSectionId(null);
    setDropPosition(null);
    triggerSpriteReaction("drag-end");
  }

  function addBuiltInSection(sectionId: PortfolioSectionId) {
    restoreSection(sectionId);
    focusSection(sectionId, "section");
  }

  function addCustomSection() {
    const sectionId = createCustomSectionId();
    const rowId = createLayoutRowId();

    updateOverrides((current) => ({
      ...current,
      customSections: [
        ...current.customSections,
        {
          id: sectionId,
          title: `Custom Section ${current.customSections.length + 1}`,
          description: "Add your own notes, skills, awards, or anything else you want to feature.",
        },
      ],
      layout: {
        ...current.layout,
        components: normalizeLayoutComponents([
          ...current.layout.components,
          {
            id: sectionId,
            type: "custom",
            visible: true,
            rowId,
            width: "full",
            widthRatio: 1,
            title: `Custom Section ${current.customSections.length + 1}`,
          },
        ]),
      },
    }));

    focusSection(sectionId, "content");
  }

  function duplicateSection(sectionId: string) {
    const sourceSection = overrides.customSections.find((section) => section.id === sectionId);

    if (!sourceSection) {
      return;
    }

    const nextId = createCustomSectionId();
    const sourceLayout = overrides.layout.components.find((component) => component.id === sectionId);

    updateOverrides((current) => ({
      ...current,
      customSections: [
        ...current.customSections,
        {
          id: nextId,
          title: `${sourceSection.title} Copy`,
          description: sourceSection.description,
        },
      ],
      layout: {
        ...current.layout,
        components: normalizeLayoutComponents([
          ...current.layout.components,
          {
            id: nextId,
            type: "custom",
            visible: true,
            rowId: createLayoutRowId(),
            width: sourceLayout?.width || "full",
            widthRatio: sourceLayout?.widthRatio || getCanvasSectionWidthRatio(sourceLayout ?? {
              id: nextId,
              type: "custom",
              visible: true,
            }),
            title: `${sourceSection.title} Copy`,
          },
        ]),
      },
    }));

    focusSection(nextId, "content");
  }

  function removeSection(sectionId: string) {
    const component = overrides.layout.components.find((item) => item.id === sectionId);

    if (!component) {
      return;
    }

    if (component.type === "custom") {
      updateOverrides((current) => ({
        ...current,
        customSections: current.customSections.filter((section) => section.id !== sectionId),
        layout: {
          ...current.layout,
          components: current.layout.components.filter((item) => item.id !== sectionId),
        },
      }));

      if (selectedSectionId === sectionId) {
        setSelectedSectionId(null);
      }
      return;
    }

    toggleSectionVisibility(sectionId);

    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null);
    }
  }

  function handleChildDragStart(componentId: string) {
    setDraggedChildComponentId(componentId);
    setDropTargetChildComponentId(null);
    triggerSpriteReaction("drag-start", componentId);
  }

  function handleChildDragOver(componentId: string) {
    if (!draggedChildComponentId || draggedChildComponentId === componentId) {
      return;
    }

    setDropTargetChildComponentId(componentId);
  }

  function handleChildDrop(parentId: string, defaultIds: string[], componentId: string) {
    if (!draggedChildComponentId || draggedChildComponentId === componentId) {
      setDraggedChildComponentId(null);
      setDropTargetChildComponentId(null);
      return;
    }

    reorderChildComponent(parentId, defaultIds, draggedChildComponentId, componentId);
    setDraggedChildComponentId(null);
    setDropTargetChildComponentId(null);
  }

  function handleChildDragEnd() {
    setDraggedChildComponentId(null);
    setDropTargetChildComponentId(null);
    triggerSpriteReaction("drag-end");
  }

  const baseHero = preview?.hero ?? FALLBACK_HERO;
  const baseAbout = preview?.about ?? FALLBACK_ABOUT;
  const baseContact = preview?.contact ?? FALLBACK_CONTACT;
  const baseLinksSection = preview?.linksSection ?? FALLBACK_LINKS_SECTION;
  const baseRepositories = preview?.featuredRepositories ?? FALLBACK_REPOSITORIES;
  const portfolio = buildFinalPortfolio(preview, overrides, {
    theme: FALLBACK_THEME,
    hero: FALLBACK_HERO,
    about: FALLBACK_ABOUT,
    contact: FALLBACK_CONTACT,
    linksSection: FALLBACK_LINKS_SECTION,
    repositories: FALLBACK_REPOSITORIES,
    links: FALLBACK_LINKS,
    techStack: FALLBACK_TECH_STACK,
  });
  const theme = portfolio.theme;
  const appThemeStyles = buildAppThemeStyles(renderTheme);
  const themeStyles = buildThemeStyles(
    theme,
    portfolio.appearance.cardStyle,
    portfolio.appearance.colorMode,
  );
  const activePalette = theme.palette;
  const repositories = portfolio.repositories;
  const links = portfolio.linksSection.links;
  const techStack = portfolio.techStack;
  const professional = portfolio.professional;
  const featuredProject = repositories[0];
  const secondaryProjects = repositories.slice(1, 5);
  const featuredProjectHasImage = Boolean(featuredProject?.resolvedImage);
  const heroHeadline = portfolio.hero.headline;
  const heroSubheadline = portfolio.hero.subheadline;
  const aboutTitle = portfolio.about.title;
  const aboutDescription = portfolio.about.description;
  const contactTitle = portfolio.contact.title;
  const contactDescription = portfolio.contact.description;
  const linksTitle = portfolio.linksSection.title;
  const linksDescription = portfolio.linksSection.description;
  const contactEmail = portfolio.contact.email;
  const contactText = portfolio.contact.customText;
  const contactEmailHref = portfolio.contact.emailHref;
  const canUseNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function" && Boolean(sharedPortfolioUrl);
  const shareText =
    shareCaption ||
    [
      `${portfolio.hero.name}'s portfolio`,
      heroHeadline.value,
      featuredProject?.name ? `Featured project: ${featuredProject.name}` : "",
    ]
      .filter(Boolean)
      .join(" — ");
  const shareLinkedInHref = sharedPortfolioUrl
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(sharedPortfolioUrl)}`
    : "";
  const shareTwitterHref = sharedPortfolioUrl
    ? `https://twitter.com/intent/tweet?url=${encodeURIComponent(sharedPortfolioUrl)}&text=${encodeURIComponent(shareText)}`
    : "";
  const shareFacebookHref = sharedPortfolioUrl
    ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(sharedPortfolioUrl)}`
    : "";
  const shareWhatsAppHref = sharedPortfolioUrl
    ? `https://wa.me/?text=${encodeURIComponent(`${shareText} ${sharedPortfolioUrl}`)}`
    : "";
  const shareTelegramHref = sharedPortfolioUrl
    ? `https://t.me/share/url?url=${encodeURIComponent(sharedPortfolioUrl)}&text=${encodeURIComponent(shareText)}`
    : "";
  const shareRedditHref = sharedPortfolioUrl
    ? `https://www.reddit.com/submit?url=${encodeURIComponent(sharedPortfolioUrl)}&title=${encodeURIComponent(`${portfolio.hero.name} | Portfolio`)}`
    : "";
  const shareEmailHref = sharedPortfolioUrl
    ? `mailto:?subject=${encodeURIComponent(`${portfolio.hero.name} | Portfolio`)}&body=${encodeURIComponent(`${shareText}\n\n${sharedPortfolioUrl}`)}`
    : "";
  const customizeLauncherStyle = {
    backgroundColor: theme.palette.accent,
    color: "#ffffff",
    borderColor:
      portfolio.appearance.colorMode === "dark"
        ? "rgba(255,255,255,0.9)"
        : "rgba(15,23,42,0.14)",
    boxShadow:
      portfolio.appearance.colorMode === "dark"
        ? `0 26px 60px -28px ${theme.palette.accent}`
        : `0 24px 52px -28px ${theme.palette.accent}`,
  } satisfies CSSProperties;
  const actionPriority = ["resume", "coverLetter", "linkedIn", "handshake", "portfolio", "github"] as const;
  const primaryProfessionalActions = professional.actions
    .filter((action) => action.id !== "email" && action.id !== "phone")
    .sort(
      (left, right) =>
        actionPriority.indexOf(left.id as (typeof actionPriority)[number]) -
        actionPriority.indexOf(right.id as (typeof actionPriority)[number]),
    );
  const heroActions = primaryProfessionalActions.slice(0, 4);
  const contactActionButtons = primaryProfessionalActions.filter((action) =>
    ["resume", "coverLetter", "linkedIn", "handshake"].includes(action.id),
  );
  const heroSummary =
    professional.summary ||
    preview?.profile.bio ||
    portfolio.summary ||
    aboutDescription.value;
  const heroFocusAreas = techStack.slice(0, 6);
  const heroHighlights = [
    professional.availability
      ? { label: "Availability", value: professional.availability }
      : null,
    professional.company || preview?.profile.company
      ? { label: "Company", value: professional.company || preview?.profile.company || "" }
      : null,
    professional.location || preview?.profile.location
      ? {
          label: "Location",
          value: professional.location || preview?.profile.location || "",
        }
      : null,
    featuredProject?.name ? { label: "Featured Project", value: featuredProject.name } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
  const heroIntroText =
    heroSubheadline.value.trim() ||
    professional.summary ||
    preview?.profile.bio ||
    (preview ? portfolio.summary : FALLBACK_HERO.subheadline);
  const contactMethods = [
    contactEmail
      ? {
          label: DEFAULT_CARD_LABELS.email,
          value: contactEmail,
          href: contactEmailHref,
        }
      : null,
    portfolio.contact.phone
      ? {
          label: DEFAULT_CARD_LABELS.phone,
          value: portfolio.contact.phone,
          href: portfolio.contact.phoneHref,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string; href: string }>;
  const hasOverrides = JSON.stringify(overrides) !== JSON.stringify(buildEmptyOverrides());
  const completenessChecks = [
    Boolean(portfolio.hero.headline.value.trim() && heroIntroText.trim()),
    Boolean(aboutDescription.value.trim()),
    Boolean(professional.summary.trim()),
    Boolean(repositories.length >= 2),
    Boolean(primaryProfessionalActions.length > 0),
  ];
  const completenessScore = Math.round(
    (completenessChecks.filter(Boolean).length / completenessChecks.length) * 100,
  );
  const missingGuidance = [
    !aboutDescription.value.trim() ? "Add an About summary" : null,
    !professional.summary.trim() ? "Add career highlights" : null,
    repositories.length < 2 ? "Import more project context" : null,
    primaryProfessionalActions.length === 0 ? "Add professional links or documents" : null,
  ].filter(Boolean) as string[];
  const densityClasses =
    portfolio.appearance.density === "compact"
      ? {
          heroPadding: "px-5 py-6 sm:px-7 sm:py-8",
          sectionPadding: "px-5 py-5 sm:px-7 sm:py-7",
          cardPadding: "p-5 sm:p-6",
          stackGap: "gap-5",
        }
      : {
          heroPadding: "px-5 py-8 sm:px-8 sm:py-10",
          sectionPadding: "px-5 py-6 sm:px-8 sm:py-9",
          cardPadding: "p-6 sm:p-8",
          stackGap: "gap-6",
        };
  const splitAboutClass =
    portfolio.appearance.sectionLayout === "stacked"
      ? "grid gap-6"
      : "grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]";
  const canvasComponents = portfolio.layout.components;
  const hiddenSections = new Set(
    canvasComponents
      .filter((component) => !component.visible && isBuiltInSectionType(component.type))
      .map((component) => component.type),
  );
  const showHero = !hiddenSections.has("hero");
  const showAbout = !hiddenSections.has("about") && Boolean(aboutDescription.value.trim());
  const showProfessional =
    !hiddenSections.has("professional") &&
    Boolean(
      professional.summary ||
        professional.location ||
        professional.availability ||
        professional.actions.length > 1 ||
        isEditMode,
    );
  const showProjects = !hiddenSections.has("projects") && repositories.length > 0;
  const showLinks = !hiddenSections.has("links") && links.length > 0;
  const showContact =
    !hiddenSections.has("contact") &&
    Boolean(contactDescription.value.trim() || contactText || contactMethods.length > 0 || isEditMode);
  const showStack = techStack.length > 0;
  const hasProfileDetails = Boolean(
    professional.company || preview?.profile.company || professional.location || preview?.profile.location || isEditMode,
  );
  const visibleCanvasComponents = canvasComponents.filter((component) => {
    if (!component.visible) {
      return false;
    }

    if (component.type === "custom") {
      const customSection = overrides.customSections.find((section) => section.id === component.id);
      return Boolean(customSection?.title.trim() || customSection?.description.trim() || isEditMode);
    }

    switch (component.type) {
        case "hero":
          return showHero;
        case "about":
          return showAbout;
        case "professional":
          return showProfessional;
        case "projects":
          return showProjects;
        case "links":
          return showLinks;
        case "contact":
          return showContact;
        default:
          return false;
      }
  });
  const hiddenCanvasComponents = canvasComponents.filter((component) => !component.visible);
  const sectionLabels: Record<PortfolioSectionType, string> = {
    hero: "Hero",
    about: "About",
    professional: "Professional",
    projects: "Projects",
    links: "Links",
    contact: "Contact",
    custom: "Custom",
  };
  const visibleSectionRows = visibleCanvasComponents.reduce<Array<{ id: string; items: PortfolioCanvasComponent[] }>>(
    (rows, component) => {
      const rowId =
        portfolio.appearance.sectionLayout === "stacked" || !canSectionShareRow(component)
          ? component.id
          : component.rowId || component.id;
      const existingRow = rows.find((row) => row.id === rowId);

      if (existingRow) {
        existingRow.items.push(component);
      } else {
        rows.push({ id: rowId, items: [component] });
      }

      return rows;
    },
    [],
  );
  const selectedCanvasComponent =
    visibleCanvasComponents.find((component) => component.id === selectedSectionId) ??
    canvasComponents.find((component) => component.id === selectedSectionId) ??
    null;
  const selectedCustomSection =
    selectedCanvasComponent?.type === "custom"
      ? overrides.customSections.find((section) => section.id === selectedCanvasComponent.id) ?? null
      : null;

  const hiddenChildComponentIds = new Set(overrides.layout.hiddenComponentIds);
  const componentOrder = overrides.layout.componentOrder;
  const heroActionItems = heroActions.map((action) => ({
    id: `hero-action:${action.id}`,
    label: action.label,
    action,
  }));
  const professionalActionItems = professional.actions
    .filter((action) => action.id !== "github")
    .map((action) => ({
      id: `professional-action:${action.id}`,
      label: action.label,
      action,
    }));
  const contactActionItems = contactActionButtons.map((action) => ({
    id: `contact-action:${action.id}`,
    label: action.label,
    action,
  }));
  const linkCardItems = links.map((link, index) => ({
    id: `link-card:${toCanvasKey(link.label)}-${index}`,
    label: link.label,
    link,
  }));
  const contactMethodItems = contactMethods.map((item) => ({
    id: `contact-method:${toCanvasKey(item.label)}`,
    label: item.label,
    item,
  }));
  const heroHighlightItems = heroHighlights.map((item) => ({
    id: `hero-highlight:${toCanvasKey(item.label)}`,
    label: item.label,
    item,
  }));
  const heroStackItems = heroFocusAreas.map((item) => ({
    id: `hero-stack:${toCanvasKey(item)}`,
    label: item,
    value: item,
  }));
  const secondaryProjectItems = secondaryProjects.map((repository) => ({
    id: `project-card:${toCanvasKey(repository.name)}`,
    label: repository.name,
    repository,
  }));

  const heroLeftDefaultIds = ["hero:image", "hero:name", "hero:title", "hero:intro", "hero:actions"];
  const heroRightDefaultIds = ["hero:summary", "hero:highlights", "hero:stack"];
  const aboutDefaultIds = ["about:description", "about:profile"];
  const professionalDefaultIds = [
    "professional:heading",
    "professional:summary",
    "professional:company",
    "professional:location",
    "professional:availability",
    "professional:actions",
    "professional:imports",
  ];
  const contactDefaultIds = ["contact:heading", "contact:description", "contact:note", "contact:methods", "contact:actions"];
  const linksDefaultIds = ["links:heading", "links:description", "links:cards"];
  const projectsDefaultIds = ["projects:heading", "projects:featured-image", "projects:featured-header", "projects:featured-description", "projects:featured-meta", "projects:grid"];

  const orderedHeroLeftIds = orderCanvasChildIds(heroLeftDefaultIds, componentOrder["hero:left"]);
  const orderedHeroRightIds = orderCanvasChildIds(heroRightDefaultIds, componentOrder["hero:right"]);
  const orderedAboutIds = orderCanvasChildIds(aboutDefaultIds, componentOrder.about);
  const orderedProfessionalIds = orderCanvasChildIds(professionalDefaultIds, componentOrder.professional);
  const orderedContactIds = orderCanvasChildIds(contactDefaultIds, componentOrder.contact);
  const orderedLinksIds = orderCanvasChildIds(linksDefaultIds, componentOrder.links);
  const orderedProjectsIds = orderCanvasChildIds(projectsDefaultIds, componentOrder.projects);

  const orderedHeroActionIds = orderCanvasChildIds(
    heroActionItems.map((item) => item.id),
    componentOrder["hero:actions"],
  );
  const orderedHeroHighlightIds = orderCanvasChildIds(
    heroHighlightItems.map((item) => item.id),
    componentOrder["hero:highlights"],
  );
  const orderedHeroStackIds = orderCanvasChildIds(
    heroStackItems.map((item) => item.id),
    componentOrder["hero:stack:items"],
  );
  const orderedProfessionalActionIds = orderCanvasChildIds(
    professionalActionItems.map((item) => item.id),
    componentOrder["professional:actions"],
  );
  const orderedContactMethodIds = orderCanvasChildIds(
    contactMethodItems.map((item) => item.id),
    componentOrder["contact:methods"],
  );
  const orderedContactActionIds = orderCanvasChildIds(
    contactActionItems.map((item) => item.id),
    componentOrder["contact:actions"],
  );
  const orderedLinkCardIds = orderCanvasChildIds(
    linkCardItems.map((item) => item.id),
    componentOrder["links:cards"],
  );
  const orderedSecondaryProjectIds = orderCanvasChildIds(
    secondaryProjectItems.map((item) => item.id),
    componentOrder["projects:grid"],
  );

  const visibleHeroActionItems = orderedHeroActionIds
    .filter((id) => !hiddenChildComponentIds.has(id))
    .map((id) => heroActionItems.find((item) => item.id === id))
    .filter(Boolean) as typeof heroActionItems;
  const visibleHeroHighlightItems = orderedHeroHighlightIds
    .filter((id) => !hiddenChildComponentIds.has(id))
    .map((id) => heroHighlightItems.find((item) => item.id === id))
    .filter(Boolean) as typeof heroHighlightItems;
  const visibleHeroStackItems = orderedHeroStackIds
    .filter((id) => !hiddenChildComponentIds.has(id))
    .map((id) => heroStackItems.find((item) => item.id === id))
    .filter(Boolean) as typeof heroStackItems;
  const visibleProfessionalActionItems = orderedProfessionalActionIds
    .filter((id) => !hiddenChildComponentIds.has(id))
    .map((id) => professionalActionItems.find((item) => item.id === id))
    .filter(Boolean) as typeof professionalActionItems;
  const visibleContactMethodItems = orderedContactMethodIds
    .filter((id) => !hiddenChildComponentIds.has(id))
    .map((id) => contactMethodItems.find((item) => item.id === id))
    .filter(Boolean) as typeof contactMethodItems;
  const visibleContactActionItems = orderedContactActionIds
    .filter((id) => !hiddenChildComponentIds.has(id))
    .map((id) => contactActionItems.find((item) => item.id === id))
    .filter(Boolean) as typeof contactActionItems;
  const visibleLinkCardItems = orderedLinkCardIds
    .filter((id) => !hiddenChildComponentIds.has(id))
    .map((id) => linkCardItems.find((item) => item.id === id))
    .filter(Boolean) as typeof linkCardItems;
  const visibleSecondaryProjectItems = orderedSecondaryProjectIds
    .filter((id) => !hiddenChildComponentIds.has(id))
    .map((id) => secondaryProjectItems.find((item) => item.id === id))
    .filter(Boolean) as typeof secondaryProjectItems;
  const childComponentLabels: Record<string, string> = {
    "hero:image": "Hero image",
    "hero:name": "Hero name block",
    "hero:title": "Hero headline",
    "hero:intro": "Hero intro text",
    "hero:actions": "Hero actions row",
    "hero:summary": "Hero summary card",
    "hero:highlights": "Hero highlight cards",
    "hero:stack": "Hero stack block",
    "about:description": "About text block",
    "about:profile": "Profile details",
    "professional:heading": "Professional heading",
    "professional:summary": "Professional summary",
    "professional:company": "Company block",
    "professional:location": "Location block",
    "professional:availability": "Availability block",
    "professional:actions": "Professional actions",
    "professional:imports": "Professional import tools",
    "contact:heading": "Contact heading",
    "contact:description": "Contact intro text",
    "contact:note": "Contact custom note",
    "contact:methods": "Contact methods",
    "contact:actions": "Contact actions",
    "links:heading": "Links heading",
    "links:description": "Links intro text",
    "links:cards": "Link cards",
    "projects:heading": "Projects heading",
    "projects:featured-image": "Featured project image",
    "projects:featured-header": "Featured project header",
    "projects:featured-description": "Featured project description",
    "projects:featured-meta": "Featured project links and badges",
    "projects:grid": "Project grid",
    "hero:stack:items": "Hero stack badges",
    ...Object.fromEntries(heroActionItems.map((item) => [item.id, item.label])),
    ...Object.fromEntries(heroHighlightItems.map((item) => [item.id, item.label])),
    ...Object.fromEntries(heroStackItems.map((item) => [item.id, item.label])),
    ...Object.fromEntries(professionalActionItems.map((item) => [item.id, item.label])),
    ...Object.fromEntries(contactMethodItems.map((item) => [item.id, item.label])),
    ...Object.fromEntries(contactActionItems.map((item) => [item.id, item.label])),
    ...Object.fromEntries(linkCardItems.map((item) => [item.id, item.label])),
    ...Object.fromEntries(secondaryProjectItems.map((item) => [item.id, item.label])),
  };
  const childDefaultsByParent: Record<string, string[]> = {
    "hero:left": heroLeftDefaultIds,
    "hero:right": heroRightDefaultIds,
    about: aboutDefaultIds,
    professional: professionalDefaultIds,
    contact: contactDefaultIds,
    links: linksDefaultIds,
    projects: projectsDefaultIds,
    "hero:actions": heroActionItems.map((item) => item.id),
    "hero:highlights": heroHighlightItems.map((item) => item.id),
    "hero:stack:items": heroStackItems.map((item) => item.id),
    "professional:actions": professionalActionItems.map((item) => item.id),
    "contact:methods": contactMethodItems.map((item) => item.id),
    "contact:actions": contactActionItems.map((item) => item.id),
    "links:cards": linkCardItems.map((item) => item.id),
    "projects:grid": secondaryProjectItems.map((item) => item.id),
  };
  const childParentLabels: Record<string, string> = {
    "hero:left": "Hero left column",
    "hero:right": "Hero right column",
    about: "About section",
    professional: "Professional section",
    contact: "Contact section",
    links: "Links section",
    projects: "Projects section",
    "hero:actions": "Hero action buttons",
    "hero:highlights": "Hero highlight cards",
    "hero:stack:items": "Hero stack badges",
    "professional:actions": "Professional actions",
    "professional:imports": "Professional import tools",
    "professional:company": "Company block",
    "professional:location": "Location block",
    "professional:availability": "Availability block",
    "contact:heading": "Contact heading",
    "contact:description": "Contact intro text",
    "contact:note": "Contact custom note",
    "contact:methods": "Contact methods",
    "contact:actions": "Contact actions",
    "links:heading": "Links heading",
    "links:description": "Links intro text",
    "links:cards": "Link cards",
    "projects:featured-image": "Featured project image",
    "projects:featured-header": "Featured project header",
    "projects:featured-description": "Featured project description",
    "projects:featured-meta": "Featured project links and badges",
    "projects:grid": "Project cards",
  };
  const hiddenChildComponentGroups = Object.entries(childDefaultsByParent)
    .map(([parentId, ids]) => {
      const hiddenItems = orderCanvasChildIds(ids, componentOrder[parentId])
        .filter((id) => hiddenChildComponentIds.has(id))
        .map((id) => ({
          id,
          label: childComponentLabels[id] ?? id,
        }));

      return {
        parentId,
        label: childParentLabels[parentId] ?? parentId,
        items: hiddenItems,
      };
    })
    .filter((group) => group.items.length > 0);
  const hiddenSectionCount = hiddenCanvasComponents.length;
  const hiddenBlockCount = hiddenChildComponentGroups.reduce((count, group) => count + group.items.length, 0);
  const availableBuiltInSections = canvasComponents.filter(
    (
      component,
    ): component is PortfolioCanvasComponent & { type: PortfolioSectionId } =>
      isBuiltInSectionType(component.type) && !component.visible,
  );
  const selectedSectionLabel = selectedCanvasComponent
    ? selectedCanvasComponent.type === "custom"
      ? selectedCustomSection?.title || "Custom Section"
      : sectionLabels[selectedCanvasComponent.type]
    : "Nothing selected";
  const selectedSectionHint = selectedCanvasComponent
    ? SECTION_CONTENT_HINTS[selectedCanvasComponent.type]
    : "Select a section on the canvas to adjust layout, styling, and section settings here.";

  function isCanvasChildVisible(componentId: string) {
    return !hiddenChildComponentIds.has(componentId);
  }


  function renderPreviewSection(component: PortfolioCanvasComponent) {
    if (component.type === "custom") {
      const customSection = overrides.customSections.find((section) => section.id === component.id);

      return (
        <div className={`rounded-[2rem] border ${densityClasses.sectionPadding} space-y-4`} style={themeStyles.surface}>
          <PreviewCanvasItemFrame
            label={customSection?.title || component.title || "Custom section"}
            themeStyles={themeStyles}
            isEditing={isEditMode}
          >
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={themeStyles.mutedText}>
                {customSection?.title || component.title || "Custom Section"}
              </p>
              <p className="text-sm leading-7 sm:text-base">
                {customSection?.description || "Add your own content here from the editor controls."}
              </p>
              {isEditMode ? (
                <div className="grid gap-3">
                  <input
                    value={customSection?.title || ""}
                    onChange={(event) =>
                      updateOverrides((current) => ({
                        ...current,
                        customSections: current.customSections.map((section) =>
                          section.id === component.id ? { ...section, title: event.target.value } : section,
                        ),
                      }))
                    }
                    placeholder="Section title"
                    className="h-11 rounded-[0.95rem] border px-3 text-sm outline-none transition"
                    style={themeStyles.strongSurface}
                  />
                  <textarea
                    value={customSection?.description || ""}
                    onChange={(event) =>
                      updateOverrides((current) => ({
                        ...current,
                        customSections: current.customSections.map((section) =>
                          section.id === component.id ? { ...section, description: event.target.value } : section,
                        ),
                      }))
                    }
                    rows={4}
                    placeholder="Describe the content for this custom section"
                    className="min-h-[108px] rounded-[0.95rem] border px-3 py-3 text-sm leading-7 outline-none transition"
                    style={themeStyles.strongSurface}
                  />
                </div>
              ) : null}
            </div>
          </PreviewCanvasItemFrame>
        </div>
      );
    }

    const sectionId = component.type;

    switch (sectionId) {
      case "hero":
        return (
          <div className={`rounded-[2rem] border ${densityClasses.heroPadding}`} style={themeStyles.heroSurface}>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)] xl:items-stretch">
              <div className="space-y-6">
                {orderedHeroLeftIds.map((componentId) => {
                  if (!isCanvasChildVisible(componentId)) {
                    return null;
                  }

                  if (componentId === "hero:image") {
                    return (
                      <PreviewCanvasItemFrame
                        key={componentId}
                        label="Hero image"
                        themeStyles={themeStyles}
                        isEditing={isEditMode}
                        isDragging={draggedChildComponentId === componentId}
                        isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                        onDragStart={() => handleChildDragStart(componentId)}
                        onDragOver={() => handleChildDragOver(componentId)}
                        onDrop={() => handleChildDrop("hero:left", heroLeftDefaultIds, componentId)}
                        onDragEnd={handleChildDragEnd}
                        onRemove={() => setChildComponentVisible(componentId, false)}
                      >
                        <div className="space-y-3">
                          <div className="h-20 w-20 overflow-hidden rounded-[1.5rem] border shadow-sm sm:h-24 sm:w-24" style={themeStyles.strongSurface}>
                            {portfolio.hero.imageUrl ? (
                              <img src={portfolio.hero.imageUrl} alt={portfolio.hero.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold" style={themeStyles.accentBlock}>
                                GH
                              </div>
                            )}
                          </div>
                          {isEditMode ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                ref={heroImageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleHeroImageUpload}
                                className="sr-only"
                              />
                              <button
                                type="button"
                                onClick={() => heroImageInputRef.current?.click()}
                                className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                                style={themeStyles.ghostButton}
                              >
                                Upload Hero Image
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateOverrides((current) => ({
                                    ...current,
                                    hero: {
                                      ...current.hero,
                                      imageUrl: "",
                                    },
                                  }))
                                }
                                className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                                style={themeStyles.ghostButton}
                              >
                                Use GitHub Avatar
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </PreviewCanvasItemFrame>
                    );
                  }

                  if (componentId === "hero:name") {
                    return (
                      <PreviewCanvasItemFrame
                        key={componentId}
                        label="Hero name block"
                        themeStyles={themeStyles}
                        isEditing={isEditMode}
                        isDragging={draggedChildComponentId === componentId}
                        isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                        onDragStart={() => handleChildDragStart(componentId)}
                        onDragOver={() => handleChildDragOver(componentId)}
                        onDrop={() => handleChildDrop("hero:left", heroLeftDefaultIds, componentId)}
                        onDragEnd={handleChildDragEnd}
                        onRemove={() => setChildComponentVisible(componentId, false)}
                      >
                        <div>
                          <p className="mt-2 text-4xl tracking-tight sm:text-6xl" style={themeStyles.headline}>
                            {portfolio.hero.name}
                          </p>
                          <p className="mt-2 text-base sm:text-lg" style={themeStyles.mutedText}>
                            {preview?.profile.username ? `@${preview.profile.username}` : "@username"}
                          </p>
                        </div>
                      </PreviewCanvasItemFrame>
                    );
                  }

                  if (componentId === "hero:title") {
                    return (
                      <PreviewCanvasItemFrame
                        key={componentId}
                        label="Hero headline"
                        themeStyles={themeStyles}
                        isEditing={isEditMode}
                        isDragging={draggedChildComponentId === componentId}
                        isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                        onDragStart={() => handleChildDragStart(componentId)}
                        onDragOver={() => handleChildDragOver(componentId)}
                        onDrop={() => handleChildDrop("hero:left", heroLeftDefaultIds, componentId)}
                        onDragEnd={handleChildDragEnd}
                        onRemove={() => setChildComponentVisible(componentId, false)}
                      >
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            {isEditMode ? (
                              <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]" style={themeStyles.surface}>
                                Edit
                              </span>
                            ) : null}
                            <SourceBadge source={heroHeadline.source} themeStyles={themeStyles} />
                          </div>
                          <p className="max-w-4xl break-words text-3xl leading-[1.04] tracking-tight sm:text-[3.6rem]">{heroHeadline.value}</p>
                          <InlineEditableField
                            label="Hero headline"
                            value={overrides.hero.headline}
                            onChange={(nextValue) =>
                              updateOverrides((current) => ({
                                ...current,
                                hero: { ...current.hero, headline: nextValue },
                                aiAccepted: { ...current.aiAccepted, heroHeadline: false },
                              }))
                            }
                            generatedValue={baseHero.headline}
                            suggestedValue={overrides.hero.headlineSuggestion}
                            activeSource={overrides.aiAccepted.heroHeadline ? "ai" : "user"}
                            placeholder="Add a sharper headline"
                            themeStyles={themeStyles}
                            onApplySuggestion={() =>
                              updateOverrides((current) => ({
                                ...current,
                                hero: {
                                  ...current.hero,
                                  headline: current.hero.headlineSuggestion,
                                  headlineSuggestion: "",
                                },
                                aiAccepted: { ...current.aiAccepted, heroHeadline: true },
                              }))
                            }
                            onDismissSuggestion={() =>
                              updateOverrides((current) => ({
                                ...current,
                                hero: { ...current.hero, headlineSuggestion: "" },
                              }))
                            }
                            onReset={() =>
                              updateOverrides((current) => ({
                                ...current,
                                hero: { ...current.hero, headline: "" },
                                aiAccepted: { ...current.aiAccepted, heroHeadline: false },
                              }))
                            }
                            editing={isEditMode}
                          />
                        </div>
                      </PreviewCanvasItemFrame>
                    );
                  }

                  if (componentId === "hero:intro") {
                    return (
                      <PreviewCanvasItemFrame
                        key={componentId}
                        label="Hero intro text"
                        themeStyles={themeStyles}
                        isEditing={isEditMode}
                        isDragging={draggedChildComponentId === componentId}
                        isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                        onDragStart={() => handleChildDragStart(componentId)}
                        onDragOver={() => handleChildDragOver(componentId)}
                        onDrop={() => handleChildDrop("hero:left", heroLeftDefaultIds, componentId)}
                        onDragEnd={handleChildDragEnd}
                        onRemove={() => setChildComponentVisible(componentId, false)}
                      >
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <SourceBadge source={heroSubheadline.source} themeStyles={themeStyles} />
                          </div>
                          <p className="max-w-3xl break-words whitespace-pre-wrap text-base leading-7 sm:text-lg sm:leading-8" style={themeStyles.mutedText}>
                            {heroIntroText}
                          </p>
                          <InlineEditableField
                            label="Hero intro"
                            value={overrides.hero.subheadline}
                            onChange={(nextValue) =>
                              updateOverrides((current) => ({
                                ...current,
                                hero: { ...current.hero, subheadline: nextValue },
                                aiAccepted: { ...current.aiAccepted, heroSubheadline: false },
                              }))
                            }
                            generatedValue={baseHero.subheadline}
                            suggestedValue={overrides.hero.subheadlineSuggestion}
                            activeSource={overrides.aiAccepted.heroSubheadline ? "ai" : "user"}
                            placeholder="Describe the work you want this site to emphasize"
                            themeStyles={themeStyles}
                            onApplySuggestion={() =>
                              updateOverrides((current) => ({
                                ...current,
                                hero: {
                                  ...current.hero,
                                  subheadline: current.hero.subheadlineSuggestion,
                                  subheadlineSuggestion: "",
                                },
                                aiAccepted: { ...current.aiAccepted, heroSubheadline: true },
                              }))
                            }
                            onDismissSuggestion={() =>
                              updateOverrides((current) => ({
                                ...current,
                                hero: { ...current.hero, subheadlineSuggestion: "" },
                              }))
                            }
                            onReset={() =>
                              updateOverrides((current) => ({
                                ...current,
                                hero: { ...current.hero, subheadline: "" },
                                aiAccepted: { ...current.aiAccepted, heroSubheadline: false },
                              }))
                            }
                            editing={isEditMode}
                            multiline
                          />
                        </div>
                      </PreviewCanvasItemFrame>
                    );
                  }

                  if (componentId === "hero:actions") {
                    return (
                      <PreviewCanvasItemFrame
                        key={componentId}
                        label="Hero actions"
                        themeStyles={themeStyles}
                        isEditing={isEditMode}
                        isDragging={draggedChildComponentId === componentId}
                        isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                        onDragStart={() => handleChildDragStart(componentId)}
                        onDragOver={() => handleChildDragOver(componentId)}
                        onDrop={() => handleChildDrop("hero:left", heroLeftDefaultIds, componentId)}
                        onDragEnd={handleChildDragEnd}
                        onRemove={() => setChildComponentVisible(componentId, false)}
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          {visibleHeroActionItems.map((item, index) => (
                            <div
                              key={item.id}
                              draggable={isEditMode}
                              onDragStart={() => handleChildDragStart(item.id)}
                              onDragOver={(event) => {
                                event.preventDefault();
                                handleChildDragOver(item.id);
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                handleChildDrop("hero:actions", heroActionItems.map((entry) => entry.id), item.id);
                              }}
                              onDragEnd={handleChildDragEnd}
                              className={isEditMode ? "cursor-grab active:cursor-grabbing" : ""}
                            >
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  draggable
                                  onDragStart={(event) => {
                                    event.stopPropagation();
                                    handleChildDragStart(item.id);
                                  }}
                                  onDragEnd={handleChildDragEnd}
                                  className="rounded-full border p-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                                  style={themeStyles.ghostButton}
                                  aria-label={`Drag ${item.label}`}
                                  title={`Drag ${item.label}`}
                                >
                                  <span aria-hidden="true">⋮⋮</span>
                                </button>
                                <ActionLink
                                  href={item.action.href}
                                  label={item.action.label}
                                  themeStyles={themeStyles}
                                  primary={index === 0}
                                />
                                {isEditMode ? (
                                  <button
                                    type="button"
                                    onClick={() => setChildComponentVisible(item.id, false)}
                                    className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                                    style={themeStyles.ghostButton}
                                  >
                                    Hide
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          ))}
                          <ActionLink href="#projects" label="Explore Featured Projects" themeStyles={themeStyles} />
                        </div>
                      </PreviewCanvasItemFrame>
                    );
                  }

                  return null;
                })}
              </div>

              <div className="grid gap-4">
                {orderedHeroRightIds.map((componentId) => {
                  if (!isCanvasChildVisible(componentId)) {
                    return null;
                  }

                  if (componentId === "hero:summary") {
                    return (
                      <PreviewCanvasItemFrame
                        key={componentId}
                        label="Professional snapshot"
                        themeStyles={themeStyles}
                        isEditing={isEditMode}
                        isDragging={draggedChildComponentId === componentId}
                        isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                        onDragStart={() => handleChildDragStart(componentId)}
                        onDragOver={() => handleChildDragOver(componentId)}
                        onDrop={() => handleChildDrop("hero:right", heroRightDefaultIds, componentId)}
                        onDragEnd={handleChildDragEnd}
                        onRemove={() => setChildComponentVisible(componentId, false)}
                      >
                        <div className={`rounded-[2rem] border ${densityClasses.cardPadding}`} style={themeStyles.projectShowcase}>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={themeStyles.mutedText}>
                            Professional Snapshot
                          </p>
                          <p className="mt-4 break-words whitespace-pre-wrap text-base leading-8 sm:text-lg" style={themeStyles.mutedText}>
                            {heroSummary}
                          </p>
                        </div>
                      </PreviewCanvasItemFrame>
                    );
                  }

                  if (componentId === "hero:highlights" && visibleHeroHighlightItems.length > 0) {
                    return (
                      <PreviewCanvasItemFrame
                        key={componentId}
                        label="Hero highlight cards"
                        themeStyles={themeStyles}
                        isEditing={isEditMode}
                        isDragging={draggedChildComponentId === componentId}
                        isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                        onDragStart={() => handleChildDragStart(componentId)}
                        onDragOver={() => handleChildDragOver(componentId)}
                        onDrop={() => handleChildDrop("hero:right", heroRightDefaultIds, componentId)}
                        onDragEnd={handleChildDragEnd}
                        onRemove={() => setChildComponentVisible(componentId, false)}
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          {visibleHeroHighlightItems.map((highlight) => (
                            <div
                              key={highlight.id}
                              draggable={isEditMode}
                              onDragStart={() => handleChildDragStart(highlight.id)}
                              onDragOver={(event) => {
                                event.preventDefault();
                                handleChildDragOver(highlight.id);
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                handleChildDrop("hero:highlights", heroHighlightItems.map((entry) => entry.id), highlight.id);
                              }}
                              onDragEnd={handleChildDragEnd}
                              className={`rounded-[1.1rem] border px-4 py-4 ${isEditMode ? "cursor-grab active:cursor-grabbing" : ""}`}
                              style={themeStyles.strongSurface}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={themeStyles.mutedText}>
                                    {highlight.item.label}
                                  </p>
                                  <p className="mt-2 break-words text-sm font-medium sm:text-base">{highlight.item.value}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    draggable
                                    onDragStart={(event) => {
                                      event.stopPropagation();
                                      handleChildDragStart(highlight.id);
                                    }}
                                    onDragEnd={handleChildDragEnd}
                                    className="rounded-full border p-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                                    style={themeStyles.ghostButton}
                                    aria-label={`Drag ${highlight.item.label}`}
                                    title={`Drag ${highlight.item.label}`}
                                  >
                                    <span aria-hidden="true">⋮⋮</span>
                                  </button>
                                  {isEditMode ? (
                                    <button
                                      type="button"
                                      onClick={() => setChildComponentVisible(highlight.id, false)}
                                      className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                                      style={themeStyles.ghostButton}
                                    >
                                      Hide
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </PreviewCanvasItemFrame>
                    );
                  }

                  if (componentId === "hero:stack" && showStack) {
                    return (
                      <PreviewCanvasItemFrame
                        key={componentId}
                        label="Stack tools"
                        themeStyles={themeStyles}
                        isEditing={isEditMode}
                        isDragging={draggedChildComponentId === componentId}
                        isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                        onDragStart={() => handleChildDragStart(componentId)}
                        onDragOver={() => handleChildDragOver(componentId)}
                        onDrop={() => handleChildDrop("hero:right", heroRightDefaultIds, componentId)}
                        onDragEnd={handleChildDragEnd}
                        onRemove={() => setChildComponentVisible(componentId, false)}
                      >
                        <div className={`rounded-[1.8rem] border ${densityClasses.cardPadding}`} style={themeStyles.sectionSurface}>
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={themeStyles.mutedText}>
                              Stack
                            </p>
                            <span className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.chip}>
                              {techStack.length} tools
                            </span>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2.5">
                            {visibleHeroStackItems.map((item) => (
                              <div
                                key={item.id}
                                draggable={isEditMode}
                                onDragStart={() => handleChildDragStart(item.id)}
                                onDragOver={(event) => {
                                  event.preventDefault();
                                  handleChildDragOver(item.id);
                                }}
                                onDrop={(event) => {
                                  event.preventDefault();
                                  handleChildDrop("hero:stack:items", heroStackItems.map((entry) => entry.id), item.id);
                                }}
                                onDragEnd={handleChildDragEnd}
                                className={isEditMode ? "cursor-grab active:cursor-grabbing" : ""}
                              >
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    draggable
                                    onDragStart={(event) => {
                                      event.stopPropagation();
                                      handleChildDragStart(item.id);
                                    }}
                                    onDragEnd={handleChildDragEnd}
                                    className="rounded-full border p-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                                    style={themeStyles.ghostButton}
                                    aria-label={`Drag ${item.label}`}
                                    title={`Drag ${item.label}`}
                                  >
                                    <span aria-hidden="true">⋮⋮</span>
                                  </button>
                                  <TechBadge label={item.value} themeStyles={themeStyles} compact />
                                  {isEditMode ? (
                                    <button
                                      type="button"
                                      onClick={() => setChildComponentVisible(item.id, false)}
                                      className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                                      style={themeStyles.ghostButton}
                                    >
                                      Hide
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PreviewCanvasItemFrame>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          </div>
        );
      case "about":
        return (
          <div className={splitAboutClass}>
            {orderedAboutIds.map((componentId) => {
              if (!isCanvasChildVisible(componentId)) {
                return null;
              }

              if (componentId === "about:description") {
                return (
                  <div key={componentId} {...getTourHighlightProps("tour-edit-text")}>
                    <PreviewCanvasItemFrame
                      label="About text block"
                      themeStyles={themeStyles}
                      isEditing={isEditMode}
                      isDragging={draggedChildComponentId === componentId}
                      isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                      onDragStart={() => handleChildDragStart(componentId)}
                      onDragOver={() => handleChildDragOver(componentId)}
                      onDrop={() => handleChildDrop("about", aboutDefaultIds, componentId)}
                      onDragEnd={handleChildDragEnd}
                      onRemove={() => setChildComponentVisible(componentId, false)}
                    >
                      <div className={`rounded-[1.8rem] border ${densityClasses.cardPadding}`} style={themeStyles.sectionSurface}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={themeStyles.mutedText}>About Me</p>
                          <SourceBadge source={aboutDescription.source} themeStyles={themeStyles} />
                        </div>
                        <h2 className="mt-3 break-words text-3xl font-semibold tracking-tight">About Me</h2>
                        <p className="mt-5 break-words whitespace-pre-wrap text-sm leading-7 sm:text-base" style={themeStyles.mutedText}>{aboutDescription.value}</p>
                        <InlineEditableField
                          label="About Me"
                          value={overrides.about.description}
                          onChange={(nextValue) =>
                            updateOverrides((current) => ({
                              ...current,
                              about: { ...current.about, description: nextValue },
                              aiAccepted: { ...current.aiAccepted, aboutDescription: false },
                            }))
                          }
                          generatedValue={baseAbout.description}
                          suggestedValue={overrides.aboutSuggestion}
                          activeSource={overrides.aiAccepted.aboutDescription ? "ai" : "user"}
                          placeholder="Add a more personal summary"
                          themeStyles={themeStyles}
                          onApplySuggestion={() =>
                            updateOverrides((current) => ({
                              ...current,
                              about: { ...current.about, description: current.aboutSuggestion },
                              aboutSuggestion: "",
                              aiAccepted: { ...current.aiAccepted, aboutDescription: true },
                            }))
                          }
                          onDismissSuggestion={() => updateOverrides((current) => ({ ...current, aboutSuggestion: "" }))}
                          onReset={() =>
                            updateOverrides((current) => ({
                              ...current,
                              about: { ...current.about, description: "" },
                              aiAccepted: { ...current.aiAccepted, aboutDescription: false },
                            }))
                          }
                          editing={isEditMode}
                          multiline
                        />
                      </div>
                    </PreviewCanvasItemFrame>
                  </div>
                );
              }

              if (componentId === "about:profile" && hasProfileDetails) {
                return (
                  <div key={componentId} {...getTourHighlightProps("tour-profile-edit")}>
                    <PreviewCanvasItemFrame
                      label="Profile details"
                      themeStyles={themeStyles}
                      isEditing={isEditMode}
                      isDragging={draggedChildComponentId === componentId}
                      isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                      onDragStart={() => handleChildDragStart(componentId)}
                      onDragOver={() => handleChildDragOver(componentId)}
                      onDrop={() => handleChildDrop("about", aboutDefaultIds, componentId)}
                      onDragEnd={handleChildDragEnd}
                      onRemove={() => setChildComponentVisible(componentId, false)}
                    >
                      <div className={`rounded-[1.8rem] border ${densityClasses.cardPadding}`} style={themeStyles.sectionSurface}>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={themeStyles.mutedText}>Profile Details</p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em]" style={themeStyles.mutedText}>Company</p>
                            <p className="mt-2 text-base font-medium">{professional.company || preview?.profile.company || "Add company"}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em]" style={themeStyles.mutedText}>Location</p>
                            <p className="mt-2 text-base font-medium">{professional.location || preview?.profile.location || "Add location"}</p>
                          </div>
                        </div>
                        <div className={`${isEditMode ? "mt-4 grid gap-3 sm:grid-cols-2" : "hidden"}`}>
                          <InlineEditableField
                            label="Company"
                            value={overrides.professional.company}
                            onChange={(nextValue) =>
                              updateOverrides((current) => ({
                                ...current,
                                professional: { ...current.professional, company: nextValue },
                              }))
                            }
                            generatedValue={preview?.profile.company ?? ""}
                            placeholder="Acme Inc."
                            themeStyles={themeStyles}
                            onReset={() =>
                              updateOverrides((current) => ({
                                ...current,
                                professional: { ...current.professional, company: "" },
                              }))
                            }
                            editing={isEditMode}
                            compact
                          />
                          <InlineEditableField label="Location override" value={overrides.professional.location} onChange={(nextValue) => updateOverrides((current) => ({ ...current, professional: { ...current.professional, location: nextValue } }))} generatedValue={preview?.profile.location ?? ""} placeholder="San Francisco, CA" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, professional: { ...current.professional, location: "" } }))} editing={isEditMode} compact />
                        </div>
                      </div>
                    </PreviewCanvasItemFrame>
                  </div>
                );
              }

              return null;
            })}
          </div>
        );
      case "professional":
        return (
          <div className={`rounded-[1.8rem] border ${densityClasses.cardPadding}`} style={themeStyles.sectionSurface}>
            {orderedProfessionalIds.map((componentId) => {
              if (!isCanvasChildVisible(componentId)) {
                return null;
              }

              if (componentId === "professional:heading") {
                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Professional heading"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("professional", professionalDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={themeStyles.mutedText}>{professional.title}</p>
                      {isEditMode ? (
                        <div className="flex flex-wrap gap-2">
                          <InlineActionButton label="Import Resume" onClick={() => resumeUploadInputRef.current?.click()} themeStyles={themeStyles} />
                          <InlineActionButton label="Add LinkedIn" onClick={() => appendEnrichmentSource(overrides.linksSection.linkedIn || "https://linkedin.com/in/username")} themeStyles={themeStyles} />
                          <InlineActionButton label="Add Handshake" onClick={() => appendEnrichmentSource(overrides.linksSection.handshakeUrl || "https://app.joinhandshake.com/...")} themeStyles={themeStyles} />
                        </div>
                      ) : null}
                    </div>
                    <InlineEditableField
                      label="Professional heading"
                      value={overrides.professional.title}
                      onChange={(nextValue) =>
                        updateOverrides((current) => ({
                          ...current,
                          professional: { ...current.professional, title: nextValue },
                          aiAccepted: { ...current.aiAccepted, professionalTitle: false },
                        }))
                      }
                      generatedValue="Career / Professional Info"
                      suggestedValue={overrides.professional.titleSuggestion}
                      activeSource={overrides.aiAccepted.professionalTitle ? "ai" : "user"}
                      placeholder="Career / Professional Info"
                      themeStyles={themeStyles}
                      onApplySuggestion={() =>
                        updateOverrides((current) => ({
                          ...current,
                          professional: {
                            ...current.professional,
                            title: current.professional.titleSuggestion,
                            titleSuggestion: "",
                          },
                          aiAccepted: { ...current.aiAccepted, professionalTitle: true },
                        }))
                      }
                      onDismissSuggestion={() =>
                        updateOverrides((current) => ({
                          ...current,
                          professional: { ...current.professional, titleSuggestion: "" },
                        }))
                      }
                      onReset={() =>
                        updateOverrides((current) => ({
                          ...current,
                          professional: { ...current.professional, title: "" },
                          aiAccepted: { ...current.aiAccepted, professionalTitle: false },
                        }))
                      }
                      editing={isEditMode}
                      compact
                    />
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "professional:summary") {
                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Professional summary"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("professional", professionalDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    {professional.summary ? <p className="break-words whitespace-pre-wrap text-sm leading-7 sm:text-base" style={themeStyles.mutedText}>{professional.summary}</p> : null}
                    <InlineEditableField
                      label="Professional summary"
                      value={overrides.professional.summary}
                      onChange={(nextValue) => updateOverrides((current) => ({ ...current, professional: { ...current.professional, summary: nextValue }, aiAccepted: { ...current.aiAccepted, professionalSummary: false } }))}
                      generatedValue=""
                      suggestedValue={overrides.professional.summarySuggestion}
                      activeSource={overrides.aiAccepted.professionalSummary ? "ai" : "user"}
                      placeholder="Summarize the roles, strengths, or focus areas you want to emphasize"
                      themeStyles={themeStyles}
                      onApplySuggestion={() => updateOverrides((current) => ({ ...current, professional: { ...current.professional, summary: current.professional.summarySuggestion, summarySuggestion: "" }, aiAccepted: { ...current.aiAccepted, professionalSummary: true } }))}
                      onDismissSuggestion={() => updateOverrides((current) => ({ ...current, professional: { ...current.professional, summarySuggestion: "" } }))}
                      onReset={() => updateOverrides((current) => ({ ...current, professional: { ...current.professional, summary: "" }, aiAccepted: { ...current.aiAccepted, professionalSummary: false } }))}
                      editing={isEditMode}
                      multiline
                    />
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "professional:actions" && visibleProfessionalActionItems.length > 0) {
                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Professional action links"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("professional", professionalDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <div className="flex flex-wrap gap-3">
                      {visibleProfessionalActionItems.map((item) => (
                        <div
                          key={item.id}
                          draggable={isEditMode}
                          onDragStart={() => handleChildDragStart(item.id)}
                          onDragOver={(event) => {
                            event.preventDefault();
                            handleChildDragOver(item.id);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            handleChildDrop("professional:actions", professionalActionItems.map((entry) => entry.id), item.id);
                          }}
                          onDragEnd={handleChildDragEnd}
                          className={isEditMode ? "cursor-grab active:cursor-grabbing" : ""}
                        >
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              draggable
                              onDragStart={(event) => {
                                event.stopPropagation();
                                handleChildDragStart(item.id);
                              }}
                              onDragEnd={handleChildDragEnd}
                              className="rounded-full border p-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                              style={themeStyles.ghostButton}
                              aria-label={`Drag ${item.label}`}
                              title={`Drag ${item.label}`}
                            >
                              <span aria-hidden="true">⋮⋮</span>
                            </button>
                            <a href={item.action.href} target="_blank" rel="noreferrer" className="inline-flex rounded-xl border px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5" style={themeStyles.ghostButton}>
                              {item.action.label}
                            </a>
                            {isEditMode ? (
                              <button type="button" onClick={() => setChildComponentVisible(item.id, false)} className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={themeStyles.ghostButton}>
                                Hide
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "professional:company") {
                if (!isEditMode && !(professional.company || preview?.profile.company)) {
                  return null;
                }

                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Company block"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("professional", professionalDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <p className="text-xs uppercase tracking-[0.2em]" style={themeStyles.mutedText}>Company</p>
                    <p className="mt-2 text-base font-medium">{professional.company || preview?.profile.company}</p>
                    <div className={`${isEditMode ? "mt-3 grid gap-3" : "hidden"}`}>
                      <InlineEditableField label="Company" value={overrides.professional.company} onChange={(nextValue) => updateOverrides((current) => ({ ...current, professional: { ...current.professional, company: nextValue } }))} generatedValue={preview?.profile.company ?? ""} placeholder="Acme Inc." themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, professional: { ...current.professional, company: "" } }))} editing={isEditMode} compact />
                    </div>
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "professional:location") {
                if (!isEditMode && !(professional.location || preview?.profile.location)) {
                  return null;
                }

                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Location block"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("professional", professionalDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <p className="text-xs uppercase tracking-[0.2em]" style={themeStyles.mutedText}>Location</p>
                    <p className="mt-2 text-base font-medium">{professional.location || preview?.profile.location}</p>
                    <div className={`${isEditMode ? "mt-3 grid gap-3" : "hidden"}`}>
                      <InlineEditableField label="Location override" value={overrides.professional.location} onChange={(nextValue) => updateOverrides((current) => ({ ...current, professional: { ...current.professional, location: nextValue } }))} generatedValue={preview?.profile.location ?? ""} placeholder="San Francisco, CA" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, professional: { ...current.professional, location: "" } }))} editing={isEditMode} compact />
                    </div>
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "professional:availability") {
                if (!isEditMode && !professional.availability) {
                  return null;
                }

                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Availability block"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("professional", professionalDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <p className="text-xs uppercase tracking-[0.2em]" style={themeStyles.mutedText}>Availability</p>
                    <p className="mt-2 text-base font-medium">{professional.availability || "Add availability"}</p>
                    <div className={`${isEditMode ? "mt-3 grid gap-3" : "hidden"}`}>
                      <InlineEditableField label="Availability" value={overrides.professional.availability} onChange={(nextValue) => updateOverrides((current) => ({ ...current, professional: { ...current.professional, availability: nextValue } }))} generatedValue="" placeholder="Open to product engineering roles" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, professional: { ...current.professional, availability: "" } }))} editing={isEditMode} compact />
                    </div>
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "professional:imports") {
                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Professional import tools"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("professional", professionalDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <div className={`${isEditMode ? "grid gap-3" : "hidden"}`}>
                      <div>
                        <p className="text-sm font-semibold">Import from Public Links or PDF Files</p>
                        <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
                          Resume upload gives the AI the best grounding for stronger summaries, more accurate profile language, and better personalization. Public websites are imported conservatively, and LinkedIn or Handshake only work when the page is truly public.
                        </p>
                      </div>
                      <textarea value={enrichmentInput} onChange={(event) => setEnrichmentInput(event.target.value)} rows={3} placeholder={"https://your-site.com\nhttps://linkedin.com/in/username\nhttps://example.com/resume.pdf"} className="min-h-[88px] rounded-[1rem] border px-3 py-3 text-sm outline-none transition" style={themeStyles.surface} />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="inline-flex cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5" style={themeStyles.ghostButton}>
                          <input ref={resumeUploadInputRef} type="file" accept="application/pdf,.pdf" multiple onChange={handleResumeUploadChange} className="sr-only" />
                          Upload Resume / Cover Letter
                        </label>
                        <button type="button" onClick={handleEnrich} disabled={isEnriching} className="rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50" style={themeStyles.accentButton}>
                          {isEnriching ? "Importing..." : "Import Suggestions"}
                        </button>
                      </div>
                    </div>
                  </PreviewCanvasItemFrame>
                );
              }

              return null;
            })}
            {isEditMode && !isCanvasChildVisible("professional:imports") ? (
              <div className="mt-4 grid gap-3 rounded-[1rem] border p-4" style={themeStyles.strongSurface}>
                <div>
                  <p className="text-sm font-semibold">Import from Public Links or PDF Files</p>
                  <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
                    Resume upload gives the AI the best grounding for stronger summaries, more accurate profile language, and better personalization. Public websites are imported conservatively, and LinkedIn or Handshake only work when the page is truly public.
                  </p>
                </div>
                <textarea value={enrichmentInput} onChange={(event) => setEnrichmentInput(event.target.value)} rows={3} placeholder={"https://your-site.com\nhttps://linkedin.com/in/username\nhttps://example.com/resume.pdf"} className="min-h-[88px] rounded-[1rem] border px-3 py-3 text-sm outline-none transition" style={themeStyles.surface} />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="inline-flex cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5" style={themeStyles.ghostButton}>
                    <input ref={resumeUploadInputRef} type="file" accept="application/pdf,.pdf" multiple onChange={handleResumeUploadChange} className="sr-only" />
                    Upload Resume / Cover Letter
                  </label>
                  <button type="button" onClick={handleEnrich} disabled={isEnriching} className="rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50" style={themeStyles.accentButton}>
                    {isEnriching ? "Importing..." : "Import Suggestions"}
                  </button>
                </div>
                {uploadedResumeFiles.length > 0 ? (
                  <div className="grid gap-2">
                    {uploadedResumeFiles.map((file) => (
                      <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 rounded-[0.9rem] border px-3 py-2" style={themeStyles.surface}>
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium">{file.name}</p>
                          <p className="text-xs" style={themeStyles.mutedText}>{(file.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button type="button" onClick={() => removeUploadedResume(file.name)} className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>Remove</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[0.9rem] border px-3 py-3 text-sm" style={themeStyles.surface}>
                    <p className="font-medium">No resume or cover letter uploaded yet.</p>
                    <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
                      Uploading a PDF is optional, but it usually gives the AI better material for summaries, profile details, and polished portfolio copy.
                    </p>
                  </div>
                )}
                {(overrides.documents.resumeFileName || overrides.documents.coverLetterFileName) ? (
                  <div className="grid gap-2 rounded-[0.9rem] border p-3" style={themeStyles.surface}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                      Downloadable Documents
                    </p>
                    {overrides.documents.resumeFileName ? (
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 break-words text-sm font-medium">
                          Resume: {overrides.documents.resumeFileName}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeUploadedResume(overrides.documents.resumeFileName)}
                          className="text-xs font-semibold uppercase tracking-[0.16em]"
                          style={themeStyles.mutedText}
                        >
                          Clear
                        </button>
                      </div>
                    ) : null}
                    {overrides.documents.coverLetterFileName ? (
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 break-words text-sm font-medium">
                          Cover letter: {overrides.documents.coverLetterFileName}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeUploadedResume(overrides.documents.coverLetterFileName)}
                          className="text-xs font-semibold uppercase tracking-[0.16em]"
                          style={themeStyles.mutedText}
                        >
                          Clear
                        </button>
                      </div>
                    ) : null}
                    <p className="text-xs leading-5" style={themeStyles.mutedText}>
                      These stay separate from your site content and only power AI grounding plus optional download actions.
                    </p>
                  </div>
                ) : null}
                {enrichError ? <div className="rounded-[0.9rem] border px-3 py-3 text-sm" style={themeStyles.accentBlock}>{enrichError}</div> : null}
                {enrichmentResults.length === 0 && !isEnriching ? (
                  <div className="rounded-[0.9rem] border px-3 py-3 text-sm" style={themeStyles.surface}>
                    <p className="font-medium">Imported suggestions will appear here.</p>
                    <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
                      Use this area for resume files or public profile links when you want help filling in summaries, links, and profile details.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      case "contact":
        return (
          <div className={`rounded-[1.8rem] border ${densityClasses.cardPadding}`} style={themeStyles.sectionSurface}>
            {orderedContactIds.map((componentId) => {
              if (!isCanvasChildVisible(componentId)) {
                return null;
              }

              if (componentId === "contact:heading") {
                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Contact heading"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("contact", contactDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={themeStyles.mutedText}>Contact</p>
                    </div>
                    <h2 className="mt-3 break-words text-2xl font-semibold tracking-tight">{contactTitle.value}</h2>
                    <InlineEditableField label="Contact heading" value={overrides.contact.title} onChange={(nextValue) => updateOverrides((current) => ({ ...current, contact: { ...current.contact, title: nextValue } }))} generatedValue={baseContact.title} placeholder="Contact" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, contact: { ...current.contact, title: "" } }))} editing={isEditMode} compact />
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "contact:description") {
                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Contact intro text"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("contact", contactDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <SourceBadge source={contactDescription.source} themeStyles={themeStyles} />
                    </div>
                    <p className="mt-4 break-words whitespace-pre-wrap text-sm leading-7 sm:text-base" style={themeStyles.mutedText}>{contactDescription.value}</p>
                    <InlineEditableField label="Contact intro" value={overrides.contact.description} onChange={(nextValue) => updateOverrides((current) => ({ ...current, contact: { ...current.contact, description: nextValue }, aiAccepted: { ...current.aiAccepted, contactDescription: false } }))} generatedValue={baseContact.description} suggestedValue={overrides.contact.descriptionSuggestion} activeSource={overrides.aiAccepted.contactDescription ? "ai" : "user"} placeholder="Tell visitors how you prefer to collaborate" themeStyles={themeStyles} onApplySuggestion={() => updateOverrides((current) => ({ ...current, contact: { ...current.contact, description: current.contact.descriptionSuggestion, descriptionSuggestion: "" }, aiAccepted: { ...current.aiAccepted, contactDescription: true } }))} onDismissSuggestion={() => updateOverrides((current) => ({ ...current, contact: { ...current.contact, descriptionSuggestion: "" } }))} onReset={() => updateOverrides((current) => ({ ...current, contact: { ...current.contact, description: "" }, aiAccepted: { ...current.aiAccepted, contactDescription: false } }))} editing={isEditMode} multiline />
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "contact:note") {
                if (!isEditMode && !contactText) {
                  return null;
                }

                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Contact custom note"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("contact", contactDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    {contactText ? <p className="break-words whitespace-pre-wrap text-sm leading-7 sm:text-base" style={themeStyles.mutedText}>{contactText}</p> : null}
                    <InlineEditableField label="Custom contact note" value={overrides.contact.customText} onChange={(nextValue) => updateOverrides((current) => ({ ...current, contact: { ...current.contact, customText: nextValue } }))} generatedValue="" placeholder="Add a short invitation to reach out" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, contact: { ...current.contact, customText: "" } }))} editing={isEditMode} multiline />
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "contact:methods" && visibleContactMethodItems.length > 0) {
                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Contact methods"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("contact", contactDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <div className="grid gap-3">
                      {visibleContactMethodItems.map((entry) => (
                        <div
                          key={entry.id}
                          draggable={isEditMode}
                          onDragStart={() => handleChildDragStart(entry.id)}
                          onDragOver={(event) => {
                            event.preventDefault();
                            handleChildDragOver(entry.id);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            handleChildDrop("contact:methods", contactMethodItems.map((item) => item.id), entry.id);
                          }}
                          onDragEnd={handleChildDragEnd}
                          className={isEditMode ? "cursor-grab active:cursor-grabbing" : ""}
                        >
                          <a href={entry.item.href} className="block rounded-[1.2rem] border px-4 py-4 text-sm transition hover:-translate-y-0.5" style={themeStyles.surface}>
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium">{entry.item.label}</p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  draggable
                                  onDragStart={(event) => {
                                    event.stopPropagation();
                                    handleChildDragStart(entry.id);
                                  }}
                                  onDragEnd={handleChildDragEnd}
                                  className="rounded-full border p-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                                  style={themeStyles.ghostButton}
                                  aria-label={`Drag ${entry.item.label}`}
                                  title={`Drag ${entry.item.label}`}
                                >
                                  <span aria-hidden="true">⋮⋮</span>
                                </button>
                                <SourceBadge source="user" themeStyles={themeStyles} />
                                {isEditMode ? (
                                  <button type="button" onClick={(event) => { event.preventDefault(); setChildComponentVisible(entry.id, false); }} className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={themeStyles.ghostButton}>
                                    Hide
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            <p className="mt-1 break-words" style={themeStyles.mutedText}>{entry.item.value}</p>
                          </a>
                        </div>
                      ))}
                    </div>
                    <div className={`${isEditMode ? "mt-3 grid gap-3 sm:grid-cols-2" : "hidden"}`}>
                      <InlineEditableField label="Email" value={overrides.contact.email} onChange={(nextValue) => updateOverrides((current) => ({ ...current, contact: { ...current.contact, email: nextValue } }))} generatedValue="" placeholder="name@example.com" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, contact: { ...current.contact, email: "" } }))} editing={isEditMode} compact />
                      <InlineEditableField label="Phone" value={overrides.contact.phone} onChange={(nextValue) => updateOverrides((current) => ({ ...current, contact: { ...current.contact, phone: nextValue } }))} generatedValue="" placeholder="+1 (555) 555-5555" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, contact: { ...current.contact, phone: "" } }))} editing={isEditMode} compact />
                    </div>
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "contact:actions" && visibleContactActionItems.length > 0) {
                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Contact actions"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("contact", contactDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <div className="flex flex-wrap gap-3">
                      {visibleContactActionItems.map((item) => (
                        <div
                          key={item.id}
                          draggable={isEditMode}
                          onDragStart={() => handleChildDragStart(item.id)}
                          onDragOver={(event) => {
                            event.preventDefault();
                            handleChildDragOver(item.id);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            handleChildDrop("contact:actions", contactActionItems.map((entry) => entry.id), item.id);
                          }}
                          onDragEnd={handleChildDragEnd}
                          className={`flex items-center gap-2 ${isEditMode ? "cursor-grab active:cursor-grabbing" : ""}`}
                        >
                          <button
                            type="button"
                            draggable
                            onDragStart={(event) => {
                              event.stopPropagation();
                              handleChildDragStart(item.id);
                            }}
                            onDragEnd={handleChildDragEnd}
                            className="rounded-full border p-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                            style={themeStyles.ghostButton}
                            aria-label={`Drag ${item.label}`}
                            title={`Drag ${item.label}`}
                          >
                            <span aria-hidden="true">⋮⋮</span>
                          </button>
                          <ActionLink href={item.action.href} label={item.action.label} themeStyles={themeStyles} />
                          {isEditMode ? (
                            <button type="button" onClick={() => setChildComponentVisible(item.id, false)} className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={themeStyles.ghostButton}>
                              Hide
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </PreviewCanvasItemFrame>
                );
              }

              return null;
            })}
          </div>
        );
      case "links":
        return (
          <div className={`rounded-[1.8rem] border ${densityClasses.cardPadding}`} style={themeStyles.sectionSurface}>
            {orderedLinksIds.map((componentId) => {
              if (!isCanvasChildVisible(componentId)) {
                return null;
              }

              if (componentId === "links:heading") {
                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Links heading"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("links", linksDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={themeStyles.mutedText}>Links</p>
                    </div>
                    <h2 className="mt-3 break-words text-2xl font-semibold tracking-tight">{linksTitle.value}</h2>
                    <InlineEditableField label="Links heading" value={overrides.linksSection.title} onChange={(nextValue) => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, title: nextValue } }))} generatedValue={baseLinksSection.title} placeholder="Links" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, title: "" } }))} editing={isEditMode} compact />
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "links:description") {
                if (!isEditMode && !linksDescription.value.trim()) {
                  return null;
                }

                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Links intro text"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("links", linksDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <SourceBadge source={linksDescription.source} themeStyles={themeStyles} />
                    </div>
                    {linksDescription.value.trim() ? <p className="mt-4 break-words whitespace-pre-wrap text-sm leading-7 sm:text-base" style={themeStyles.mutedText}>{linksDescription.value}</p> : null}
                    <InlineEditableField
                      label="Links intro"
                      value={overrides.linksSection.description}
                      onChange={(nextValue) =>
                        updateOverrides((current) => ({
                          ...current,
                          linksSection: { ...current.linksSection, description: nextValue },
                          aiAccepted: { ...current.aiAccepted, linksDescription: false },
                        }))
                      }
                      generatedValue={baseLinksSection.description}
                      suggestedValue={overrides.linksSection.descriptionSuggestion}
                      activeSource={overrides.aiAccepted.linksDescription ? "ai" : "user"}
                      placeholder="Explain what visitors can explore next"
                      themeStyles={themeStyles}
                      onApplySuggestion={() =>
                        updateOverrides((current) => ({
                          ...current,
                          linksSection: {
                            ...current.linksSection,
                            description: current.linksSection.descriptionSuggestion,
                            descriptionSuggestion: "",
                          },
                          aiAccepted: { ...current.aiAccepted, linksDescription: true },
                        }))
                      }
                      onDismissSuggestion={() =>
                        updateOverrides((current) => ({
                          ...current,
                          linksSection: { ...current.linksSection, descriptionSuggestion: "" },
                        }))
                      }
                      onReset={() =>
                        updateOverrides((current) => ({
                          ...current,
                          linksSection: { ...current.linksSection, description: "" },
                          aiAccepted: { ...current.aiAccepted, linksDescription: false },
                        }))
                      }
                      editing={isEditMode}
                      multiline
                    />
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "links:cards") {
                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Link cards"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("links", linksDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <div className={`${isEditMode ? "mb-3 grid gap-3" : "hidden"}`}>
                      <InlineEditableField label="Resume URL" value={overrides.linksSection.resumeUrl} onChange={(nextValue) => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, resumeUrl: nextValue } }))} generatedValue="" placeholder="https://example.com/resume.pdf" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, resumeUrl: "" } }))} editing={isEditMode} compact />
                      <InlineEditableField label="Cover letter URL" value={overrides.linksSection.coverLetterUrl} onChange={(nextValue) => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, coverLetterUrl: nextValue } }))} generatedValue="" placeholder="https://example.com/cover-letter.pdf" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, coverLetterUrl: "" } }))} editing={isEditMode} compact />
                      <InlineEditableField label="LinkedIn URL" value={overrides.linksSection.linkedIn} onChange={(nextValue) => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, linkedIn: nextValue } }))} generatedValue="" placeholder="https://linkedin.com/in/username" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, linkedIn: "" } }))} editing={isEditMode} compact />
                      <InlineEditableField label="Handshake URL" value={overrides.linksSection.handshakeUrl} onChange={(nextValue) => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, handshakeUrl: nextValue } }))} generatedValue="" placeholder="https://app.joinhandshake.com/..." themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, handshakeUrl: "" } }))} editing={isEditMode} compact />
                      <InlineEditableField label="Website URL" value={overrides.linksSection.portfolioUrl} onChange={(nextValue) => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, portfolioUrl: nextValue } }))} generatedValue="" placeholder="https://yourportfolio.com" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, portfolioUrl: "" } }))} editing={isEditMode} compact />
                    </div>
                    <div className="grid gap-3">
                      {visibleLinkCardItems.map((entry) => (
                        <div
                          key={entry.id}
                          draggable={isEditMode}
                          onDragStart={() => handleChildDragStart(entry.id)}
                          onDragOver={(event) => {
                            event.preventDefault();
                            handleChildDragOver(entry.id);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            handleChildDrop("links:cards", linkCardItems.map((item) => item.id), entry.id);
                          }}
                          onDragEnd={handleChildDragEnd}
                          className={isEditMode ? "cursor-grab active:cursor-grabbing" : ""}
                        >
                          <a href={entry.link.href} target="_blank" rel="noreferrer" className="block rounded-[1.2rem] border px-4 py-4 text-sm transition hover:-translate-y-0.5" style={themeStyles.surface}>
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium">{entry.link.label}</p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  draggable
                                  onDragStart={(event) => {
                                    event.stopPropagation();
                                    handleChildDragStart(entry.id);
                                  }}
                                  onDragEnd={handleChildDragEnd}
                                  className="rounded-full border p-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                                  style={themeStyles.ghostButton}
                                  aria-label={`Drag ${entry.link.label}`}
                                  title={`Drag ${entry.link.label}`}
                                >
                                  <span aria-hidden="true">⋮⋮</span>
                                </button>
                                <SourceBadge source={entry.link.source} themeStyles={themeStyles} />
                                {isEditMode ? (
                                  <button type="button" onClick={(event) => { event.preventDefault(); setChildComponentVisible(entry.id, false); }} className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={themeStyles.ghostButton}>
                                    Hide
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            <p className="mt-1 break-words" style={themeStyles.mutedText}>{entry.link.href}</p>
                          </a>
                        </div>
                      ))}
                      {visibleLinkCardItems.length === 0 ? (
                        <div className="rounded-[1rem] border px-4 py-4 text-sm" style={themeStyles.surface}>
                          <p className="font-medium">No extra links yet.</p>
                          <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
                            Add LinkedIn, Handshake, a website, or document links in edit mode to give visitors more ways to learn about you.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </PreviewCanvasItemFrame>
                );
              }

              return null;
            })}
          </div>
        );
      case "projects":
        return (
          <div {...getTourHighlightProps("tour-projects")}>
            {isCanvasChildVisible("projects:heading") ? (
              <PreviewCanvasItemFrame
                label="Projects heading"
                themeStyles={themeStyles}
                isEditing={isEditMode}
                isDragging={draggedChildComponentId === "projects:heading"}
                isDropTarget={dropTargetChildComponentId === "projects:heading" && draggedChildComponentId !== "projects:heading"}
                onDragStart={() => handleChildDragStart("projects:heading")}
                onDragOver={() => handleChildDragOver("projects:heading")}
                onDrop={() => handleChildDrop("projects", projectsDefaultIds, "projects:heading")}
                onDragEnd={handleChildDragEnd}
                onRemove={() => setChildComponentVisible("projects:heading", false)}
              >
                <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-5" style={{ borderColor: theme.palette.border }}>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={themeStyles.mutedText}>Featured Projects</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Selected Work</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6" style={themeStyles.mutedText}>
                      Drag project cards to change the order, or use Make Featured to move a project into the spotlight.
                    </p>
                  </div>
                  {featuredProject?.language ? <TechBadge label={featuredProject.language} themeStyles={themeStyles} compact /> : null}
                </div>
              </PreviewCanvasItemFrame>
            ) : null}
            {featuredProject && (isCanvasChildVisible("projects:featured-image") || isCanvasChildVisible("projects:featured-header") || isCanvasChildVisible("projects:featured-description") || isCanvasChildVisible("projects:featured-meta")) ? (
              <div className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                <div
                  className={`rounded-[2rem] border p-6 sm:p-8 transition ${draggedProjectName === featuredProject.name ? "opacity-60" : ""}`}
                  style={{
                    ...themeStyles.projectShowcase,
                    borderColor:
                      projectDropTargetName === featuredProject.name && draggedProjectName !== featuredProject.name
                        ? theme.palette.accent
                        : themeStyles.projectShowcase.borderColor,
                    boxShadow:
                      projectDropTargetName === featuredProject.name && draggedProjectName !== featuredProject.name
                        ? `0 0 0 1px ${theme.palette.accent}`
                        : themeStyles.projectShowcase.boxShadow,
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    handleProjectDragOver(featuredProject.name);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleProjectDrop(featuredProject.name);
                  }}
                >
                  {featuredProjectHasImage && isCanvasChildVisible("projects:featured-image") ? <ProjectImagePreview repository={featuredProject} themeStyles={themeStyles} /> : null}
                  {isCanvasChildVisible("projects:featured-header") ? (
                  <div className="mt-6 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]" style={themeStyles.chip}>Featured</span>
                      <SourceBadge source={featuredProject.descriptionSource} themeStyles={themeStyles} />
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditMode ? (
                        <button
                          type="button"
                          onClick={() => setChildComponentVisible("projects:featured", false)}
                          className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                          style={themeStyles.ghostButton}
                        >
                          Remove
                        </button>
                      ) : null}
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          event.stopPropagation();
                          event.dataTransfer.effectAllowed = "move";
                          handleProjectDragStart(featuredProject.name);
                        }}
                        onDragEnd={handleProjectDragEnd}
                        className="rounded-full border p-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                        style={themeStyles.ghostButton}
                        aria-label={`Drag ${featuredProject.name}`}
                        title={`Drag ${featuredProject.name}`}
                      >
                        <span aria-hidden="true">⋮⋮</span>
                      </button>
                    </div>
                  </div>
                  ) : null}
                  {isCanvasChildVisible("projects:featured-description") ? (
                  <div className="mt-10 max-w-xl">
                    <p className="break-words text-3xl font-semibold tracking-tight sm:text-4xl">{featuredProject.name}</p>
                    <p className="mt-4 break-words whitespace-pre-wrap text-base leading-8 sm:text-lg" style={themeStyles.mutedText}>{featuredProject.description}</p>
                  </div>
                  ) : null}
                  {isCanvasChildVisible("projects:featured-meta") ? (
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <TechBadge label={featuredProject.language} themeStyles={themeStyles} compact />
                    <a href={featuredProject.href} target="_blank" rel="noreferrer" className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: theme.palette.accent }}>
                      Open Project
                    </a>
                  </div>
                  ) : null}
                  <InlineEditableField
                    label={`${featuredProject.name} description`}
                    value={overrides.projectOverrides[featuredProject.name]?.description ?? ""}
                    onChange={(nextValue) => setProjectDescriptionOverride(featuredProject.name, nextValue)}
                    generatedValue={baseRepositories.find((item) => item.name === featuredProject.name)?.description ?? ""}
                    suggestedValue={overrides.projectOverrides[featuredProject.name]?.descriptionSuggestion ?? ""}
                    activeSource={overrides.projectOverrides[featuredProject.name]?.acceptedAi ? "ai" : "user"}
                    placeholder="Shape this repository into a stronger portfolio case study"
                    themeStyles={themeStyles}
                    onApplySuggestion={() =>
                      setProjectDescriptionOverride(
                        featuredProject.name,
                        overrides.projectOverrides[featuredProject.name]?.descriptionSuggestion ?? "",
                        "ai",
                      )
                    }
                    onDismissSuggestion={() => dismissProjectDescriptionSuggestion(featuredProject.name)}
                    onReset={() => setProjectDescriptionOverride(featuredProject.name, "")}
                    editing={isEditMode}
                    multiline
                  />
                  {isEditMode ? (
                    <div className="mt-4 grid gap-3 rounded-[1rem] border p-4" style={themeStyles.strongSurface}>
                      {!featuredProjectHasImage ? (
                        <p className="text-xs leading-5" style={themeStyles.mutedText}>
                          No image yet. Upload one, paste an image URL, or use an image found in the project README.
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.ghostButton}>
                          <input type="file" accept="image/*" className="sr-only" onChange={(event) => handleProjectImageUpload(featuredProject.name, event)} />
                          Upload Image
                        </label>
                        <button type="button" onClick={() => toggleProjectImportPanel(featuredProject.name)} className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.ghostButton}>
                          {openProjectImports[featuredProject.name] ? "Hide Image Options" : "Image Options"}
                        </button>
                        <button type="button" onClick={() => removeProjectImage(featuredProject.name)} className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.ghostButton}>
                          Remove Image
                        </button>
                        <button type="button" onClick={() => restoreDefaultProjectImage(featuredProject.name)} className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.ghostButton}>
                          Use Default Image
                        </button>
                      </div>
                      {openProjectImports[featuredProject.name] ? (
                        <div className="grid gap-3">
                          <input
                            value={overrides.projectOverrides[featuredProject.name]?.imageUrl ?? ""}
                            onChange={(event) => setProjectImageOverride(featuredProject.name, event.target.value)}
                            placeholder="https://example.com/project-image.png"
                            className="h-11 rounded-[0.95rem] border px-3 text-sm outline-none transition"
                            style={themeStyles.surface}
                          />
                          <div className="flex flex-wrap gap-2">
                            {featuredProject.readmeImages.map((imageUrl) => (
                              <button
                                key={imageUrl}
                                type="button"
                                onClick={() => setProjectImageOverride(featuredProject.name, imageUrl)}
                                className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                                style={themeStyles.ghostButton}
                              >
                                Apply README Image
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {isCanvasChildVisible("projects:grid") ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {visibleSecondaryProjectItems.map(({ id, repository }) => {
                    const hasProjectImage = Boolean(repository.resolvedImage);
                    return (
                      <div
                        key={id}
                        className={`rounded-[1.5rem] border p-5 transition ${draggedProjectName === repository.name ? "opacity-60" : ""}`}
                        style={{
                          ...themeStyles.projectCard,
                          borderColor:
                            projectDropTargetName === repository.name && draggedProjectName !== repository.name
                              ? theme.palette.accent
                              : themeStyles.projectCard.borderColor,
                          boxShadow:
                            projectDropTargetName === repository.name && draggedProjectName !== repository.name
                              ? `0 0 0 1px ${theme.palette.accent}`
                              : themeStyles.projectCard.boxShadow,
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          handleProjectDragOver(repository.name);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          handleProjectDrop(repository.name);
                        }}
                      >
                        {hasProjectImage ? <ProjectImagePreview repository={repository} themeStyles={themeStyles} compact /> : null}
                        <div className={`mb-4 ${hasProjectImage ? "mt-5" : "mt-0"} h-1 w-14 rounded-full`} style={{ backgroundColor: theme.palette.accent }} />
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2">
                            <p className="break-words text-lg font-semibold leading-6">{repository.name}</p>
                            <SourceBadge source={repository.descriptionSource} themeStyles={themeStyles} />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              draggable
                              onDragStart={(event) => {
                                event.stopPropagation();
                                handleProjectDragStart(repository.name);
                              }}
                              onDragEnd={handleProjectDragEnd}
                              className="rounded-full border p-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                              style={themeStyles.ghostButton}
                              aria-label={`Drag ${repository.name}`}
                              title={`Drag ${repository.name}`}
                            >
                              <span aria-hidden="true">⋮⋮</span>
                            </button>
                            {isEditMode ? (
                              <button
                                type="button"
                                onClick={() => setChildComponentVisible(id, false)}
                                className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                                style={themeStyles.ghostButton}
                              >
                                Hide
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <p className={`break-words whitespace-pre-wrap text-sm leading-7 ${hasProjectImage ? "mt-4" : "mt-5 text-base"}`} style={themeStyles.mutedText}>{repository.description}</p>
                        <div className="mt-5 flex flex-wrap items-center gap-3">
                          <TechBadge label={repository.language} themeStyles={themeStyles} compact />
                          <a href={repository.href} target="_blank" rel="noreferrer" className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.palette.accent }}>
                            Open Project
                          </a>
                          <button
                            type="button"
                            onClick={() => makeFeaturedProject(repository.name)}
                            className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                            style={themeStyles.ghostButton}
                          >
                            Make Featured
                          </button>
                        </div>
                        <InlineEditableField
                          label={`${repository.name} description`}
                          value={overrides.projectOverrides[repository.name]?.description ?? ""}
                          onChange={(nextValue) => setProjectDescriptionOverride(repository.name, nextValue)}
                          generatedValue={baseRepositories.find((item) => item.name === repository.name)?.description ?? ""}
                          suggestedValue={overrides.projectOverrides[repository.name]?.descriptionSuggestion ?? ""}
                          activeSource={overrides.projectOverrides[repository.name]?.acceptedAi ? "ai" : "user"}
                          placeholder="Shape this repository into a stronger portfolio case study"
                          themeStyles={themeStyles}
                          onApplySuggestion={() =>
                            setProjectDescriptionOverride(
                              repository.name,
                              overrides.projectOverrides[repository.name]?.descriptionSuggestion ?? "",
                              "ai",
                            )
                          }
                          onDismissSuggestion={() => dismissProjectDescriptionSuggestion(repository.name)}
                          onReset={() => setProjectDescriptionOverride(repository.name, "")}
                          editing={isEditMode}
                          multiline
                          compact
                        />
                        {isEditMode ? (
                          <div className="mt-4 grid gap-3 rounded-[1rem] border p-4" style={themeStyles.strongSurface}>
                            {!hasProjectImage ? (
                              <p className="text-xs leading-5" style={themeStyles.mutedText}>
                                No image yet. This card can stay text-first, or you can upload an image when you want a more visual layout.
                              </p>
                            ) : null}
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.ghostButton}>
                                <input type="file" accept="image/*" className="sr-only" onChange={(event) => handleProjectImageUpload(repository.name, event)} />
                                Upload Image
                              </label>
                              <button type="button" onClick={() => toggleProjectImportPanel(repository.name)} className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.ghostButton}>
                                {openProjectImports[repository.name] ? "Hide Image Options" : "Image Options"}
                              </button>
                              <button type="button" onClick={() => removeProjectImage(repository.name)} className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.ghostButton}>
                                Remove Image
                              </button>
                            </div>
                            {openProjectImports[repository.name] ? (
                              <div className="grid gap-3">
                                <input
                                  value={overrides.projectOverrides[repository.name]?.imageUrl ?? ""}
                                  onChange={(event) => setProjectImageOverride(repository.name, event.target.value)}
                                  placeholder="https://example.com/project-image.png"
                                  className="h-11 rounded-[0.95rem] border px-3 text-sm outline-none transition"
                                  style={themeStyles.surface}
                                />
                                <div className="flex flex-wrap gap-2">
                                  <button type="button" onClick={() => restoreDefaultProjectImage(repository.name)} className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.ghostButton}>
                                    Use Default Image
                                  </button>
                                  {repository.readmeImages.map((imageUrl) => (
                                    <button
                                      key={imageUrl}
                                      type="button"
                                      onClick={() => setProjectImageOverride(repository.name, imageUrl)}
                                      className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                                      style={themeStyles.ghostButton}
                                    >
                                      Apply README Image
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      default:
        return null;
    }
  }

  function renderCustomizePanelContent() {
    const inspectorTabs: Array<{ id: InspectorTab; label: string }> = [
      { id: "content", label: "Content" },
      { id: "layout", label: "Layout" },
      { id: "style", label: "Style" },
      { id: "theme", label: "Theme" },
      { id: "section", label: "Section" },
    ];

    return (
      <div className="grid gap-4">
        <div className="rounded-[1rem] border p-4" style={themeStyles.surface}>
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={themeStyles.mutedText}>
            Builder Inspector
          </p>
          <p className="mt-1 text-sm font-medium">{selectedSectionLabel}</p>
          <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
            {selectedSectionHint}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {inspectorTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveInspectorTab(tab.id)}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
              style={activeInspectorTab === tab.id ? appThemeStyles.accentButton : appThemeStyles.ghostButton}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeInspectorTab === "theme" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
              Theme
              <select
                value={overrides.appearance.themeId || theme.id}
                onChange={(event) =>
                  updateOverrides((current) => ({
                    ...current,
                    appearance: {
                      ...current.appearance,
                      themeId: event.target.value,
                    },
                  }))
                }
                className="h-10 rounded-[0.95rem] border px-3 text-sm font-normal outline-none"
                style={themeStyles.strongSurface}
              >
                <option value="">Auto ({theme.name})</option>
                {PORTFOLIO_THEMES.map((themeOption) => (
                  <option key={themeOption.id} value={themeOption.id}>
                    {themeOption.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
              Color Mode
              <select
                value={overrides.appearance.colorMode}
                onChange={(event) =>
                  updateOverrides((current) => ({
                    ...current,
                    appearance: {
                      ...current.appearance,
                      colorMode: event.target.value as PortfolioOverrides["appearance"]["colorMode"],
                    },
                  }))
                }
                className="h-10 rounded-[0.95rem] border px-3 text-sm font-normal outline-none"
                style={themeStyles.strongSurface}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </div>
        ) : null}
        {activeInspectorTab === "style" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                Density
                <select
                  value={overrides.appearance.density}
                  onChange={(event) =>
                    updateOverrides((current) => ({
                      ...current,
                      appearance: {
                        ...current.appearance,
                        density: event.target.value as PortfolioOverrides["appearance"]["density"],
                      },
                    }))
                  }
                  className="h-10 rounded-[0.95rem] border px-3 text-sm font-normal outline-none"
                  style={themeStyles.strongSurface}
                >
                  <option value="compact">Compact</option>
                  <option value="spacious">Spacious</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                Card Style
                <select
                  value={overrides.appearance.cardStyle}
                  onChange={(event) =>
                    updateOverrides((current) => ({
                      ...current,
                      appearance: {
                        ...current.appearance,
                        cardStyle: event.target.value as PortfolioOverrides["appearance"]["cardStyle"],
                      },
                    }))
                  }
                  className="h-10 rounded-[0.95rem] border px-3 text-sm font-normal outline-none"
                  style={themeStyles.strongSurface}
                >
                  <option value="soft">Soft</option>
                  <option value="outlined">Outlined</option>
                  <option value="elevated">Elevated</option>
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border p-4" style={themeStyles.surface}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                  Custom Palette
                </p>
                <p className="text-xs leading-5" style={themeStyles.mutedText}>
                  Fine-tune the preset theme with your own colors. These changes carry through preview, templates, public shares, and export.
                </p>
              </div>
              <button
                type="button"
                onClick={clearCustomPalette}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                style={themeStyles.ghostButton}
              >
                Clear Palette Overrides
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(PALETTE_FIELD_LABELS) as Array<keyof PreviewTheme["palette"]>).map((paletteKey) => (
                <PaletteFieldControl
                  key={paletteKey}
                  label={PALETTE_FIELD_LABELS[paletteKey]}
                  value={overrides.appearance.customPalette?.[paletteKey] || activePalette[paletteKey]}
                  onChange={(nextValue) => updateCustomPalette(paletteKey, nextValue)}
                  onReset={() => resetCustomPaletteField(paletteKey)}
                  themeStyles={themeStyles}
                />
              ))}
            </div>
          </>
        ) : null}
        {activeInspectorTab === "layout" ? (
          <div className="grid gap-4">
            <div className="grid gap-1">
              <label className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                Section Layout
              </label>
              <p className="text-xs leading-5" style={themeStyles.mutedText}>
                Turn stacked layout on for a simple vertical flow, or switch it off to place non-project sections side by side.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "stacked", label: "Stacked Layout" },
                  { id: "split", label: "Flexible Layout" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      updateOverrides((current) => ({
                        ...current,
                        appearance: {
                          ...current.appearance,
                          sectionLayout: option.id as PortfolioOverrides["appearance"]["sectionLayout"],
                        },
                      }))
                    }
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                    style={
                      overrides.appearance.sectionLayout === option.id
                        ? themeStyles.accentButton
                        : themeStyles.ghostButton
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-[1rem] border p-4" style={themeStyles.surface}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                Layout Behavior
              </p>
              <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
                Keep the editor focused on one canvas. Use drag-and-drop to place sections, then drag the divider handles between sections to resize them directly.
              </p>
            </div>
          </div>
        ) : null}
        {activeInspectorTab === "section" ? (
          <div className="rounded-[1rem] border p-4" style={themeStyles.surface}>
            {selectedCanvasComponent ? (
              <div className="grid gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                    Selected Section
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {selectedCanvasComponent.type === "custom"
                      ? selectedCustomSection?.title || "Custom Section"
                      : sectionLabels[selectedCanvasComponent.type]}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => removeSection(selectedCanvasComponent.id)}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                    style={themeStyles.ghostButton}
                  >
                    {selectedCanvasComponent.type === "custom" ? "Remove Section" : "Hide Section"}
                  </button>
                  {selectedCanvasComponent.type === "custom" ? (
                    <button
                      type="button"
                      onClick={() => duplicateSection(selectedCanvasComponent.id)}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                      style={themeStyles.ghostButton}
                    >
                      Duplicate
                    </button>
                  ) : null}
                </div>
                {canSectionShareRow(selectedCanvasComponent) ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                      Width
                    </p>
                    <p className="mt-2 text-xs leading-5" style={themeStyles.mutedText}>
                      Resize this section directly on the canvas. Drag the divider handle beside it to change its share of the row.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs leading-5" style={themeStyles.mutedText}>
                    This section stays full-width to keep the layout readable and visually balanced.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs leading-5" style={themeStyles.mutedText}>
                Select a section in the preview to adjust its settings here.
              </p>
            )}
          </div>
        ) : null}
        {activeInspectorTab === "content" ? (
          <div className="rounded-[1rem] border p-4" style={themeStyles.surface}>
            {selectedCustomSection ? (
              <div className="grid gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                  Custom Section Content
                </p>
                <input
                  value={selectedCustomSection.title}
                  onChange={(event) =>
                    updateOverrides((current) => ({
                      ...current,
                      customSections: current.customSections.map((section) =>
                        section.id === selectedCustomSection.id ? { ...section, title: event.target.value } : section,
                      ),
                    }))
                  }
                  placeholder="Section title"
                  className="h-11 rounded-[0.95rem] border px-3 text-sm outline-none transition"
                  style={themeStyles.strongSurface}
                />
                <textarea
                  value={selectedCustomSection.description}
                  onChange={(event) =>
                    updateOverrides((current) => ({
                      ...current,
                      customSections: current.customSections.map((section) =>
                        section.id === selectedCustomSection.id ? { ...section, description: event.target.value } : section,
                      ),
                    }))
                  }
                  rows={5}
                  placeholder="Describe what this section should communicate"
                  className="min-h-[120px] rounded-[0.95rem] border px-3 py-3 text-sm leading-7 outline-none transition"
                  style={themeStyles.strongSurface}
                />
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                  Content Editing
                </p>
                {selectedCanvasComponent ? (
                  <>
                    <p className="mt-2 text-xs leading-5" style={themeStyles.mutedText}>
                      {SECTION_CONTENT_HINTS[selectedCanvasComponent.type]}
                    </p>
                    <div className="mt-3 rounded-[0.95rem] border p-3" style={themeStyles.strongSurface}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                        Best way to edit this section
                      </p>
                      <p className="mt-2 text-xs leading-5" style={themeStyles.mutedText}>
                        Open edit mode, then work directly inside the canvas. Inline fields stay closer to the final design and make the builder feel more visual.
                      </p>
                      {!isEditMode ? (
                        <button
                          type="button"
                          onClick={() => toggleEditMode(true)}
                          className="mt-3 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                          style={themeStyles.ghostButton}
                        >
                          Open Edit Mode
                        </button>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-xs leading-5" style={themeStyles.mutedText}>
                    Use the live canvas to edit generated copy directly. Select a section to see the most relevant guidance here.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  function renderBuilderWorkspacePanel() {
    if (!preview) {
      return null;
    }

    return (
      <div className="rounded-[1.1rem] border px-4 py-4 sm:px-5" style={themeStyles.sectionSurface}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={themeStyles.mutedText}>
              Builder Workspace
            </p>
            <p className="mt-1 text-sm font-medium">
              {selectedCanvasComponent
                ? `${selectedSectionLabel} selected. Drag, resize, or edit it directly on the canvas.`
                : "Select a section, move it on the canvas, then refine content and styling in the inspector."}
            </p>
            <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
              Flexible layout lets non-project sections share a row. Projects always stays full width.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={themeStyles.chip}>
              {visibleCanvasComponents.length} visible
            </span>
            {hiddenSectionCount > 0 ? (
              <span className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={themeStyles.ghostButton}>
                {hiddenSectionCount} hidden
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => toggleEditMode()}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
              style={themeStyles.ghostButton}
            >
              {isEditMode ? "Hide Editor" : "Open Editor"}
            </button>
            <button
              type="button"
              onClick={resetCanvasLayout}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
              style={themeStyles.ghostButton}
            >
              Reset Canvas
            </button>
            <button
              type="button"
              onClick={() => revealInspector(selectedCanvasComponent?.type === "custom" ? "content" : "layout")}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] xl:hidden"
              style={themeStyles.accentButton}
            >
              Open Inspector
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="rounded-[1rem] border px-4 py-3" style={themeStyles.surface}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                  Page Structure
                </p>
                <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
                  {selectedSectionHint}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {canvasComponents.map((component) => {
                const label =
                  component.type === "custom"
                    ? overrides.customSections.find((section) => section.id === component.id)?.title ||
                      component.title ||
                      "Custom Section"
                    : sectionLabels[component.type];
                const isSelected = selectedSectionId === component.id;

                return (
                  <button
                    key={`navigator-${component.id}`}
                    type="button"
                    onClick={() => focusSection(component.id, component.type === "custom" ? "content" : "section")}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]"
                    style={
                      isSelected
                        ? themeStyles.accentButton
                        : component.visible
                          ? themeStyles.ghostButton
                          : {
                              ...themeStyles.ghostButton,
                              opacity: 0.68,
                            }
                    }
                  >
                    {label}
                    {!component.visible ? " (Hidden)" : ""}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1rem] border px-4 py-3" style={themeStyles.surface}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
              Manage Sections
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {availableBuiltInSections.map((component) => (
                <button
                  key={`add-${component.id}`}
                  type="button"
                  onClick={() => addBuiltInSection(component.type)}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                  style={themeStyles.ghostButton}
                >
                  {sectionLabels[component.type]}
                </button>
              ))}
              <button
                type="button"
                onClick={addCustomSection}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                style={themeStyles.accentButton}
              >
                Custom Section
              </button>
              {hiddenCanvasComponents.map((component) => (
                <button
                  key={`restore-${component.id}`}
                  type="button"
                  onClick={() => restoreSection(component.id)}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                  style={themeStyles.ghostButton}
                >
                  Restore {component.type === "custom" ? component.title || "Custom Section" : sectionLabels[component.type]}
                </button>
              ))}
            </div>
            {hiddenBlockCount > 0 ? (
              <div className="mt-3 grid gap-2">
                {hiddenChildComponentGroups.map((group) => (
                  <div key={group.parentId}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={themeStyles.mutedText}>
                      {group.label}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setChildComponentVisible(item.id, true)}
                          className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                          style={themeStyles.ghostButton}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen px-3 py-3 sm:px-4 sm:py-4 xl:px-5" style={appThemeStyles.page}>
      <div className="mx-auto flex w-full max-w-[112rem] flex-col gap-3">
        <section className="flex flex-col gap-2">
          <div className="rounded-[1.35rem] border px-4 py-3" style={appThemeStyles.navSurface}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] border text-sm font-semibold" style={appThemeStyles.strongSurface}>
                    R2
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight">Repo2Site</p>
                    <p className="text-xs" style={appThemeStyles.mutedText}>
                      Turn GitHub work into a portfolio you can review, edit, and export
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.chip}>
                  {preview?.profile.username ? "Profile live" : "Waiting for source"}
                </span>
                <span className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={isEditMode ? themeStyles.aiBadge : themeStyles.githubBadge}>
                  {isEditMode ? "Editor open" : "Preview focused"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    walkthrough.status === "in_progress"
                      ? walkthrough.openWalkthrough("quick")
                      : walkthrough.showLauncher()
                  }
                  className="rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition hover:-translate-y-0.5"
                  style={appThemeStyles.ghostButton}
                >
                  {walkthrough.status === "in_progress" ? "Resume Walkthrough" : "Walkthrough"}
                </button>
                <button
                  type="button"
                  onClick={cycleAppTheme}
                  className="rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition hover:-translate-y-0.5"
                  style={appThemeStyles.ghostButton}
                >
                  Theme: {themeChoice === "system" ? "System" : themeChoice === "light" ? "Light" : "Dark"}
                </button>
              </div>
            </div>
          </div>

          <div {...getTourHighlightProps("tour-github-import")}>
            <div
              className="rounded-[1.45rem] border px-4 py-4 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.58)]"
              style={appThemeStyles.strongSurface}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={appThemeStyles.mutedText}>
                    Build From GitHub
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[2rem]">
                    Turn repositories, README context, and career materials into a portfolio draft.
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6" style={appThemeStyles.mutedText}>
                    Start with GitHub, optionally add a resume, then review the draft in the live preview before exporting the final site.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.9fr)]">
                <div className="rounded-[1.15rem] border p-4 sm:p-5" style={appThemeStyles.surface}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.mutedText}>
                        Primary Flow
                      </p>
                      <p className="mt-1 text-base font-semibold">Load a public GitHub profile to generate your draft.</p>
                      <p className="mt-1 text-sm leading-6" style={appThemeStyles.mutedText}>
                        Paste a profile URL, create the first version, then refine it with editing, AI, and themes.
                      </p>
                    </div>
                    <span
                      className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                      style={themeStyles.githubBadge}
                    >
                      Draft first
                    </span>
                  </div>
                  <form className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center" onSubmit={handleSubmit}>
                    <input
                      id="profile-url"
                      type="url"
                      aria-label="GitHub profile URL"
                      required
                      value={profileUrl}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setProfileUrl(nextValue);

                        if (githubImportAutofillNotice) {
                          const signedInProfileUrl =
                            authSession?.profileUrl?.trim() ||
                            (authSession?.username ? `https://github.com/${authSession.username}` : "");

                          if (nextValue.trim() !== signedInProfileUrl.trim()) {
                            setGitHubImportAutofillNotice(null);
                          }
                        }
                      }}
                      placeholder="https://github.com/username"
                      className="h-11 min-w-0 flex-1 rounded-full border px-4 text-sm outline-none transition"
                      style={appThemeStyles.inputSurface}
                    />
                    <button
                      type="submit"
                      disabled={isLoading || isEnhancing}
                      className="h-11 shrink-0 whitespace-nowrap rounded-full px-5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
                      style={themeStyles.accentButton}
                    >
                      {isLoading ? "Refreshing..." : "Load GitHub"}
                    </button>
                  </form>
                  {githubImportAutofillNotice ? (
                    <p className="mt-2 text-xs leading-5" style={appThemeStyles.infoText}>
                      Signed in as @{githubImportAutofillNotice}. Profile link ready to import.
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] leading-5" style={appThemeStyles.mutedText}>
                    <p>Load GitHub creates the draft from a public profile URL.</p>
                    <p>Upload a resume if you want stronger personalization.</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div {...getTourHighlightProps("tour-resume-upload")}>
                    <div className="rounded-[1.1rem] border p-4" style={appThemeStyles.surface}>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.mutedText}>
                        Optional Context
                      </p>
                      <p className="mt-1 text-sm font-medium">Add your resume before or after import.</p>
                      <p className="mt-1 text-xs leading-5" style={appThemeStyles.mutedText}>
                        Resume details help Repo2Site shape stronger positioning and project summaries.
                      </p>
                      <label
                        className="mt-3 inline-flex rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                        style={themeStyles.ghostButton}
                      >
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          multiple
                          onChange={handleResumeUploadChange}
                          className="sr-only"
                        />
                        Upload Resume
                      </label>
                    </div>
                  </div>

                    <div className="rounded-[1.1rem] border p-4" style={appThemeStyles.surface}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.mutedText}>
                            Account Features
                          </p>
                          <p className="mt-1 text-sm font-medium">
                            {authSession ? `Signed in as @${authSession.username}.` : "Sign in stays optional."}
                          </p>
                          <p className="mt-1 text-xs leading-5" style={appThemeStyles.mutedText}>
                            Sign in to publish, share, and use account-backed features.
                          </p>
                        </div>
                      <button
                        type="button"
                        onClick={() => setIsGitHubSignInHelpOpen((current) => !current)}
                        aria-expanded={isGitHubSignInHelpOpen}
                        className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition hover:-translate-y-0.5"
                        style={appThemeStyles.ghostButton}
                      >
                        Why sign in?
                      </button>
                    </div>
                    {authSession ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch("/api/auth/session", { method: "DELETE" }).catch(() => null);
                          setAuthSession(null);
                          setGitHubImportAutofillNotice(null);
                          setShareError(null);
                          setTemplateError(null);
                        }}
                        className="mt-3 inline-flex rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                        style={appThemeStyles.ghostButton}
                      >
                        Sign Out @{authSession.username}
                      </button>
                    ) : (
                      <a
                        href="/api/auth/github?returnTo=/builder"
                        className="mt-3 inline-flex rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                        style={appThemeStyles.ghostButton}
                      >
                        Sign In with GitHub
                      </a>
                    )}
                    {isGitHubSignInHelpOpen ? (
                      <p className="mt-3 text-xs leading-5" style={appThemeStyles.mutedText}>
                        GitHub import still uses a public profile URL. Sign-in only connects publishing, sharing, and template activity to your account.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[1.1rem] border p-4" style={appThemeStyles.surface}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.mutedText}>
                      Next Actions
                    </p>
                    <p className="mt-1 text-sm font-medium">Once the draft is loaded, refine, publish, and export from here.</p>
                    <p className="mt-1 text-xs leading-5" style={appThemeStyles.mutedText}>
                      AI suggestions stay pending until accepted. Export downloads only the finished portfolio site.
                    </p>
                  </div>
                  <span
                    className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                    style={appThemeStyles.chip}
                  >
                    Secondary actions
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div {...getTourHighlightProps("tour-ai")}>
                    <button
                      type="button"
                      onClick={handleEnhance}
                      disabled={!preview || isLoading || isEnhancing}
                      className="rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                      style={themeStyles.ghostButton}
                    >
                      {isEnhancing ? "Enhancing..." : "Enhance with AI"}
                    </button>
                  </div>
                  {pendingAiSuggestionCount > 0 ? (
                    <button
                      type="button"
                      onClick={acceptAllAiSuggestions}
                      className="rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                      style={themeStyles.ghostButton}
                    >
                      Accept All AI ({pendingAiSuggestionCount})
                    </button>
                  ) : null}
                  <div {...getTourHighlightProps("tour-open-editor")}>
                    <button
                      type="button"
                      onClick={() => toggleEditMode()}
                      className="rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                      style={themeStyles.ghostButton}
                    >
                      {isEditMode ? "Hide Editor" : "Open Editor"}
                    </button>
                  </div>
                  <div {...getTourHighlightProps("tour-browse-templates")}>
                    <Link
                      href="/templates"
                      className="rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                      style={themeStyles.ghostButton}
                    >
                      Browse Templates
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsShareOpen((current) => !current)}
                    disabled={!preview || isLoading}
                    className="rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                    style={themeStyles.ghostButton}
                  >
                    {isShareOpen ? "Hide Share" : "Share Portfolio"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTemplateOpen((current) => !current)}
                    disabled={!preview || isLoading}
                    className="rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                    style={themeStyles.ghostButton}
                  >
                    {isTemplateOpen ? "Hide Templates" : "Publish Template"}
                  </button>
                  <div {...getTourHighlightProps("tour-export")}>
                    <button
                      type="button"
                      onClick={handleExportZip}
                      disabled={!preview || isLoading || isEnhancing || isExporting}
                      className="rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                      style={themeStyles.ghostButton}
                    >
                      {isExporting ? "Exporting..." : "Download Portfolio ZIP"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOverrides(buildEmptyOverrides())}
                    disabled={!hasOverrides}
                    className="rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                    style={themeStyles.accentButton}
                  >
                    Reset
                  </button>
                </div>
              </div>
            <div className="mt-4 rounded-[1rem] border" style={appThemeStyles.surface}>
              <button
                type="button"
                onClick={() => setIsQuickStartExpanded((current) => !current)}
                className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.mutedText}>
                    How This Works
                  </p>
                  <p className="mt-1 text-sm font-medium">New here? See the quick setup steps.</p>
                  <p className="mt-1 text-xs leading-5" style={appThemeStyles.mutedText}>
                    GitHub creates the draft, your edits shape it, and AI suggestions stay pending until accepted.
                  </p>
                </div>
                <span
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                  style={appThemeStyles.ghostButton}
                >
                  {isQuickStartExpanded ? "Hide" : "Show"}
                </span>
              </button>
              {isQuickStartExpanded ? (
                <div className="grid gap-3 border-t px-4 py-4" style={{ borderColor: appThemeStyles.surface.borderColor }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium">Follow this path if you are new to the builder.</p>
                    <button
                      type="button"
                      onClick={() => walkthrough.openWalkthrough("quick", true)}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                      style={appThemeStyles.ghostButton}
                    >
                      Restart Walkthrough
                    </button>
                  </div>
                  <div className="grid gap-2 text-sm" style={appThemeStyles.mutedText}>
                    <p><span className="font-semibold" style={{ color: appThemeStyles.surface.color }}>1.</span> Upload a resume if you want extra context for the builder.</p>
                    <p><span className="font-semibold" style={{ color: appThemeStyles.surface.color }}>2.</span> Paste a public GitHub profile and click <span className="font-semibold" style={{ color: appThemeStyles.surface.color }}>Load GitHub</span>.</p>
                    <p><span className="font-semibold" style={{ color: appThemeStyles.surface.color }}>3.</span> Use AI when you want help improving wording, structure, and presentation.</p>
                    <p><span className="font-semibold" style={{ color: appThemeStyles.surface.color }}>4.</span> Open Edit to adjust content and section details directly.</p>
                    <p><span className="font-semibold" style={{ color: appThemeStyles.surface.color }}>5.</span> Open Customize to change themes and colors.</p>
                    <p><span className="font-semibold" style={{ color: appThemeStyles.surface.color }}>6.</span> Rearrange sections and projects to put the strongest work first.</p>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border px-3 py-1 text-xs font-medium" style={themeStyles.chip}>
                GitHub + README aware
              </span>
              <span className="rounded-full border px-3 py-1 text-xs font-medium" style={themeStyles.chip}>
                Resume and profile imports
              </span>
              <span className="rounded-full border px-3 py-1 text-xs font-medium" style={themeStyles.chip}>
                Human-reviewed AI suggestions
              </span>
            </div>
            <p className="mt-3 text-sm leading-6" style={themeStyles.mutedText}>
              Resume upload is the fastest way to improve personalization. Adding a resume gives AI stronger grounding for summaries, profile content, and portfolio copy.
            </p>
            <p className="mt-2 text-xs leading-5" style={themeStyles.mutedText}>
              New here? GitHub creates the first draft, your edits shape the final version, and AI suggestions stay pending until you approve them.
            </p>
            {isShareOpen ? (
              <div className="mt-4 rounded-[1.15rem] border p-4" style={themeStyles.surface}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                      Share portfolio
                    </p>
                    <p className="mt-1 text-sm font-medium">Publish a clean public link you can send to anyone.</p>
                    <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
                      The shared page shows only the portfolio site, not the editor or internal tools.
                    </p>
                    <p className="mt-2 text-xs leading-5" style={themeStyles.mutedText}>
                      {authSession
                        ? `Signed in as @${authSession.username}. This public link will be owned by your GitHub account.`
                        : "Sign in with GitHub first so the public link is tied to your account and can be updated safely later."}
                    </p>
                  </div>
                  {sharedPortfolioUrl ? (
                    <a
                      href={sharedPortfolioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                      style={themeStyles.ghostButton}
                    >
                      Open Public Page
                    </a>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                      Public URL
                    </span>
                    <div className="flex items-center overflow-hidden rounded-full border" style={themeStyles.strongSurface}>
                      <span className="border-r px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em]" style={{ ...themeStyles.mutedText, borderColor: theme.palette.border }}>
                        /u/
                      </span>
                      <input
                        type="text"
                        value={shareSlug}
                        onChange={(event) => {
                          setShareCopied(false);
                          setShareCaptionCopied(false);
                          setShareError(null);
                          setShareSlug(buildShareSlug(event.target.value));
                        }}
                        placeholder="your-name"
                        className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none"
                      />
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={handlePublishShareLink}
                    disabled={
                      !preview ||
                      isPublishingShare ||
                      shareAvailability?.reason === "invalid" ||
                      shareAvailability?.reason === "taken"
                    }
                    className="rounded-full px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                    style={themeStyles.accentButton}
                  >
                    {isPublishingShare ? "Publishing..." : sharedPortfolioUrl ? "Update Public Link" : "Publish Public Link"}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs leading-5" style={themeStyles.mutedText}>
                  {isCheckingShareSlug ? <p>Checking public URL…</p> : null}
                  {!isCheckingShareSlug && shareAvailability?.reason === "available" ? (
                    <p>This public URL is available.</p>
                  ) : null}
                  {!isCheckingShareSlug && shareAvailability?.reason === "owned" ? (
                    <p>You already control this URL, so publishing will update the existing page.</p>
                  ) : null}
                  {!isCheckingShareSlug && shareAvailability?.reason === "taken" ? (
                    <p>
                      That URL is already in use.
                      {shareAvailability.suggestedSlug ? ` Try ${shareAvailability.suggestedSlug}.` : ""}
                    </p>
                  ) : null}
                  {!isCheckingShareSlug && shareAvailability?.reason === "invalid" ? (
                    <p>Use 2-60 lowercase letters, numbers, and hyphens only.</p>
                  ) : null}
                </div>
                {sharedPortfolioUrl ? (
                  <div className="mt-4 grid gap-4 rounded-[1rem] border p-4" style={themeStyles.strongSurface}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                          Live link
                        </p>
                        <p className="mt-1 truncate text-sm font-medium">{sharedPortfolioUrl}</p>
                        <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
                          Published {sharePublishedAt ? new Date(sharePublishedAt).toLocaleString() : "just now"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleCopyShareLink}
                          className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                          style={themeStyles.ghostButton}
                        >
                          {shareCopied ? "Copied" : "Copy Link"}
                        </button>
                        {canUseNativeShare ? (
                          <button
                            type="button"
                            onClick={handleShareAnywhere}
                            className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                            style={themeStyles.ghostButton}
                          >
                            Share Anywhere
                          </button>
                        ) : null}
                        <a
                          href={sharedPortfolioUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                          style={themeStyles.ghostButton}
                        >
                          Open Public Page
                        </a>
                      </div>
                    </div>
                    <div className="rounded-[0.95rem] border p-3" style={themeStyles.surface}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                            Share caption
                          </p>
                          <p className="mt-1 max-w-3xl text-sm leading-6">{shareText}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleCopyShareCaption}
                            className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                            style={themeStyles.ghostButton}
                          >
                            {shareCaptionCopied ? "Caption Copied" : "Copy Caption"}
                          </button>
                          {shareImageUrl ? (
                            <a
                              href={shareImageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                              style={themeStyles.ghostButton}
                            >
                              Preview Image
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-[0.95rem] border p-3" style={themeStyles.surface}>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                          Direct share
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {[
                            { label: "LinkedIn", href: shareLinkedInHref },
                            { label: "X", href: shareTwitterHref },
                            { label: "Facebook", href: shareFacebookHref },
                            { label: "WhatsApp", href: shareWhatsAppHref },
                            { label: "Telegram", href: shareTelegramHref },
                            { label: "Reddit", href: shareRedditHref },
                            { label: "Email", href: shareEmailHref },
                          ].map((platform) => (
                            <a
                              key={platform.label}
                              href={platform.href}
                              target={platform.href.startsWith("mailto:") ? undefined : "_blank"}
                              rel={platform.href.startsWith("mailto:") ? undefined : "noreferrer"}
                              className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                              style={themeStyles.ghostButton}
                            >
                              {platform.label}
                            </a>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[0.95rem] border p-3" style={themeStyles.surface}>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                          Copy-and-post platforms
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await handleCopyShareLink();
                              await handleCopyShareCaption();
                              openPlatformFallback("https://www.instagram.com/", "Portfolio Share Instagram Prep");
                            }}
                            className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                            style={themeStyles.ghostButton}
                          >
                            Instagram
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await handleCopyShareLink();
                              await handleCopyShareCaption();
                              openPlatformFallback("https://www.tiktok.com/", "Portfolio Share TikTok Prep");
                            }}
                            className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                            style={themeStyles.ghostButton}
                          >
                            TikTok
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await handleCopyShareLink();
                              await handleCopyShareCaption();
                              trackAnalyticsEvent("Portfolio Share Discord Prep");
                            }}
                            className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                            style={themeStyles.ghostButton}
                          >
                            Discord
                          </button>
                        </div>
                        <p className="mt-3 text-xs leading-5" style={themeStyles.mutedText}>
                          Instagram, TikTok, and Discord work best as copy-and-post flows on the web, so Repo2Site prepares the link and caption for you instead of pretending there is a native one-click share.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-[1rem] border px-4 py-3 text-sm leading-6" style={themeStyles.surface}>
                    <p className="font-medium">Publish once, then share anywhere.</p>
                    <p className="mt-1" style={themeStyles.mutedText}>
                      Repo2Site generates a standalone public page with your approved portfolio content, subtle attribution, and a call-to-action back to the app.
                    </p>
                  </div>
                )}
                {shareError ? <p className="mt-3 text-sm" style={themeStyles.errorText}>{shareError}</p> : null}
              </div>
            ) : null}
            {isTemplateOpen ? (
              <div className="mt-4 rounded-[1.15rem] border p-4" style={themeStyles.surface}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                      Publish template
                    </p>
                    <p className="mt-1 text-sm font-medium">Share this design as a reusable community template.</p>
                    <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
                      Templates publish theme and layout choices only. They do not replace another user’s GitHub projects, resume content, or personal profile details.
                    </p>
                    <p className="mt-2 text-xs leading-5" style={themeStyles.mutedText}>
                      {authSession
                        ? `Publishing as @${authSession.username}. Template ownership, reactions, and future moderation all follow this account.`
                        : "Sign in with GitHub first so your template is published under a real account instead of a browser-local identity."}
                    </p>
                  </div>
                  <Link
                    href="/templates"
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                    style={themeStyles.ghostButton}
                  >
                    Open Gallery
                  </Link>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                      Template title
                    </span>
                    <input
                      type="text"
                      value={templateTitle}
                      onChange={(event) => setTemplateTitle(event.target.value)}
                      className="rounded-[1rem] border px-4 py-3 text-sm outline-none"
                      style={themeStyles.strongSurface}
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                      Category
                    </span>
                    <input
                      type="text"
                      value={templateCategory}
                      onChange={(event) => setTemplateCategory(event.target.value)}
                      className="rounded-[1rem] border px-4 py-3 text-sm outline-none"
                      style={themeStyles.strongSurface}
                    />
                  </label>
                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                      Short description
                    </span>
                    <textarea
                      value={templateDescription}
                      onChange={(event) => setTemplateDescription(event.target.value)}
                      rows={3}
                      className="rounded-[1rem] border px-4 py-3 text-sm outline-none"
                      style={themeStyles.strongSurface}
                    />
                  </label>
                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                      Tags
                    </span>
                    <input
                      type="text"
                      value={templateTags}
                      onChange={(event) => setTemplateTags(event.target.value)}
                      placeholder="minimal, product, developer"
                      className="rounded-[1rem] border px-4 py-3 text-sm outline-none"
                      style={themeStyles.strongSurface}
                    />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs leading-5" style={themeStyles.mutedText}>
                    Current preset includes theme, color mode, density, card style, section layout, section order, and section visibility.
                  </p>
                  <button
                    type="button"
                    onClick={handlePublishTemplate}
                    disabled={!preview || isPublishingTemplate}
                    className="rounded-full px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                    style={themeStyles.accentButton}
                  >
                    {isPublishingTemplate ? "Publishing..." : "Publish Template"}
                  </button>
                </div>
                {templateMessage ? <p className="mt-3 text-sm" style={themeStyles.successText}>{templateMessage}</p> : null}
                {templateError ? <p className="mt-3 text-sm" style={themeStyles.errorText}>{templateError}</p> : null}
              </div>
            ) : null}
            {preview ? (
              <div className="mt-4 rounded-[1rem] border p-4" style={themeStyles.surface}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                      Portfolio completeness
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {completenessScore}% ready for review
                    </p>
                  </div>
                  <span
                    className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                    style={themeStyles.chip}
                  >
                    {missingGuidance.length === 0 ? "Looking strong" : `${missingGuidance.length} quick wins`}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${completenessScore}%`, backgroundColor: theme.palette.accent }}
                  />
                </div>
                {missingGuidance.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {missingGuidance.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border px-3 py-1 text-xs font-medium"
                        style={themeStyles.ghostButton}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs leading-5" style={themeStyles.mutedText}>
                    The core sections are filled in. This is a good point to fine-tune copy and export a first version.
                  </p>
                )}
              </div>
            ) : null}
            {enhanceError ? (
              <div className="mt-3 rounded-[1rem] border px-4 py-3 text-sm" style={themeStyles.accentBlock}>
                {enhanceError}
              </div>
            ) : null}
            </div>
          </div>

        </section>

        <section className="rounded-[1.9rem] border shadow-[0_26px_80px_-42px_rgba(15,23,42,0.48)]" style={themeStyles.surface}>
          <div className={preview ? "xl:grid xl:grid-cols-[minmax(0,1fr)_21rem]" : ""}>
          <article className="min-w-0">
            {error ? (
              <div className="border-b px-6 py-4 text-sm" style={themeStyles.accentBlock}>
                {error}
              </div>
            ) : null}
            <header className="border-b px-5 py-3 backdrop-blur sm:px-7 sm:py-4" style={themeStyles.navSurface}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={themeStyles.mutedText}>
                    Visual Builder
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {preview?.profile.name || "Portfolio Preview"}
                  </p>
                  <p className="mt-1 text-xs" style={themeStyles.mutedText}>
                    {selectedCanvasComponent
                      ? `${selectedSectionLabel} selected. Click, drag, and refine the page directly on the canvas.`
                      : preview?.profile.username
                        ? `@${preview.profile.username}`
                        : "Start by loading GitHub, then use the preview to review and edit the generated site"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedCanvasComponent ? (
                    <span
                      className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                      style={themeStyles.chip}
                    >
                      {selectedSectionLabel}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => revealInspector(selectedCanvasComponent?.type === "custom" ? "content" : "layout")}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] xl:hidden"
                    style={themeStyles.ghostButton}
                  >
                    Inspector
                  </button>
                </div>
              </div>
            </header>

            <div
              className={`grid w-full min-w-0 ${densityClasses.stackGap} px-4 py-4 sm:px-5 sm:py-5 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:24px_24px]`}
            >
              {!preview ? (
                <div className="rounded-[1.6rem] border p-5 sm:p-6" style={themeStyles.sectionSurface}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border" style={themeStyles.strongSurface}>
                      <span className="text-lg">↗</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={themeStyles.mutedText}>
                        First Step
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight">Load a GitHub profile to generate your first portfolio draft.</h2>
                      <p className="mt-3 max-w-3xl text-sm leading-7" style={themeStyles.mutedText}>
                    Repo2Site uses public GitHub details and repository descriptions to build a starting website. After that, you can upload a resume, edit the copy, reorder projects, review AI suggestions, and export the final result.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => walkthrough.openWalkthrough("quick", true)}
                          className="rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                          style={themeStyles.ghostButton}
                        >
                          Start Walkthrough
                        </button>
                        <button
                          type="button"
                          onClick={() => resumeUploadInputRef.current?.click()}
                          className="rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                          style={themeStyles.ghostButton}
                        >
                          Upload Resume First
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              {renderBuilderWorkspacePanel()}
              {preview && visibleSectionRows.length === 0 ? (
                <div className="rounded-[1.5rem] border p-5 sm:p-6" style={themeStyles.sectionSurface}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={themeStyles.mutedText}>
                    Empty Canvas
                  </p>
                  <p className="mt-2 text-lg font-semibold">There are no visible sections right now.</p>
                  <p className="mt-2 text-sm leading-6" style={themeStyles.mutedText}>
                    Restore a hidden section or add a custom one to keep building.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {hiddenCanvasComponents.slice(0, 4).map((component) => (
                      <button
                        key={`empty-restore-${component.id}`}
                        type="button"
                        onClick={() => restoreSection(component.id)}
                        className="rounded-full border px-4 py-2 text-sm font-medium"
                        style={themeStyles.ghostButton}
                      >
                        Restore {component.type === "custom" ? component.title || "Custom Section" : sectionLabels[component.type]}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={addCustomSection}
                      className="rounded-full border px-4 py-2 text-sm font-medium"
                      style={themeStyles.accentButton}
                    >
                      Add Custom Section
                    </button>
                  </div>
                </div>
              ) : null}
              {visibleSectionRows.map((row) => (
                <div
                  key={row.id}
                  data-layout-row-id={row.id}
                  className={`grid gap-4 ${
                    portfolio.appearance.sectionLayout === "stacked" || row.items.length === 1
                      ? "grid-cols-1"
                      : "grid-cols-1 rounded-[1.6rem] border p-3 xl:grid xl:items-stretch xl:gap-4 xl:p-4"
                  }`}
                  style={(() => {
                    if (portfolio.appearance.sectionLayout === "stacked" || row.items.length === 1) {
                      return undefined;
                    }

                    const leftRatio = getCanvasSectionWidthRatio(row.items[0] ?? row.items[1]);
                    const rightRatio = getCanvasSectionWidthRatio(row.items[1] ?? row.items[0]);

                    return {
                      ...themeStyles.subtleSurface,
                      gridTemplateColumns:
                        row.items.length === 2
                          ? `minmax(0, calc(${Math.round(leftRatio * 100)}% - 1.625rem)) 1.25rem minmax(0, calc(${Math.round(rightRatio * 100)}% - 1.625rem))`
                          : undefined,
                    } as CSSProperties;
                  })()}
                >
                  {row.items.map((component, index) => {
                    const isDragging = draggedSectionId === component.id;
                    const isDropTarget = dropTargetSectionId === component.id && draggedSectionId !== component.id;
                    const widthRatio =
                      portfolio.appearance.sectionLayout === "stacked" || !canSectionShareRow(component)
                        ? 1
                        : getCanvasSectionWidthRatio(component);
                    const nextComponent = row.items[index + 1];
                    const canShowResizeHandle =
                      portfolio.appearance.sectionLayout !== "stacked" &&
                      Boolean(nextComponent) &&
                      canSectionsShareRow(component, nextComponent);
                    const resizeHandleIsActive =
                      Boolean(nextComponent) &&
                      resizingSectionIds.includes(component.id) &&
                      resizingSectionIds.includes(nextComponent.id);

                    return (
                      <Fragment key={component.id}>
                        <div
                          className={`min-w-0 w-full ${row.items.length > 1 ? "xl:self-stretch" : "xl:shrink-0 xl:self-stretch xl:basis-[var(--section-width)] xl:max-w-[var(--section-width)]"}`}
                          style={
                            row.items.length > 1
                              ? undefined
                              : ({ ["--section-width" as string]: `${Math.round(widthRatio * 100)}%` } as CSSProperties)
                          }
                        >
                          <PreviewSectionFrame
                            sectionId={component.id}
                            label={
                              component.type === "custom"
                                ? overrides.customSections.find((section) => section.id === component.id)?.title || component.title || "Custom Section"
                                : sectionLabels[component.type]
                            }
                            themeStyles={themeStyles}
                            theme={theme}
                            isDragging={isDragging}
                            isResizing={resizingSectionIds.includes(component.id)}
                            isSelected={selectedSectionId === component.id}
                            isHovered={hoveredSectionId === component.id}
                            isDropTarget={isDropTarget}
                            dropPosition={isDropTarget ? dropPosition : null}
                            widthRatio={widthRatio}
                            canResize={
                              portfolio.appearance.sectionLayout !== "stacked" &&
                              row.items.length > 1 &&
                              canSectionShareRow(component)
                            }
                            duplicateLabel={component.type === "custom" ? "Duplicate" : undefined}
                            onDuplicate={component.type === "custom" ? () => duplicateSection(component.id) : undefined}
                            onSelect={() => focusSection(component.id, component.type === "custom" ? "content" : "section")}
                            onHoverChange={(hovered) => setHoveredSectionId(hovered ? component.id : null)}
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "move";
                              handleSectionDragStart(component.id);
                            }}
                            onDragOver={(event) => {
                              event.preventDefault();
                              event.dataTransfer.dropEffect = "move";
                              handleSectionDragOver(event, component.id);
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              handleSectionDrop(component.id);
                            }}
                            onDragEnd={handleSectionDragEnd}
                            onRemove={() => removeSection(component.id)}
                          >
                            {renderPreviewSection(component)}
                          </PreviewSectionFrame>
                        </div>
                        {canShowResizeHandle && nextComponent ? (
                          <PreviewRowResizeHandle
                            themeStyles={themeStyles}
                            theme={theme}
                            isActive={resizeHandleIsActive}
                            onPointerDown={(event) =>
                              startSectionResize(row.id, component.id, nextComponent.id, event)
                            }
                          />
                        ) : null}
                      </Fragment>
                    );
                  })}
                </div>
              ))}
            </div>
          </article>
          </div>
        </section>
      </div>
      {isCustomizeOpen ? (
        <button
          type="button"
          aria-label="Close customize panel"
          onClick={() => toggleCustomizePanel(false)}
          className="fixed inset-0 z-[58] bg-slate-950/28 backdrop-blur-[2px]"
        />
      ) : null}
      {!isCustomizeOpen ? (
        <button
          type="button"
          onClick={() => toggleCustomizePanel(true)}
          aria-label="Open customize tool"
          title="Open customize tool"
          className="fixed bottom-5 right-5 z-[90] flex h-20 w-20 items-center justify-center rounded-full border text-[2.5rem] font-semibold shadow-[0_26px_60px_-28px_rgba(15,23,42,0.78)] transition duration-200 hover:-translate-y-1 sm:bottom-6 sm:right-6 sm:h-24 sm:w-24"
          style={customizeLauncherStyle}
        >
          <span aria-hidden="true" className="leading-none">≡</span>
        </button>
      ) : null}
      <aside
        className={`fixed right-0 top-0 z-[89] h-screen w-full max-w-[28rem] transform border-l shadow-[0_28px_80px_-34px_rgba(15,23,42,0.72)] transition duration-300 ease-out sm:max-w-[30rem] ${isCustomizeOpen ? "translate-x-0" : "translate-x-full"}`}
        style={themeStyles.strongSurface}
        aria-hidden={!isCustomizeOpen}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b px-5 py-5" style={{ borderColor: theme.palette.border }}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={themeStyles.mutedText}>
                Customize Tool
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">Adjust the site without leaving the preview.</h2>
              <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
                Theme, palette, density, layout style, and card treatment all update live as you change them.
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleCustomizePanel(false)}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
              style={themeStyles.ghostButton}
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {renderCustomizePanelContent()}
          </div>
        </div>
      </aside>
      <Repo2SiteWalkthroughLauncher
        isOpen={walkthrough.showChoice}
        onStart={() => walkthrough.openWalkthrough("quick", true)}
        onExplore={walkthrough.skipTour}
      />
      <Repo2SiteGuidedTour
        isOpen={walkthrough.isOpen}
        steps={walkthrough.activeSteps}
        currentStep={walkthrough.currentStep}
        currentStepIndex={walkthrough.currentStepIndex}
        anchorRect={walkthrough.anchorRect}
        prefersReducedMotion={walkthrough.prefersReducedMotion}
        onNext={walkthrough.goToNextStep}
        onBack={walkthrough.goToPreviousStep}
        onSkip={walkthrough.skipTour}
        onCloseForNow={walkthrough.closeForNow}
        onFinish={walkthrough.finishTour}
        onJumpToStep={walkthrough.jumpToStep}
      />
    </main>
  );
}
