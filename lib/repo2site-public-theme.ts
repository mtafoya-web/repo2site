import { getRepo2SiteDarkThemeMood } from "@/lib/repo2site-theme";
import type { PreviewTheme } from "@/lib/types";

type PublicThemePortfolio = {
  theme: PreviewTheme;
  appearance: {
    colorMode: "light" | "dark";
  };
};

export type Repo2SitePublicThemeValues = {
  pageBackground: string;
  pageColor: string;
  shellBackground: string;
  shellBorder: string;
  shellShadow: string;
  surfaceBackground: string;
  surfaceBorder: string;
  surfaceColor: string;
  mutedColor: string;
  accentBackground: string;
  accentColor: string;
  chipBackground: string;
  chipBorder: string;
  chipColor: string;
};

export function buildRepo2SitePublicTheme(portfolio: PublicThemePortfolio): Repo2SitePublicThemeValues {
  const { palette } = portfolio.theme;
  const isDarkMode = portfolio.appearance.colorMode === "dark";
  const darkMood = getRepo2SiteDarkThemeMood(portfolio.theme.id);

  return {
    pageBackground: isDarkMode
      ? `radial-gradient(circle at top right, ${palette.pageAccent}, transparent 26%), ${darkMood.page}`
      : `radial-gradient(circle at top right, ${palette.pageAccent}, transparent 26%), ${palette.page}`,
    pageColor: isDarkMode ? darkMood.text : palette.text,
    shellBackground: isDarkMode
      ? `radial-gradient(circle at top right, ${palette.pageAccent}, transparent 32%), ${darkMood.shell}`
      : "rgba(255,255,255,0.9)",
    shellBorder: isDarkMode ? darkMood.border : palette.border,
    shellShadow: isDarkMode ? darkMood.shadow : "0 30px 90px -48px rgba(15, 23, 42, 0.34)",
    surfaceBackground: isDarkMode
      ? `radial-gradient(circle at top right, ${palette.accentSoft}, transparent 24%), ${darkMood.card}`
      : palette.surfaceStrong,
    surfaceBorder: isDarkMode ? darkMood.border : palette.border,
    surfaceColor: isDarkMode ? darkMood.text : palette.text,
    mutedColor: isDarkMode ? darkMood.mutedText : palette.muted,
    accentBackground: palette.accent,
    accentColor: "#ffffff",
    chipBackground: isDarkMode ? palette.accentSoft : palette.chip,
    chipBorder: isDarkMode ? darkMood.chipBorder : palette.border,
    chipColor: isDarkMode ? darkMood.text : palette.accent,
  };
}
