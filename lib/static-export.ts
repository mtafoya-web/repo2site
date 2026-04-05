import { getCanvasSectionWidthRatio, orderCanvasChildIds } from "@/lib/portfolio";
import type { FinalPortfolio } from "@/lib/portfolio";
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slugify(value: string) {
  const normalized = value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");

  return normalized || "portfolio";
}

function normalizeTechKey(value: string) {
  const baseKey = value.trim().toLowerCase().replace(/[._/]+/g, " ");
  return TECH_ICON_ALIASES[baseKey] ?? baseKey.replace(/\s+/g, "");
}

function renderTechBadge(value: string) {
  const icon = TECH_ICONS[normalizeTechKey(value)];

  if (!icon) {
    return `<span class="chip">${escapeHtml(value)}</span>`;
  }

  return `<span class="tech-badge chip">
    <span class="tech-mark" style="--tech-accent:${icon.accent}">
      <span>${escapeHtml(icon.shortLabel)}</span>
    </span>
    <span>${escapeHtml(value)}</span>
  </span>`;
}

function buildCss(theme: PreviewTheme, portfolio: FinalPortfolio) {
  const preset = getThemePreset(theme.id);
  const isDarkMode = portfolio.appearance.colorMode === "dark";
  const page = isDarkMode ? "#09111f" : theme.palette.page;
  const surface = isDarkMode ? "rgba(13, 21, 35, 0.9)" : theme.palette.surface;
  const surfaceStrong = isDarkMode ? "#0f1729" : theme.palette.surfaceStrong;
  const border = isDarkMode ? "rgba(148, 163, 184, 0.2)" : theme.palette.border;
  const text = isDarkMode ? "#e5eefb" : theme.palette.text;
  const muted = isDarkMode ? "#93a4bf" : theme.palette.muted;
  const chip = isDarkMode ? theme.palette.accentSoft : theme.palette.chip;
  const cardShadow =
    portfolio.appearance.cardStyle === "outlined"
      ? "none"
      : portfolio.appearance.cardStyle === "elevated"
        ? isDarkMode
          ? "0 24px 56px -30px rgba(2, 6, 23, 0.72)"
          : "0 26px 58px -34px rgba(15,23,42,0.4)"
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
  --hero-overlay: ${preset.heroOverlay};
  --nav-overlay: ${preset.navOverlay};
  --section-tone: ${preset.sectionTone};
  --project-surface: ${preset.projectSurface};
  --project-shadow: ${preset.projectInset}, ${cardShadow};
  --page-pattern: ${preset.backgroundPattern};
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  color: var(--text);
  background: var(--page-pattern), var(--page);
}
a { color: inherit; text-decoration: none; }
img { display: block; max-width: 100%; }
.shell {
  width: min(112rem, calc(100vw - 2rem));
  margin: 1rem auto;
  border: 1px solid var(--border);
  border-radius: 2rem;
  overflow: hidden;
  background: var(--surface);
  box-shadow: 0 28px 70px -40px rgba(15,23,42,0.38);
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
  border: 1px solid var(--border);
  background: var(--chip);
  color: ${isDarkMode ? "#f8fbff" : theme.palette.accent};
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
.card, .panel, .project-featured, .project-card {
  border: 1px solid var(--border);
  border-radius: 1.8rem;
  padding: 1.5rem;
  background: var(--section-tone);
}
.panel { background: var(--surface-strong); }
.panel h2, .card h2, .project-featured h3, .project-card h3 {
  margin: 0.75rem 0 0;
}
.mini-grid, .detail-grid, .project-grid, .contact-grid {
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
  grid-template-columns: 1.05fr 0.95fr;
  margin-top: 1.5rem;
}
.project-featured {
  background: var(--project-surface);
  box-shadow: var(--project-shadow);
}
.project-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.project-card {
  background: var(--surface-strong);
  box-shadow: 0 20px 48px -34px rgba(15,23,42,0.3);
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
  .hero-grid, .two-col, .project-layout, .contact-grid { grid-template-columns: 1fr; }
  .layout-row.flexible { display: grid; }
  .layout-row.flexible .layout-cell { flex: none; max-width: 100%; }
}
@media (max-width: 720px) {
  .shell { width: calc(100vw - 1rem); margin: 0.5rem auto; border-radius: 1.4rem; }
  .topbar, .footer, .hero, .content { padding: 1rem; }
  .detail-grid, .project-grid { grid-template-columns: 1fr; }
}`;
}

function renderImage(url: string, alt: string, compact = false) {
  return `<div class="project-image ${compact ? "compact" : "tall"}"><img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}"></div>`;
}
function hasText(value?: string | null) {
  return Boolean(value && value.trim());
}

function buildHtml(portfolio: FinalPortfolio) {
  const visibleSections = portfolio.layout.components.filter((component) => component.visible);
  const sectionRows = visibleSections.reduce<Array<{ id: string; items: typeof visibleSections }>>(
    (rows, component) => {
      const rowId =
        portfolio.appearance.sectionLayout === "stacked" || component.type === "projects" || component.type === "hero"
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
  const hiddenSections = new Set(
    portfolio.layout.components
      .filter((component) => !component.visible && component.type !== "custom")
      .map((component) => component.type),
  );
  const featuredProject = portfolio.repositories[0];
  const secondaryProjects = portfolio.repositories.slice(1, 5);
  const displayName = portfolio.hero.name || portfolio.profile?.username || "Portfolio";
  const pageTitle = `${displayName} | Portfolio`;
  const description = portfolio.hero.subheadline.value || portfolio.about.description.value;
  const avatarMarkup = portfolio.hero.imageUrl
    ? `<img src="${escapeHtml(portfolio.hero.imageUrl)}" alt="${escapeHtml(displayName)}">`
    : `<div class="avatar-fallback">GH</div>`;
  const profileLinkLabel = portfolio.profile?.username
    ? `@${escapeHtml(portfolio.profile.username)}`
    : "@username";

  const profileMeta = [
    portfolio.professional.company || portfolio.profile?.company,
    portfolio.professional.location || portfolio.profile?.location,
  ].filter(
    (item): item is string => hasText(item),
  );
  const heroActions = portfolio.professional.actions
    .filter((action) => ["resume", "coverLetter", "linkedIn", "handshake", "portfolio", "github"].includes(action.id))
    .slice(0, 4);
  const contactActions = portfolio.professional.actions.filter((action) =>
    ["resume", "coverLetter", "linkedIn", "handshake", "portfolio"].includes(action.id),
  );
  const hiddenChildIds = new Set(portfolio.layout.hiddenComponentIds);

  const validLinks = portfolio.linksSection.links.filter(
    (link) => hasText(link.label) && hasText(link.href),
  );
  const orderedLinks = orderCanvasChildIds(
    validLinks.map((link, index) => `link-card:${slugify(`${link.label}-${index}`)}`),
    portfolio.layout.componentOrder["links:cards"],
  )
    .filter((id) => !hiddenChildIds.has(id))
    .map((id) => validLinks.find((link, index) => `link-card:${slugify(`${link.label}-${index}`)}` === id))
    .filter(Boolean) as typeof validLinks;
  const contactMethods = [
    hasText(portfolio.contact.email) && hasText(portfolio.contact.emailHref)
      ? { id: "contact-method:email", label: "Email", value: portfolio.contact.email, href: portfolio.contact.emailHref }
      : null,
    hasText(portfolio.contact.phone) && hasText(portfolio.contact.phoneHref)
      ? { id: "contact-method:phone", label: "Phone", value: portfolio.contact.phone, href: portfolio.contact.phoneHref }
      : null,
  ].filter(Boolean) as Array<{ id: string; label: string; value: string; href: string }>;
  const orderedContactMethods = orderCanvasChildIds(
    contactMethods.map((item) => item.id),
    portfolio.layout.componentOrder["contact:methods"],
  )
    .filter((id) => !hiddenChildIds.has(id))
    .map((id) => contactMethods.find((item) => item.id === id))
    .filter(Boolean) as typeof contactMethods;
  const orderedContactActions = orderCanvasChildIds(
    contactActions.map((action) => `contact-action:${action.id}`),
    portfolio.layout.componentOrder["contact:actions"],
  )
    .filter((id) => !hiddenChildIds.has(id))
    .map((id) => contactActions.find((action) => `contact-action:${action.id}` === id))
    .filter(Boolean) as typeof contactActions;
  const orderedSecondaryProjects = orderCanvasChildIds(
    secondaryProjects.map((repository) => `project-card:${slugify(repository.name)}`),
    portfolio.layout.componentOrder["projects:grid"],
  )
    .filter((id) => !hiddenChildIds.has(id))
    .map((id) =>
      secondaryProjects.find((repository) => `project-card:${slugify(repository.name)}` === id),
    )
    .filter(Boolean) as typeof secondaryProjects;
  const orderedHeroStack = orderCanvasChildIds(
    portfolio.techStack.slice(0, 8).map((tech) => `hero-stack:${slugify(tech)}`),
    portfolio.layout.componentOrder["hero:stack:items"],
  )
    .filter((id) => !hiddenChildIds.has(id))
    .map((id) =>
      portfolio.techStack.slice(0, 8).find((tech) => `hero-stack:${slugify(tech)}` === id),
    )
    .filter(Boolean) as string[];
  const orderedHeroLeftIds = orderCanvasChildIds(
    ["hero:image", "hero:name", "hero:title", "hero:intro", "hero:actions"],
    portfolio.layout.componentOrder["hero:left"],
  ).filter((id) => !hiddenChildIds.has(id));
  const orderedAboutIds = orderCanvasChildIds(
    ["about:description"],
    portfolio.layout.componentOrder.about,
  ).filter((id) => !hiddenChildIds.has(id));

  const showAbout =
    !hiddenSections.has("about") &&
    (hasText(portfolio.about.title.value) || hasText(portfolio.about.description.value));
  const showProfileDetails = profileMeta.length > 0;
  const showContact =
    !hiddenSections.has("contact") &&
    (
      hasText(portfolio.contact.title.value) ||
      hasText(portfolio.contact.description.value) ||
      hasText(portfolio.contact.customText) ||
      hasText(portfolio.contact.email) ||
      contactActions.length > 0
    );
  const showLinks = !hiddenSections.has("links") && orderedLinks.length > 0;
  const showProjects = !hiddenSections.has("projects") && portfolio.repositories.length > 0;
  const showHero = !hiddenSections.has("hero");
  const showProfessional =
    !hiddenSections.has("professional") &&
    (
      hasText(portfolio.professional.title) ||
      hasText(portfolio.professional.summary) ||
      hasText(portfolio.professional.company) ||
      hasText(portfolio.professional.location) ||
      hasText(portfolio.professional.availability)
    );

  const sectionMarkup = {
    hero: showHero
      ? `<section class="hero" id="hero">
          <div class="hero-grid">
            <div>
              ${orderedHeroLeftIds
                .map((componentId) => {
                  if (componentId === "hero:name") {
                    return `<div class="hero-profile">
                      <div>
                        <div class="eyebrow">Personal Portfolio</div>
                        <h1>${escapeHtml(displayName)}</h1>
                        <div class="username">${escapeHtml(profileLinkLabel)}</div>
                      </div>
                    </div>`;
                  }

                  if (componentId === "hero:title") {
                    return `<div class="headline">${escapeHtml(portfolio.hero.headline.value)}</div>`;
                  }

                  if (componentId === "hero:intro") {
                    return hasText(portfolio.hero.subheadline.value)
                      ? `<p class="lede">${escapeHtml(portfolio.hero.subheadline.value)}</p>`
                      : "";
                  }

                  if (componentId === "hero:actions") {
                    return `<div class="actions">
                      ${heroActions.length > 0
                        ? heroActions
                            .map(
                              (action, index) =>
                                `<a class="button ${index === 0 ? "primary" : "secondary"}" href="${escapeHtml(action.href)}" target="_blank" rel="noreferrer">${escapeHtml(action.label)}</a>`,
                            )
                            .join("")
                        : `<a class="button primary" href="${escapeHtml(portfolio.hero.profileLink)}" target="_blank" rel="noreferrer">${escapeHtml(portfolio.hero.ctaLabel)}</a>`}
                    </div>`;
                  }

                  return "";
                })
                .join("")}

              ${
                profileMeta.length > 0 || portfolio.profile?.blog
                  ? `<div class="chips">
                      ${profileMeta.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("")}
                      ${
                        portfolio.profile?.blog
                          ? `<a class="chip" href="${escapeHtml(
                              validLinks.find((link) => link.label === "Website")?.href || portfolio.profile.blog,
                            )}" target="_blank" rel="noreferrer">Personal site</a>`
                          : ""
                      }
                    </div>`
                  : ""
              }
              ${
                !hiddenChildIds.has("hero:stack") && orderedHeroStack.length > 0
                  ? `<div class="stack-list chips">
                      ${orderedHeroStack.map((item) => renderTechBadge(item)).join("")}
                    </div>`
                  : ""
              }
            </div>
            <div>
              ${
                orderedHeroLeftIds.includes("hero:image")
                  ? `<div class="hero-profile">
                      <div class="avatar">${avatarMarkup}</div>
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
                          return hasText(portfolio.about.description.value)
                            ? `<h2>About Me</h2><p class="summary">${escapeHtml(portfolio.about.description.value)}</p>`
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
                          hasText(portfolio.professional.company || portfolio.profile?.company)
                            ? `<div>
                                <div class="eyebrow">Company</div>
                                <p>${escapeHtml(portfolio.professional.company || portfolio.profile?.company || "")}</p>
                              </div>`
                            : ""
                        }
                        ${
                          hasText(portfolio.professional.location || portfolio.profile?.location)
                            ? `<div>
                                <div class="eyebrow">Location</div>
                                <p>${escapeHtml(portfolio.professional.location || portfolio.profile?.location || "")}</p>
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
            <div class="eyebrow">${escapeHtml(portfolio.professional.title || "Professional")}</div>
            <h2>Professional Snapshot</h2>
            ${
              hasText(portfolio.professional.summary)
                ? `<p class="summary">${escapeHtml(portfolio.professional.summary)}</p>`
                : ""
            }
            <div class="chips">
              ${
                hasText(portfolio.professional.company)
                  ? `<span class="chip">${escapeHtml(portfolio.professional.company)}</span>`
                  : ""
              }
              ${
                hasText(portfolio.professional.location)
                  ? `<span class="chip">${escapeHtml(portfolio.professional.location)}</span>`
                  : ""
              }
              ${
                hasText(portfolio.professional.availability)
                  ? `<span class="chip">${escapeHtml(portfolio.professional.availability)}</span>`
                  : ""
              }
            </div>
          </section>`
        : "",
    projects:
      showProjects
        ? `<section id="projects">
            <div class="project-section-header">
              <div>
                <div class="eyebrow">Projects</div>
                <h2>Selected Work</h2>
              </div>
            </div>

            ${
              featuredProject
                ? `<div class="project-layout">
                    <a class="project-featured" href="${escapeHtml(featuredProject.href)}" target="_blank" rel="noreferrer">
                      ${
                        featuredProject.resolvedImage
                          ? renderImage(featuredProject.resolvedImage.url, featuredProject.resolvedImage.alt)
                          : ""
                      }
                      <h3>${escapeHtml(featuredProject.name)}</h3>
                      <p class="summary">${escapeHtml(featuredProject.description)}</p>
                      ${
                        hasText(featuredProject.language)
                          ? `<div class="chips">${renderTechBadge(featuredProject.language)}</div>`
                          : ""
                      }
                    </a>

                    <div class="project-grid">
                      ${orderedSecondaryProjects
                        .map(
                          (repository) => `<a class="project-card" href="${escapeHtml(repository.href)}" target="_blank" rel="noreferrer">
                              ${
                                repository.resolvedImage
                                  ? renderImage(repository.resolvedImage.url, repository.resolvedImage.alt, true)
                                  : ""
                              }
                              <h3>${escapeHtml(repository.name)}</h3>
                              <p class="summary">${escapeHtml(repository.description)}</p>
                              ${
                                hasText(repository.language)
                                  ? `<div class="project-meta">
                                      ${renderTechBadge(repository.language)}
                                    </div>`
                                  : ""
                              }
                            </a>`,
                        )
                        .join("")}
                    </div>
                  </div>`
                : ""
            }
          </section>`
        : "",
    links:
      showLinks
        ? `<section id="links" class="card">
            <div class="eyebrow">Links</div>
            <h2>${escapeHtml(portfolio.linksSection.title.value || "Links")}</h2>
            ${
              hasText(portfolio.linksSection.description.value)
                ? `<p class="summary">${escapeHtml(portfolio.linksSection.description.value)}</p>`
                : ""
            }
            <div class="link-grid">
              ${orderedLinks
                .map(
                  (link) => `<a class="link-item" href="${escapeHtml(link.href)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(link.label)}</strong><div class="muted">${escapeHtml(link.href)}</div></a>`,
                )
                .join("")}
            </div>
          </section>`
        : "",
    contact:
      showContact
        ? `<section class="card" id="contact">
            <div class="eyebrow">Contact</div>
            <h2>${escapeHtml(portfolio.contact.title.value || "Contact")}</h2>
            ${
              hasText(portfolio.contact.description.value)
                ? `<p class="summary">${escapeHtml(portfolio.contact.description.value)}</p>`
                : ""
            }
            ${
              hasText(portfolio.contact.customText)
                ? `<div class="inline-note"><p>${escapeHtml(portfolio.contact.customText)}</p></div>`
                : ""
            }
            ${orderedContactMethods
              .map(
                (item) => `<a class="link-item" href="${escapeHtml(item.href)}"><strong>${escapeHtml(item.label)}</strong><div class="muted">${escapeHtml(item.value)}</div></a>`,
              )
              .join("")}
            ${
              orderedContactActions.length > 0
                ? `<div class="cta-grid">
                    ${orderedContactActions
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
      }</section>`,
    ]),
  );
  const orderedContentMarkup = sectionRows
    .map((row) => {
      const isFlexibleRow =
        portfolio.appearance.sectionLayout !== "stacked" &&
        row.items.some((component) => component.type !== "projects" && component.type !== "hero") &&
        row.items.length > 1;

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
      ${contactActions.length > 0
        ? `<footer class="footer">
            <div>
              <div class="eyebrow">Next Step</div>
              <div>Open the documents and profiles that support this portfolio.</div>
            </div>
            <div class="cta-grid">
              ${contactActions
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
