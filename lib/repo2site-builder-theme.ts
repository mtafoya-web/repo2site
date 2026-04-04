import type { CSSProperties } from "react";
import { getRepo2SiteDarkThemeMood } from "@/lib/repo2site-theme";
import type { PortfolioOverrides, PreviewTheme } from "@/lib/types";

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

  if (themeId === "ocean-cyan" || themeId === "pastel-sky") {
    return {
      lightBackgroundPattern:
        "radial-gradient(circle at 16% 10%, rgba(14, 165, 233, 0.2), transparent 34%), radial-gradient(circle at 84% 22%, rgba(34, 211, 238, 0.16), transparent 34%)",
      darkBackgroundPattern:
        "radial-gradient(circle at 18% 12%, rgba(8, 145, 178, 0.26), transparent 32%), radial-gradient(circle at 82% 18%, rgba(103, 232, 249, 0.12), transparent 28%)",
      lightHeroOverlay:
        "linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(34, 211, 238, 0.08))",
      darkHeroOverlay:
        "linear-gradient(135deg, rgba(8, 145, 178, 0.24), rgba(34, 211, 238, 0.08))",
      lightNavOverlay:
        "linear-gradient(135deg, rgba(14, 165, 233, 0.16), rgba(34, 211, 238, 0.08))",
      darkNavOverlay:
        "linear-gradient(135deg, rgba(8, 145, 178, 0.2), rgba(34, 211, 238, 0.08))",
      lightSectionTone:
        "linear-gradient(180deg, rgba(240, 249, 255, 0.72), rgba(255, 255, 255, 0.86))",
      darkSectionTone:
        "linear-gradient(180deg, rgba(10, 25, 35, 0.96), rgba(11, 29, 40, 0.92))",
      cardGlow: "0 20px 48px -34px rgba(8, 145, 178, 0.72)",
      lightProjectSurface:
        "linear-gradient(160deg, rgba(240, 249, 255, 0.95), rgba(255, 255, 255, 0.98))",
      darkProjectSurface:
        "linear-gradient(160deg, rgba(12, 30, 41, 0.98), rgba(15, 37, 50, 0.96))",
      projectInset: "inset 0 1px 0 rgba(255,255,255,0.78)",
      headlineWeight: "700",
    };
  }

  if (themeId === "creator-orange" || themeId === "soft-rose" || themeId === "neon-coral") {
    return {
      lightBackgroundPattern:
        "radial-gradient(circle at 14% 10%, rgba(244, 114, 182, 0.14), transparent 32%), radial-gradient(circle at 84% 18%, rgba(251, 146, 60, 0.16), transparent 32%)",
      darkBackgroundPattern:
        "radial-gradient(circle at 16% 12%, rgba(219, 39, 119, 0.18), transparent 30%), radial-gradient(circle at 82% 18%, rgba(251, 146, 60, 0.14), transparent 28%)",
      lightHeroOverlay:
        "linear-gradient(135deg, rgba(251, 146, 60, 0.18), rgba(244, 114, 182, 0.08))",
      darkHeroOverlay:
        "linear-gradient(135deg, rgba(251, 146, 60, 0.2), rgba(219, 39, 119, 0.08))",
      lightNavOverlay:
        "linear-gradient(135deg, rgba(251, 146, 60, 0.16), rgba(244, 114, 182, 0.08))",
      darkNavOverlay:
        "linear-gradient(135deg, rgba(251, 146, 60, 0.18), rgba(219, 39, 119, 0.08))",
      lightSectionTone:
        "linear-gradient(180deg, rgba(255, 247, 250, 0.72), rgba(255, 255, 255, 0.86))",
      darkSectionTone:
        "linear-gradient(180deg, rgba(34, 20, 24, 0.96), rgba(40, 23, 28, 0.92))",
      cardGlow: "0 20px 48px -34px rgba(219, 39, 119, 0.46)",
      lightProjectSurface:
        "linear-gradient(160deg, rgba(255, 247, 250, 0.95), rgba(255, 255, 255, 0.98))",
      darkProjectSurface:
        "linear-gradient(160deg, rgba(39, 24, 28, 0.98), rgba(47, 28, 33, 0.96))",
      projectInset: "inset 0 1px 0 rgba(255,255,255,0.78)",
      headlineWeight: "700",
    };
  }

  if (themeId === "slate-mono" || themeId === "contrast-ink") {
    return {
      lightBackgroundPattern:
        "linear-gradient(140deg, rgba(39, 39, 42, 0.12), transparent 45%), radial-gradient(circle at 82% 16%, rgba(113, 113, 122, 0.08), transparent 28%)",
      darkBackgroundPattern:
        "linear-gradient(140deg, rgba(82, 82, 91, 0.14), transparent 45%), radial-gradient(circle at 82% 16%, rgba(161, 161, 170, 0.08), transparent 28%)",
      lightHeroOverlay:
        "linear-gradient(135deg, rgba(39, 39, 42, 0.14), rgba(113, 113, 122, 0.06))",
      darkHeroOverlay:
        "linear-gradient(135deg, rgba(82, 82, 91, 0.16), rgba(161, 161, 170, 0.06))",
      lightNavOverlay:
        "linear-gradient(135deg, rgba(39, 39, 42, 0.12), rgba(113, 113, 122, 0.06))",
      darkNavOverlay:
        "linear-gradient(135deg, rgba(82, 82, 91, 0.14), rgba(161, 161, 170, 0.06))",
      lightSectionTone:
        "linear-gradient(180deg, rgba(250, 250, 250, 0.72), rgba(255, 255, 255, 0.86))",
      darkSectionTone:
        "linear-gradient(180deg, rgba(18, 19, 24, 0.96), rgba(22, 23, 28, 0.92))",
      cardGlow: "0 20px 48px -34px rgba(39, 39, 42, 0.44)",
      lightProjectSurface:
        "linear-gradient(160deg, rgba(250, 250, 250, 0.95), rgba(255, 255, 255, 0.98))",
      darkProjectSurface:
        "linear-gradient(160deg, rgba(22, 24, 29, 0.98), rgba(28, 30, 36, 0.96))",
      projectInset: "inset 0 1px 0 rgba(255,255,255,0.76)",
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

export function buildRepo2SiteThemeStyles(
  theme: PreviewTheme,
  cardStyle: PortfolioOverrides["appearance"]["cardStyle"],
  colorMode: PortfolioOverrides["appearance"]["colorMode"],
) {
  const preset = getThemePreset(theme.id);
  const isDarkMode = colorMode === "dark";
  const darkMood = getRepo2SiteDarkThemeMood(theme.id);
  const cardShadow =
    cardStyle === "outlined"
      ? "none"
      : cardStyle === "elevated"
        ? isDarkMode
          ? darkMood.shadow
          : "0 26px 58px -34px rgba(15,23,42,0.4)"
        : preset.cardGlow;
  const pageColor = isDarkMode ? "#0a1220" : "#edf3fb";
  const borderColor = isDarkMode ? darkMood.border : theme.palette.border;
  const textColor = isDarkMode ? darkMood.text : theme.palette.text;
  const mutedColor = isDarkMode ? darkMood.mutedText : theme.palette.muted;
  const chipBackground = isDarkMode ? theme.palette.accentSoft : theme.palette.chip;
  const chipText = isDarkMode ? darkMood.text : theme.palette.accent;
  const accentBlockText = isDarkMode ? darkMood.text : theme.palette.accent;
  const placeholderColor = isDarkMode ? "#8fa3bd" : "#64748b";
  const helperColor = isDarkMode ? "#c6d4ea" : "#334155";
  const successColor = isDarkMode ? "#86efac" : "#166534";
  const errorColor = isDarkMode ? "#fca5a5" : "#b91c1c";
  const infoColor = isDarkMode ? "#bfdbfe" : "#1d4ed8";
  const shellGlow = theme.palette.pageAccent;
  const surfaceColor = isDarkMode ? darkMood.section : "rgba(255, 255, 255, 0.86)";
  const surfaceStrongColor = isDarkMode ? darkMood.card : "rgba(255, 255, 255, 0.92)";
  const subtleSurfaceColor = isDarkMode ? darkMood.hover : "rgba(37,99,235,0.06)";
  const projectCardColor = isDarkMode ? darkMood.card : theme.palette.surfaceStrong;
  const ghostBackground = isDarkMode ? darkMood.interactive : theme.palette.surfaceStrong;
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
  const pageBackground = isDarkMode
    ? {
        backgroundColor: darkMood.page,
        backgroundImage: `${preset.darkBackgroundPattern}, radial-gradient(circle at top right, ${shellGlow}, transparent 28%)`,
      }
    : {
        backgroundColor: pageColor,
        backgroundImage: `${preset.lightBackgroundPattern}, radial-gradient(circle at top right, ${shellGlow}, transparent 28%)`,
      };
  const heroSurface = isDarkMode
    ? {
        backgroundColor: darkMood.hero,
        backgroundImage: `radial-gradient(circle at top right, ${theme.palette.accentSoft}, transparent 28%)`,
      }
    : {
        backgroundColor: "rgba(255,255,255,0.96)",
        backgroundImage: `${preset.lightHeroOverlay}, linear-gradient(135deg, rgba(255,255,255,0.92), ${shellGlow})`,
      };
  const navSurface = isDarkMode
    ? {
        backgroundColor: darkMood.nav,
        backgroundImage: `radial-gradient(circle at top right, ${theme.palette.pageAccent}, transparent 40%)`,
      }
    : {
        backgroundColor: "rgba(255,255,255,0.94)",
        backgroundImage: `${preset.lightNavOverlay}, linear-gradient(135deg, rgba(255,255,255,0.9), ${shellGlow})`,
      };
  const sectionSurface = isDarkMode
    ? {
        backgroundColor: darkMood.section,
      }
    : {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.9))",
      };
  const projectShowcase = isDarkMode
    ? {
        backgroundColor: darkMood.showcase,
        backgroundImage: `radial-gradient(circle at top right, ${theme.palette.accentSoft}, transparent 28%)`,
      }
    : {
        backgroundColor: "rgba(248,251,255,0.98)",
        backgroundImage: `linear-gradient(160deg, rgba(255,255,255,0.94), rgba(248,251,255,0.98)), radial-gradient(circle at top right, ${shellGlow}, transparent 28%)`,
      };

  return {
    page: {
      backgroundColor: pageBackground.backgroundColor,
      backgroundImage: pageBackground.backgroundImage,
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
      borderColor: isDarkMode ? darkMood.chipBorder : borderColor,
      color: textColor,
      ["--field-placeholder" as string]: placeholderColor,
    } satisfies CSSProperties,
    heroSurface: {
      backgroundColor: heroSurface.backgroundColor,
      backgroundImage: heroSurface.backgroundImage,
      borderColor,
      color: textColor,
      boxShadow: isDarkMode ? darkMood.shadow : undefined,
    } satisfies CSSProperties,
    navSurface: {
      backgroundColor: navSurface.backgroundColor,
      backgroundImage: navSurface.backgroundImage,
      borderColor,
      color: textColor,
    } satisfies CSSProperties,
    sectionSurface: {
      backgroundColor: sectionSurface.backgroundColor,
      backgroundImage: sectionSurface.backgroundImage,
      borderColor,
      color: textColor,
    } satisfies CSSProperties,
    projectShowcase: {
      backgroundColor: projectShowcase.backgroundColor,
      backgroundImage: projectShowcase.backgroundImage,
      borderColor,
      color: textColor,
      boxShadow: `${preset.projectInset}, ${cardShadow}`,
    } satisfies CSSProperties,
    projectCard: {
      backgroundColor: projectCardColor,
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
      borderColor: isDarkMode ? darkMood.chipBorder : borderColor,
    } satisfies CSSProperties,
    accentBlock: {
      backgroundColor: theme.palette.accentSoft,
      color: accentBlockText,
      borderColor: isDarkMode ? darkMood.chipBorder : theme.palette.pageAccent,
    } satisfies CSSProperties,
    accentButton: {
      backgroundColor: theme.palette.accent,
      color: "#ffffff",
      boxShadow: isDarkMode
        ? `0 16px 26px -20px ${theme.palette.accentSoft}`
        : `0 18px 30px -20px ${theme.palette.accent}`,
    } satisfies CSSProperties,
    ghostButton: {
      borderColor: isDarkMode ? darkMood.chipBorder : borderColor,
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
      borderColor: isDarkMode ? darkMood.chipBorder : borderColor,
    } satisfies CSSProperties,
    userBadge: userBadge satisfies CSSProperties,
    aiBadge: aiBadge satisfies CSSProperties,
    readmeBadge: readmeBadge satisfies CSSProperties,
  };
}

export type Repo2SiteThemeStyleMap = ReturnType<typeof buildRepo2SiteThemeStyles>;
