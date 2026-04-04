import { getCanvasSectionWidthRatio, orderCanvasChildIds } from "@/lib/portfolio";
import type { FinalPortfolio } from "@/lib/portfolio";
import { buildRepo2SitePublicLayoutModel } from "@/lib/repo2site-public-layout";
import { buildRepo2SiteSectionModels } from "@/lib/repo2site-section-models";
import { resolvePortfolioSectionRows } from "@/lib/repo2site-layout";
import { buildRepo2SitePublicTheme } from "@/lib/repo2site-public-theme";
import type { GeneratePreviewResponse, PortfolioOverrides, PreviewTheme } from "@/lib/types";

type ExportFile = {
  path: string;
  content: string;
};

const CRC_TABLE = new Uint32Array(256).map((_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

type ThemePreset = {
  backgroundPattern: string;
  heroOverlay: string;
  navOverlay: string;
  sectionTone: string;
  cardGlow: string;
  projectSurface: string;
  projectInset: string;
};

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
  js: "javascript",
  mongodb: "mongo",
  next: "nextjs",
  "next.js": "nextjs",
  nextjs: "nextjs",
  node: "nodejs",
  "node.js": "nodejs",
  postgres: "postgresql",
  "react.js": "react",
  "tailwind css": "tailwind",
  tailwindcss: "tailwind",
  ts: "typescript",
  typescript: "typescript",
};

const TECH_ICONS: Record<string, { accent: string; shortLabel: string }> = {
  aws: { accent: "#FF9900", shortLabel: "AWS" },
  cplusplus: { accent: "#00599C", shortLabel: "C+" },
  csharp: { accent: "#512BD4", shortLabel: "C#" },
  css3: { accent: "#1572B6", shortLabel: "CSS" },
  docker: { accent: "#2496ED", shortLabel: "DK" },
  express: { accent: "#6B7280", shortLabel: "EX" },
  figma: { accent: "#A259FF", shortLabel: "FG" },
  git: { accent: "#F05032", shortLabel: "GT" },
  github: { accent: "#6E5494", shortLabel: "GH" },
  go: { accent: "#00ADD8", shortLabel: "GO" },
  html5: { accent: "#E34F26", shortLabel: "HTML" },
  java: { accent: "#F89820", shortLabel: "JV" },
  javascript: { accent: "#F7DF1E", shortLabel: "JS" },
  mongo: { accent: "#47A248", shortLabel: "MG" },
  nextjs: { accent: "#111827", shortLabel: "N" },
  nodejs: { accent: "#339933", shortLabel: "ND" },
  postgresql: { accent: "#4169E1", shortLabel: "PG" },
  prisma: { accent: "#2D3748", shortLabel: "PR" },
  python: { accent: "#3776AB", shortLabel: "PY" },
  react: { accent: "#61DAFB", shortLabel: "RE" },
  rust: { accent: "#DEA584", shortLabel: "RS" },
  tailwind: { accent: "#06B6D4", shortLabel: "TW" },
  typescript: { accent: "#3178C6", shortLabel: "TS" },
  vercel: { accent: "#000000", shortLabel: "VC" },
};

function getThemePreset(themeId: string): ThemePreset {
  if (themeId === "systems-green") {
    return {
      backgroundPattern:
        "linear-gradient(140deg, rgba(22, 101, 52, 0.14), transparent 45%), repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(22, 101, 52, 0.05) 28px, rgba(22, 101, 52, 0.05) 29px)",
      heroOverlay:
        "linear-gradient(135deg, rgba(22, 101, 52, 0.22), rgba(34, 197, 94, 0.08))",
      navOverlay: "linear-gradient(135deg, rgba(21, 128, 61, 0.18), rgba(74, 222, 128, 0.08))",
      sectionTone: "linear-gradient(180deg, rgba(240, 253, 244, 0.66), rgba(255, 255, 255, 0.85))",
      cardGlow: "0 20px 48px -34px rgba(21, 128, 61, 0.72)",
      projectSurface: "linear-gradient(160deg, rgba(240, 253, 244, 0.94), rgba(255, 255, 255, 0.98))",
      projectInset: "inset 0 1px 0 rgba(255,255,255,0.75)",
    };
  }

  if (themeId === "editorial-amber") {
    return {
      backgroundPattern:
        "linear-gradient(165deg, rgba(245, 158, 11, 0.2), transparent 45%), radial-gradient(circle at 85% 15%, rgba(194, 65, 12, 0.14), transparent 32%)",
      heroOverlay:
        "linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(194, 65, 12, 0.08))",
      navOverlay: "linear-gradient(135deg, rgba(194, 65, 12, 0.2), rgba(251, 191, 36, 0.1))",
      sectionTone: "linear-gradient(180deg, rgba(255, 247, 237, 0.72), rgba(255, 255, 255, 0.84))",
      cardGlow: "0 20px 48px -34px rgba(194, 65, 12, 0.7)",
      projectSurface: "linear-gradient(160deg, rgba(255, 247, 237, 0.96), rgba(255, 253, 248, 0.98))",
      projectInset: "inset 0 1px 0 rgba(255,255,255,0.8)",
    };
  }

  if (themeId === "signal-violet") {
    return {
      backgroundPattern:
        "radial-gradient(circle at 16% 10%, rgba(139, 92, 246, 0.24), transparent 34%), radial-gradient(circle at 84% 24%, rgba(167, 139, 250, 0.18), transparent 34%)",
      heroOverlay:
        "linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(139, 92, 246, 0.08))",
      navOverlay: "linear-gradient(135deg, rgba(124, 58, 237, 0.18), rgba(196, 181, 253, 0.08))",
      sectionTone: "linear-gradient(180deg, rgba(245, 243, 255, 0.68), rgba(255, 255, 255, 0.86))",
      cardGlow: "0 20px 48px -34px rgba(91, 33, 182, 0.78)",
      projectSurface: "linear-gradient(160deg, rgba(245, 243, 255, 0.95), rgba(255, 255, 255, 0.98))",
      projectInset: "inset 0 1px 0 rgba(255,255,255,0.78)",
    };
  }

  if (themeId === "terminal-lime") {
    return {
      backgroundPattern:
        "radial-gradient(circle at 12% 12%, rgba(34, 197, 94, 0.22), transparent 34%), repeating-linear-gradient(0deg, transparent, transparent 32px, rgba(34, 197, 94, 0.05) 32px, rgba(34, 197, 94, 0.05) 33px)",
      heroOverlay:
        "linear-gradient(135deg, rgba(34, 197, 94, 0.16), rgba(74, 222, 128, 0.06))",
      navOverlay: "linear-gradient(135deg, rgba(21, 128, 61, 0.2), rgba(74, 222, 128, 0.05))",
      sectionTone: "linear-gradient(180deg, rgba(9, 17, 13, 0.84), rgba(14, 25, 19, 0.96))",
      cardGlow: "0 22px 54px -34px rgba(34, 197, 94, 0.52)",
      projectSurface: "linear-gradient(160deg, rgba(11, 20, 14, 0.96), rgba(16, 25, 19, 0.98))",
      projectInset: "inset 0 1px 0 rgba(74, 222, 128, 0.08)",
    };
  }

  if (themeId === "creator-orange") {
    return {
      backgroundPattern:
        "radial-gradient(circle at 84% 14%, rgba(251, 146, 60, 0.2), transparent 34%), radial-gradient(circle at 12% 8%, rgba(249, 115, 22, 0.14), transparent 30%)",
      heroOverlay:
        "linear-gradient(135deg, rgba(251, 146, 60, 0.2), rgba(234, 88, 12, 0.08))",
      navOverlay: "linear-gradient(135deg, rgba(234, 88, 12, 0.18), rgba(253, 186, 116, 0.1))",
      sectionTone: "linear-gradient(180deg, rgba(255, 237, 213, 0.64), rgba(255, 255, 255, 0.86))",
      cardGlow: "0 20px 48px -34px rgba(234, 88, 12, 0.58)",
      projectSurface: "linear-gradient(160deg, rgba(255, 237, 213, 0.9), rgba(255, 251, 245, 0.98))",
      projectInset: "inset 0 1px 0 rgba(255,255,255,0.82)",
    };
  }

  if (themeId === "soft-rose") {
    return {
      backgroundPattern:
        "radial-gradient(circle at 18% 10%, rgba(244, 114, 182, 0.18), transparent 34%), radial-gradient(circle at 86% 20%, rgba(251, 113, 133, 0.12), transparent 30%)",
      heroOverlay:
        "linear-gradient(135deg, rgba(244, 114, 182, 0.16), rgba(251, 113, 133, 0.06))",
      navOverlay: "linear-gradient(135deg, rgba(244, 114, 182, 0.14), rgba(253, 164, 175, 0.08))",
      sectionTone: "linear-gradient(180deg, rgba(255, 241, 246, 0.62), rgba(255, 255, 255, 0.86))",
      cardGlow: "0 20px 48px -34px rgba(219, 39, 119, 0.44)",
      projectSurface: "linear-gradient(160deg, rgba(255, 241, 246, 0.92), rgba(255, 255, 255, 0.98))",
      projectInset: "inset 0 1px 0 rgba(255,255,255,0.82)",
    };
  }

  if (themeId === "midnight-steel") {
    return {
      backgroundPattern:
        "radial-gradient(circle at 86% 14%, rgba(96, 165, 250, 0.16), transparent 32%), linear-gradient(160deg, #070b13, #0b1321)",
      heroOverlay:
        "linear-gradient(135deg, rgba(96, 165, 250, 0.12), rgba(15, 23, 42, 0.08))",
      navOverlay: "linear-gradient(135deg, rgba(96, 165, 250, 0.14), rgba(15, 23, 42, 0.1))",
      sectionTone: "linear-gradient(180deg, rgba(10, 16, 28, 0.82), rgba(16, 24, 39, 0.94))",
      cardGlow: "0 24px 60px -36px rgba(8, 15, 30, 0.88)",
      projectSurface: "linear-gradient(160deg, rgba(10, 16, 28, 0.96), rgba(16, 24, 39, 0.98))",
      projectInset: "inset 0 1px 0 rgba(148, 163, 184, 0.08)",
    };
  }

  if (themeId === "pastel-sky") {
    return {
      backgroundPattern:
        "radial-gradient(circle at 16% 10%, rgba(125, 211, 252, 0.16), transparent 34%), radial-gradient(circle at 86% 18%, rgba(167, 243, 208, 0.14), transparent 34%)",
      heroOverlay:
        "linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(125, 211, 252, 0.06))",
      navOverlay: "linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(191, 219, 254, 0.08))",
      sectionTone: "linear-gradient(180deg, rgba(240, 249, 255, 0.68), rgba(255, 255, 255, 0.88))",
      cardGlow: "0 20px 48px -34px rgba(14, 165, 233, 0.34)",
      projectSurface: "linear-gradient(160deg, rgba(240, 249, 255, 0.94), rgba(255, 255, 255, 0.99))",
      projectInset: "inset 0 1px 0 rgba(255,255,255,0.85)",
    };
  }

  if (themeId === "contrast-ink") {
    return {
      backgroundPattern:
        "linear-gradient(180deg, rgba(24, 24, 27, 0.04), transparent 32%), repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(24, 24, 27, 0.03) 48px, rgba(24, 24, 27, 0.03) 49px)",
      heroOverlay:
        "linear-gradient(135deg, rgba(24, 24, 27, 0.12), rgba(113, 113, 122, 0.04))",
      navOverlay: "linear-gradient(135deg, rgba(24, 24, 27, 0.1), rgba(161, 161, 170, 0.04))",
      sectionTone: "linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(245, 245, 244, 0.96))",
      cardGlow: "0 18px 42px -34px rgba(24, 24, 27, 0.28)",
      projectSurface: "linear-gradient(160deg, rgba(255, 255, 255, 0.98), rgba(250, 250, 249, 0.99))",
      projectInset: "inset 0 1px 0 rgba(255,255,255,0.92)",
    };
  }

  if (themeId === "aurora-gradient") {
    return {
      backgroundPattern:
        "radial-gradient(circle at 14% 12%, rgba(56, 189, 248, 0.18), transparent 34%), radial-gradient(circle at 86% 18%, rgba(124, 58, 237, 0.16), transparent 34%)",
      heroOverlay:
        "linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(124, 58, 237, 0.08))",
      navOverlay: "linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(59, 130, 246, 0.08))",
      sectionTone: "linear-gradient(180deg, rgba(243, 244, 255, 0.74), rgba(255, 255, 255, 0.88))",
      cardGlow: "0 22px 52px -34px rgba(124, 58, 237, 0.38)",
      projectSurface: "linear-gradient(160deg, rgba(243, 244, 255, 0.95), rgba(255, 255, 255, 0.99))",
      projectInset: "inset 0 1px 0 rgba(255,255,255,0.84)",
    };
  }

  return {
    backgroundPattern:
      "radial-gradient(circle at 88% 16%, rgba(59, 130, 246, 0.22), transparent 34%), radial-gradient(circle at 10% 4%, rgba(96, 165, 250, 0.16), transparent 30%)",
    heroOverlay:
      "linear-gradient(135deg, rgba(37, 99, 235, 0.22), rgba(37, 99, 235, 0.08))",
    navOverlay: "linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(96, 165, 250, 0.08))",
    sectionTone: "linear-gradient(180deg, rgba(239, 246, 255, 0.72), rgba(255, 255, 255, 0.86))",
    cardGlow: "0 20px 48px -34px rgba(37, 99, 235, 0.78)",
    projectSurface: "linear-gradient(160deg, rgba(239, 246, 255, 0.95), rgba(255, 255, 255, 0.98))",
    projectInset: "inset 0 1px 0 rgba(255,255,255,0.78)",
  };
}

function asText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function escapeHtml(value: unknown) {
  return asText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slugify(value: unknown) {
  const normalized = asText(value)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");

  return normalized || "portfolio";
}

function normalizeTechKey(value: unknown) {
  const baseKey = asText(value).trim().toLowerCase().replace(/[._/]+/g, " ");
  return TECH_ICON_ALIASES[baseKey] ?? baseKey.replace(/\s+/g, "");
}

function renderTechBadge(value: unknown) {
  const label = asText(value);
  const icon = TECH_ICONS[normalizeTechKey(value)];

  if (!icon) {
    return `<span class="chip">${escapeHtml(label)}</span>`;
  }

  return `<span class="tech-badge chip">
    <span class="tech-mark" style="--tech-accent:${icon.accent}">
      <span>${escapeHtml(icon.shortLabel)}</span>
    </span>
    <span>${escapeHtml(label)}</span>
  </span>`;
}

function renderSourceBadge(source: string | undefined | null) {
  const label =
    source === "readme"
      ? "README"
      : source === "ai"
        ? "AI"
        : source === "user"
          ? "User"
          : "GitHub";

  return `<span class="chip source-chip">${escapeHtml(label)}</span>`;
}

function buildCss(theme: PreviewTheme, portfolio: FinalPortfolio) {
  const preset = getThemePreset(theme.id);
  const isDarkMode = portfolio.appearance.colorMode === "dark";
  const sharedTheme = buildRepo2SitePublicTheme(portfolio);
  const page = sharedTheme.pageBackground;
  const surface = sharedTheme.shellBackground;
  const surfaceStrong = sharedTheme.surfaceBackground;
  const border = sharedTheme.surfaceBorder;
  const text = sharedTheme.surfaceColor;
  const muted = sharedTheme.mutedColor;
  const chip = sharedTheme.chipBackground;
  const heroOverlay = sharedTheme.surfaceBackground;
  const navOverlay = sharedTheme.shellBackground;
  const sectionTone = sharedTheme.surfaceBackground;
  const projectSurface = sharedTheme.surfaceBackground;
  const cardShadow =
    portfolio.appearance.cardStyle === "outlined"
      ? "none"
      : portfolio.appearance.cardStyle === "elevated"
        ? isDarkMode
          ? sharedTheme.shellShadow
          : "0 26px 58px -34px rgba(15,23,42,0.4)"
        : isDarkMode
          ? sharedTheme.shellShadow
          : preset.cardGlow;
  const heroColumns =
    portfolio.appearance.sectionLayout === "stacked" ? "1fr" : "1.15fr 0.85fr";
  const aboutColumns =
    portfolio.appearance.sectionLayout === "stacked" ? "1fr" : "0.9fr 1.1fr";

  return `:root {
  --page: ${page};
  --surface: ${surface};
  --surface-strong: ${surfaceStrong};
  --border: ${border};
  --text: ${text};
  --muted: ${muted};
  --accent: ${theme.palette.accent};
  --accent-soft: ${theme.palette.accentSoft};
  --chip: ${chip};
  --hero-overlay: ${heroOverlay};
  --nav-overlay: ${navOverlay};
  --section-tone: ${sectionTone};
  --project-surface: ${projectSurface};
  --project-shadow: ${isDarkMode ? cardShadow : `${preset.projectInset}, ${cardShadow}`};
  --page-pattern: none;
  --chip-border: ${sharedTheme.chipBorder};
  --chip-color: ${sharedTheme.chipColor};
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  padding: 1rem 0.75rem;
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  color: var(--text);
  background: var(--page);
}
a { color: inherit; text-decoration: none; }
img { display: block; max-width: 100%; }
.shell {
  width: min(72rem, calc(100vw - 1.5rem));
  margin: 0 auto;
  border: 1px solid var(--border);
  border-radius: 2rem;
  overflow: hidden;
  background: var(--surface);
  box-shadow: ${sharedTheme.shellShadow};
}
.topbar, .footer {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
  background: var(--nav-overlay), var(--surface-strong);
}
.footer {
  border-bottom: 0;
  border-top: 1px solid var(--border);
  background: var(--surface);
  color: var(--muted);
  font-size: 0.95rem;
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.24em;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--muted);
}
.topbar nav {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  color: var(--muted);
  font-size: 0.95rem;
}
.hero {
  display: grid;
  gap: 2rem;
  padding: 2.5rem 1.5rem;
  border-bottom: 1px solid var(--border);
  background: var(--hero-overlay), var(--surface-strong);
}
.hero-grid {
  display: grid;
  gap: 2rem;
  grid-template-columns: ${heroColumns};
}
.hero-preview-left,
.hero-preview-right {
  display: grid;
  gap: 1rem;
  align-content: start;
}
.hero-profile {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.avatar {
  width: 6rem;
  height: 6rem;
  border-radius: 1.5rem;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--surface-strong);
}
.avatar-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
  font-size: 1.6rem;
}
.hero h1 {
  margin: 0.5rem 0 0;
  font-size: clamp(2.2rem, 6vw, 4rem);
  line-height: 0.95;
}
.username, .lede, .summary, .muted { color: var(--muted); }
.headline {
  margin: 1.25rem 0 0;
  font-size: clamp(2rem, 5vw, 3.5rem);
  line-height: 1.08;
}
.hero-name {
  margin: 0;
  font-size: clamp(2.2rem, 5.5vw, 4rem);
  line-height: 0.95;
}
.lede { margin: 1rem 0 0; max-width: 42rem; line-height: 1.9; }
.actions, .chips, .stats, .link-grid, .stack-list, .project-meta {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.9rem 1.25rem;
  border-radius: 0.9rem;
  border: 1px solid var(--border);
  font-weight: 700;
}
.button.primary {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 18px 30px -20px var(--accent);
}
.button.secondary { background: var(--surface-strong); }
.stats {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}
.stat {
  min-width: 8rem;
}
.stat strong {
  display: block;
  margin-top: 0.35rem;
  font-size: 2rem;
  color: var(--text);
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem 0.85rem;
  border-radius: 999px;
  border: 1px solid var(--chip-border);
  background: var(--chip);
  color: var(--chip-color);
  font-size: 0.95rem;
}
.tech-badge { line-height: 1; }
.tech-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--tech-accent) 18%, transparent);
  color: #fff;
  position: relative;
  overflow: hidden;
}
.tech-mark::before {
  content: "";
  position: absolute;
  inset: 0.2rem;
  border-radius: 999px;
  background: var(--tech-accent);
}
.tech-mark span {
  position: relative;
  z-index: 1;
  font-size: 0.52rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.content {
  padding: 1.5rem;
  display: grid;
  gap: 1.5rem;
}
.layout-row {
  display: grid;
  gap: 1.5rem;
}
.layout-row.flexible {
  display: flex;
  align-items: flex-start;
}
.layout-cell {
  width: 100%;
}
.layout-row.flexible .layout-cell {
  flex: 0 0 var(--section-width, 100%);
  max-width: var(--section-width, 100%);
}
.two-col {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: ${aboutColumns};
}
.builder-surface {
  border: 1px solid var(--border);
  border-radius: 1.8rem;
  padding: 1.5rem;
  background: var(--section-tone);
}
.builder-surface-strong {
  border: 1px solid var(--border);
  border-radius: 1.2rem;
  padding: 1rem 1.1rem;
  background: var(--surface-strong);
}
.hero-highlight-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.hero-highlight-card p {
  margin: 0;
}
.hero-stack-tools {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
}
.card, .panel, .project-featured, .project-card {
  border: 1px solid var(--border);
  border-radius: 1.8rem;
  padding: 1.5rem;
  background: var(--section-tone);
}
.custom-block-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 1rem;
}
.custom-block {
  border: 1px solid var(--border);
  border-radius: 1.2rem;
  padding: 1rem;
  background: var(--surface-strong);
}
.custom-block-full {
  grid-column: 1 / -1;
}
.custom-block-image {
  width: 100%;
  max-height: 24rem;
  object-fit: cover;
  border-radius: 1rem;
  border: 1px solid var(--border);
  margin-top: 0.75rem;
}
.panel { background: var(--surface-strong); }
.panel h2, .card h2, .project-featured h3, .project-card h3 {
  margin: 0.75rem 0 0;
}
.mini-grid, .detail-grid, .project-grid, .project-grid-three, .contact-grid {
  display: grid;
  gap: 1.5rem;
}
.detail-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.contact-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.project-section-header {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 1.25rem;
}
.project-layout {
  display: grid;
  gap: 1.25rem;
  margin-top: 1.5rem;
}
.project-layout.hybrid {
  gap: 1.25rem;
}
.project-featured {
  background: var(--project-surface);
  box-shadow: var(--project-shadow);
  height: 100%;
  display: flex;
  flex-direction: column;
}
.project-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
}
.project-grid-three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: stretch;
}
.project-card {
  background: var(--surface-strong);
  box-shadow: 0 20px 48px -34px rgba(15,23,42,0.3);
  display: flex;
  flex-direction: column;
  height: 100%;
}
.project-card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}
.project-card-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: -0.03em;
}
.project-card-title.compact {
  font-size: 1.45rem;
  line-height: 1.2;
}
.project-accent-bar {
  margin: 1.25rem 0 1rem;
  width: 3.5rem;
  height: 0.25rem;
  border-radius: 999px;
  background: var(--accent);
}
.project-image {
  overflow: hidden;
  border-radius: 1.4rem;
  border: 1px solid var(--border);
  margin-bottom: 1rem;
  background: var(--surface-strong);
}
.project-image img { width: 100%; height: 100%; object-fit: cover; }
.project-image.tall { height: 18rem; }
.project-image.compact { height: 8rem; }
.project-featured .project-image.tall { height: 20rem; }
.project-card .summary {
  flex: 1;
}
.project-featured .summary {
  flex: 1;
}
.project-actions {
  margin-top: 1.25rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.85rem;
}
.project-featured .project-actions {
  margin-top: auto;
  padding-top: 1.25rem;
}
.kicker {
  display: inline-flex;
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  border: 1px solid var(--border);
  background: var(--chip);
  color: var(--accent);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.inline-note {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 1.2rem;
  border: 1px solid var(--border);
  background: var(--surface);
}
.link-item {
  display: block;
  border: 1px solid var(--border);
  border-radius: 1.2rem;
  padding: 1rem;
  background: var(--surface);
}
.cta-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
}
.stack-list { margin-top: 1rem; }
.empty {
  border: 1px dashed var(--border);
  border-radius: 1.5rem;
  padding: 1.25rem;
  color: var(--muted);
}
@media (max-width: 980px) {
  .hero-grid, .two-col, .contact-grid { grid-template-columns: 1fr; }
  .hero-highlight-grid { grid-template-columns: 1fr; }
  .layout-row.flexible { display: grid; }
  .layout-row.flexible .layout-cell { flex: none; max-width: 100%; }
  .project-layout.hybrid { grid-template-columns: 1fr; }
}
@media (min-width: 1280px) {
  .project-layout.hybrid {
    grid-template-columns: minmax(18rem, 0.84fr) minmax(24rem, 1.16fr);
    align-items: stretch;
  }
}
@media (max-width: 720px) {
  body { padding: 0.5rem; }
  .shell { width: calc(100vw - 1rem); margin: 0 auto; border-radius: 1.4rem; }
  .topbar, .footer, .hero, .content { padding: 1rem; }
  .detail-grid, .project-grid, .project-grid-three, .custom-block-grid { grid-template-columns: 1fr; }
}`;
}

function renderImage(url: string, alt: string, compact = false) {
  return `<div class="project-image ${compact ? "compact" : "tall"}"><img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}"></div>`;
}
function hasText(value?: unknown) {
  return Boolean(asText(value).trim());
}

function buildHtml(portfolio: FinalPortfolio) {
  const layoutModel = buildRepo2SitePublicLayoutModel(portfolio);
  const {
    visibleSections,
    sectionRows,
    hiddenSections,
    hiddenChildIds,
    orderedHeroLeftIds,
    orderedAboutIds,
    showAbout,
    showProfileDetails,
    showContact,
    showLinks,
    showProjects,
    showHero,
    showProfessional,
  } = layoutModel;
  const sectionModels = buildRepo2SiteSectionModels(portfolio, layoutModel);
  const { hero, about, professional, projects, links, contact } = sectionModels;
  const displayName = portfolio.hero.name || portfolio.profile?.username || "Portfolio";
  const pageTitle = `${displayName} | Portfolio`;
  const description = portfolio.hero.subheadline.value || portfolio.about.description.value;
  const avatarMarkup = portfolio.hero.imageUrl
    ? `<img src="${escapeHtml(portfolio.hero.imageUrl)}" alt="${escapeHtml(displayName)}">`
    : `<div class="avatar-fallback">GH</div>`;
  const profileLinkLabel = portfolio.profile?.username
    ? `@${escapeHtml(portfolio.profile.username)}`
    : "@username";

  const hybridProjectGridClass =
    portfolio.appearance.projectsOverflowSize === "expanded"
      ? "project-grid"
      : "project-grid";

  const renderExportProjectCard = (
    repository: (typeof projects.secondaryProjects)[number] | NonNullable<typeof projects.featuredProject>,
    options?: { featured?: boolean; compact?: boolean },
  ) => {
    const featured = options?.featured ?? false;
    const compact = options?.compact ?? false;

    return `<article class="${featured ? "project-featured" : "project-card"}">
      ${
        repository.resolvedImage
          ? renderImage(repository.resolvedImage.url, repository.resolvedImage.alt, compact)
          : ""
      }
      <div class="project-accent-bar"></div>
      <div class="project-card-header">
        <div>
          ${
            featured
              ? `<div class="chips"><span class="chip">Featured</span>${renderSourceBadge(repository.descriptionSource)}</div>`
              : renderSourceBadge(repository.descriptionSource)
          }
          <h3 class="project-card-title ${compact ? "compact" : ""}">${escapeHtml(repository.name)}</h3>
        </div>
      </div>
      <p class="summary">${escapeHtml(repository.description)}</p>
      <div class="project-actions">
        ${hasText(repository.language) ? renderTechBadge(repository.language) : ""}
        <a href="${escapeHtml(repository.href)}" target="_blank" rel="noreferrer" class="eyebrow" style="color:var(--accent)">Open Project</a>
      </div>
    </article>`;
  };

  const sectionMarkup = {
    hero: showHero
      ? `<section class="hero" id="hero">
          <div class="hero-grid">
            <div class="hero-preview-left">
              ${
                orderedHeroLeftIds.includes("hero:image")
                  ? `<div class="avatar">${avatarMarkup}</div>`
                  : ""
              }
              <div>
                <div class="eyebrow">Personal Portfolio</div>
                <h1 class="hero-name">${escapeHtml(displayName)}</h1>
                <div class="username">${escapeHtml(profileLinkLabel)}</div>
              </div>
              <div>${renderSourceBadge(hero.headline.source)}</div>
              <div class="headline">${escapeHtml(hero.headline.value)}</div>
              ${
                hasText(hero.intro.value)
                  ? `<div>${renderSourceBadge(hero.intro.source)}</div>
                    <p class="lede">${escapeHtml(hero.intro.value)}</p>`
                  : ""
              }
              <div class="actions">
                ${hero.actions.length > 0
                  ? hero.actions
                      .map(
                        (action, index) =>
                          `<a class="button ${index === 0 ? "primary" : "secondary"}" href="${escapeHtml(action.href)}" target="_blank" rel="noreferrer">${escapeHtml(action.label)}</a>`,
                      )
                      .join("")
                  : `<a class="button primary" href="${escapeHtml(portfolio.hero.profileLink)}" target="_blank" rel="noreferrer">${escapeHtml(portfolio.hero.ctaLabel)}</a>`}
                <a class="button secondary" href="#projects">Explore Featured Projects</a>
              </div>
            </div>
            <div class="hero-preview-right">
              ${
                hasText(hero.summary)
                  ? `<div class="builder-surface">
                      <div class="eyebrow">Professional Snapshot</div>
                      <p class="summary">${escapeHtml(hero.summary)}</p>
                    </div>`
                  : ""
              }
              ${
                hero.highlightItems.length > 0
                  ? `<div class="hero-highlight-grid">
                      ${hero.highlightItems
                        .map(
                          (item) => `<div class="builder-surface-strong hero-highlight-card">
                            <p class="eyebrow">${escapeHtml(item.label)}</p>
                            <p style="margin-top:0.5rem;font-weight:600;">${escapeHtml(item.value)}</p>
                          </div>`,
                        )
                        .join("")}
                    </div>`
                  : ""
              }
              ${
                !hiddenChildIds.has("hero:stack") && hero.stackItems.length > 0
                  ? `<div class="builder-surface">
                      <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;">
                        <div class="eyebrow">Stack</div>
                        <span class="chip">${hero.stackItems.length} tools</span>
                      </div>
                      <div class="hero-stack-tools">
                        ${hero.stackItems.map((item) => renderTechBadge(item)).join("")}
                      </div>
                    </div>`
                  : ""
              }
            </div>
          </div>
        </section>`
      : "",
    about:
      showAbout || showProfileDetails
        ? `<section id="about" class="two-col">
            ${
              showAbout
                ? `<article class="card">
                    <div class="eyebrow">About</div>
                    ${orderedAboutIds
                      .map((componentId) => {
                        if (componentId === "about:description") {
                          return hasText(about.description)
                            ? `<h2>${escapeHtml(about.heading)}</h2><p class="summary">${escapeHtml(about.description)}</p>`
                            : "";
                        }

                        return "";
                      })
                      .join("")}
                  </article>`
                : ""
            }
            ${
              showProfileDetails
                ? `<div class="mini-grid">
                    <article class="card">
                      <div class="eyebrow">Profile Details</div>
                      <div class="detail-grid">
                        ${
                          about.profileDetails.find((item) => item.label === "Company")
                            ? `<div>
                                <div class="eyebrow">Company</div>
                                <p>${escapeHtml(about.profileDetails.find((item) => item.label === "Company")?.value || "")}</p>
                              </div>`
                            : ""
                        }
                        ${
                          about.profileDetails.find((item) => item.label === "Location")
                            ? `<div>
                                <div class="eyebrow">Location</div>
                                <p>${escapeHtml(about.profileDetails.find((item) => item.label === "Location")?.value || "")}</p>
                              </div>`
                            : ""
                        }
                      </div>
                    </article>
                  </div>`
                : ""
            }
          </section>`
        : "",
    professional:
      showProfessional
        ? `<section id="professional" class="card">
            <div class="eyebrow">${escapeHtml(professional.eyebrow)}</div>
            <h2>${escapeHtml(professional.heading)}</h2>
            ${
              hasText(professional.summary)
                ? `<p class="summary">${escapeHtml(professional.summary)}</p>`
                : ""
            }
            <div class="chips">${professional.chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join("")}</div>
          </section>`
        : "",
    projects:
      showProjects
        ? `<section id="projects">
            <div class="project-section-header">
              <div>
                <div class="eyebrow">Featured Projects</div>
                <h2>${escapeHtml(projects.heading)}</h2>
                <p class="muted" style="margin:0.5rem 0 0;max-width:42rem;">${escapeHtml(projects.description)}</p>
              </div>
              ${
                projects.featuredProject && hasText(projects.featuredProject.language)
                  ? renderTechBadge(projects.featuredProject.language)
                  : ""
              }
            </div>

            ${
              projects.featuredProject
                ? projects.layoutMode === "hybrid" && projects.secondaryProjects.length > 0
                  ? `<div class="project-layout hybrid">
                      ${renderExportProjectCard(projects.featuredProject, { featured: true })}
                      <div class="${hybridProjectGridClass}">
                        ${projects.secondaryProjects.map((repository) => renderExportProjectCard(repository, { compact: true })).join("")}
                      </div>
                    </div>`
                  : projects.layoutMode === "side-by-side" && projects.secondaryProjects.length > 0
                    ? `<div class="project-layout">
                        ${renderExportProjectCard(projects.featuredProject, { featured: true })}
                      </div>
                      <div class="project-grid">
                        ${projects.secondaryProjects.map((repository) => renderExportProjectCard(repository, { compact: true })).join("")}
                      </div>`
                    : projects.layoutMode === "stacked" && projects.secondaryProjects.length > 0
                      ? `<div class="project-layout">
                          ${renderExportProjectCard(projects.featuredProject, { featured: true })}
                          ${projects.secondaryProjects.map((repository) => renderExportProjectCard(repository)).join("")}
                        </div>`
                      : `<div class="project-layout">
                          ${renderExportProjectCard(projects.featuredProject, { featured: true })}
                        </div>`
                : ""
            }
          </section>`
        : "",
    links:
      showLinks
        ? `<section id="links" class="card">
            <div class="eyebrow">Links</div>
            <h2>${escapeHtml(links.eyebrow)}</h2>
            ${
              hasText(links.description)
                ? `<p class="summary">${escapeHtml(links.description)}</p>`
                : ""
            }
            <div class="link-grid">
              ${links.items
                .map(
                  (entry) => `<a class="link-item" href="${escapeHtml(entry.href)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(entry.label)}</strong><div class="muted">${escapeHtml(entry.href)}</div></a>`,
                )
                .join("")}
            </div>
          </section>`
        : "",
    contact:
      showContact
        ? `<section class="card" id="contact">
            <div class="eyebrow">Contact</div>
            <h2>${escapeHtml(contact.eyebrow)}</h2>
            ${
              hasText(contact.description)
                ? `<p class="summary">${escapeHtml(contact.description)}</p>`
                : ""
            }
            ${
              hasText(contact.customNote)
                ? `<div class="inline-note"><p>${escapeHtml(contact.customNote)}</p></div>`
                : ""
            }
            ${contact.methods
              .map(
                (item) => `<a class="link-item" href="${escapeHtml(item.href)}"><strong>${escapeHtml(item.label)}</strong><div class="muted">${escapeHtml(item.value)}</div></a>`,
              )
              .join("")}
            ${
              contact.actions.length > 0
                ? `<div class="cta-grid">
                    ${contact.actions
                      .map(
                        (action) =>
                          `<a class="button secondary" href="${escapeHtml(action.href)}" target="_blank" rel="noreferrer">${escapeHtml(action.label)}</a>`,
                      )
                      .join("")}
                  </div>`
                : ""
            }
          </section>`
        : "",
  } as const;
  const customSectionMarkup = Object.fromEntries(
    portfolio.customSections.map((section) => [
      section.id,
      `<section class="card"><div class="eyebrow">Custom Section</div><h2>${escapeHtml(section.title.value || "Custom Section")}</h2>${
        hasText(section.description.value) ? `<p class="summary">${escapeHtml(section.description.value)}</p>` : ""
      }${
        (section.blocks ?? []).length > 0
          ? `<div class="custom-block-grid">${(section.blocks ?? [])
              .map(
                (block) =>
                  `<div class="custom-block ${block.width === "full" ? "custom-block-full" : ""}">
                    <div class="eyebrow">${escapeHtml(block.label || (block.type === "image" ? "Image" : "Text"))}</div>
                    ${hasText(block.title) ? `<h3>${escapeHtml(block.title)}</h3>` : ""}
                    ${
                      block.type === "image" && hasText(block.imageUrl)
                        ? `<img class="custom-block-image" src="${escapeHtml(block.imageUrl)}" alt="${escapeHtml(block.title || block.label || "Custom section image")}">`
                        : ""
                    }
                    ${
                      hasText(block.text)
                        ? `<p class="summary">${escapeHtml(block.text)}</p>`
                        : ""
                    }
                  </div>`,
              )
              .join("")}</div>`
          : ""
      }</section>`,
    ]),
  );
  const orderedContentMarkup = sectionRows
    .map((row) => {
      const isFlexibleRow = row.isFlexible && row.items.length > 1;

      const rowMarkup = row.items
        .map((component) => {
          const markup =
            component.type === "custom"
              ? customSectionMarkup[component.id] || ""
              : sectionMarkup[component.type as keyof typeof sectionMarkup] || "";

          if (!markup) {
            return "";
          }

          const widthRatio =
            portfolio.appearance.sectionLayout === "stacked"
              ? 1
              : getCanvasSectionWidthRatio(component);

          return `<div class="layout-cell" style="--section-width:${Math.round(widthRatio * 100)}%">${markup}</div>`;
        })
        .filter(Boolean)
        .join("");

      return rowMarkup
        ? `<div class="layout-row ${isFlexibleRow ? "flexible" : ""}">${rowMarkup}</div>`
        : "";
    })
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="stylesheet" href="./style.css">
  </head>
  <body>
    <main class="shell">
      <header class="topbar">
        <div>
          <div class="eyebrow">Portfolio</div>
          <div>${escapeHtml(profileLinkLabel)}</div>
        </div>
        <nav>
          ${showHero ? `<a href="#hero">Hero</a>` : ""}
          ${showAbout ? `<a href="#about">About</a>` : ""}
          ${showProjects ? `<a href="#projects">Projects</a>` : ""}
          ${showContact || showLinks ? `<a href="#contact">Contact</a>` : ""}
        </nav>
      </header>

      <div class="content">
        ${orderedContentMarkup}
      </div>
      ${contact.actions.length > 0
        ? `<footer class="footer">
            <div>
              <div class="eyebrow">Next Step</div>
              <div>Open the documents and profiles that support this portfolio.</div>
            </div>
            <div class="cta-grid">
              ${contact.actions
                .map(
                  (action) =>
                    `<a class="button secondary" href="${escapeHtml(action.href)}" target="_blank" rel="noreferrer">${escapeHtml(action.label)}</a>`,
                )
                .join("")}
            </div>
          </footer>`
        : ""}
    </main>
  </body>
</html>`;
}

function buildReadme(portfolio: FinalPortfolio, preview: GeneratePreviewResponse) {
  const repoSlug = slugify(portfolio.profile?.username || portfolio.hero.name);

  return `# ${portfolio.hero.name || preview.profile.username} Static Portfolio

This bundle was exported from Repo2Site as a standalone static website.

## Included files

- \`index.html\`
- \`style.css\`
- \`.nojekyll\`
- \`README.md\`

## Publish with GitHub Pages

1. Create a new GitHub repository, such as \`${repoSlug}-portfolio\`.
2. Upload the contents of this bundle to the repository root.
3. Commit and push to your default branch, or to a dedicated \`gh-pages\` branch.
4. In GitHub, open Settings > Pages.
5. Under "Build and deployment", choose:
   - Source: "Deploy from a branch"
   - Branch: your publishing branch
   - Folder: \`/ (root)\`
6. Save the settings and wait for GitHub Pages to publish the site.

## Notes

- \`.nojekyll\` is included so GitHub Pages serves the files directly.
- The site is fully static and makes no runtime API calls.
- Remote images still load from their original public URLs.

## Deploy with Vercel

1. Unzip the bundle on your computer.
2. In the Vercel dashboard, create a new project and choose "Upload".
3. Upload the extracted folder contents.
4. Vercel will detect it as a static site and deploy it automatically.

You can also drag the extracted folder into a new Vercel project from the dashboard.
`;
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createStoredZip(files: ExportFile[]) {
  const localRecords: Buffer[] = [];
  const centralRecords: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuffer = Buffer.from(file.path, "utf8");
    const dataBuffer = Buffer.from(file.content, "utf8");
    const fileCrc = crc32(dataBuffer);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(fileCrc, 14);
    localHeader.writeUInt32LE(dataBuffer.length, 18);
    localHeader.writeUInt32LE(dataBuffer.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localRecords.push(localHeader, nameBuffer, dataBuffer);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(fileCrc, 16);
    centralHeader.writeUInt32LE(dataBuffer.length, 20);
    centralHeader.writeUInt32LE(dataBuffer.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralRecords.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + dataBuffer.length;
  }

  const centralDirectory = Buffer.concat(centralRecords);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(files.length, 8);
  endRecord.writeUInt16LE(files.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localRecords, centralDirectory, endRecord]);
}

export function buildStaticPortfolioBundle(params: {
  portfolio: FinalPortfolio;
  preview: GeneratePreviewResponse;
  overrides: PortfolioOverrides;
}) {
  const files: ExportFile[] = [
    {
      path: "index.html",
      content: buildHtml(params.portfolio),
    },
    {
      path: "style.css",
      content: buildCss(params.portfolio.theme, params.portfolio),
    },
    {
      path: ".nojekyll",
      content: "",
    },
    {
      path: "README.md",
      content: buildReadme(params.portfolio, params.preview),
    },
  ];

  const filename = `${slugify(params.portfolio.profile?.username || params.portfolio.hero.name)}-portfolio-export.zip`;

  return {
    filename,
    files,
    zipBuffer: createStoredZip(files),
  };
}
