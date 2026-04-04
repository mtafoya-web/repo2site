import type { CSSProperties } from "react";

export const APP_THEME_STORAGE_KEY = "repo2site-ui-theme";
export const APP_THEME_RESOLVED_COOKIE = "repo2site-ui-theme-resolved";
export const APP_THEME_SOURCE_COOKIE = "repo2site-ui-theme-source";

export type AppThemeChoice = "system" | "light" | "dark";
export type ResolvedAppTheme = "light" | "dark";

export function resolveSystemAppTheme(): ResolvedAppTheme {
  if (typeof window === "undefined") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function readStoredAppTheme(storage: Storage | null): AppThemeChoice {
  const storedValue = storage?.getItem(APP_THEME_STORAGE_KEY);

  if (storedValue === "light" || storedValue === "dark") {
    return storedValue;
  }

  return "system";
}

export function resolveAppTheme(themeChoice: AppThemeChoice): ResolvedAppTheme {
  if (themeChoice === "system") {
    return resolveSystemAppTheme();
  }

  return themeChoice;
}

export function buildAppThemeStyles(theme: ResolvedAppTheme) {
  const isDark = theme === "dark";
  const foreground = isDark ? "#e5eefb" : "#0f172a";
  const foregroundStrong = isDark ? "#f8fbff" : "#020617";
  const muted = isDark ? "#9fb0c8" : "#475569";
  const helper = isDark ? "#c6d4ea" : "#334155";
  const border = isDark ? "rgba(148,163,184,0.16)" : "rgba(148,163,184,0.22)";
  const subtleBorder = isDark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.18)";
  const placeholder = isDark ? "#7f93b0" : "#64748b";
  const success = isDark ? "#86efac" : "#166534";
  const error = isDark ? "#fda4af" : "#b91c1c";
  const info = isDark ? "#bfdbfe" : "#1d4ed8";
  const pageBase = isDark ? "#0a1220" : "#edf3fb";
  const pageGlow = isDark ? "rgba(59,130,246,0.16)" : "rgba(59,130,246,0.1)";
  const navBase = isDark ? "rgba(15,23,41,0.82)" : "rgba(255,255,255,0.74)";
  const surfaceBase = isDark ? "rgba(12,19,33,0.9)" : "rgba(255,255,255,0.86)";
  const strongSurfaceBase = isDark ? "rgba(15,23,41,0.92)" : "rgba(255,255,255,0.92)";

  return {
    page: {
      background: `radial-gradient(circle at top right, ${pageGlow}, transparent 28%), linear-gradient(180deg, ${pageBase} 0%, ${pageBase} 100%)`,
      color: foreground,
    } satisfies CSSProperties,
    navSurface: {
      background: `linear-gradient(135deg, ${isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.9)"}, ${navBase})`,
      borderColor: border,
      color: foreground,
      boxShadow: isDark
        ? "0 20px 50px -36px rgba(2, 6, 23, 0.72)"
        : "0 20px 50px -36px rgba(15, 23, 42, 0.18)",
    } satisfies CSSProperties,
    surface: {
      background: `linear-gradient(180deg, ${surfaceBase}, ${surfaceBase})`,
      borderColor: subtleBorder,
      color: foreground,
      boxShadow: isDark
        ? "0 22px 54px -40px rgba(2, 6, 23, 0.72)"
        : "0 24px 56px -42px rgba(15, 23, 42, 0.14)",
    } satisfies CSSProperties,
    strongSurface: {
      background: strongSurfaceBase,
      borderColor: border,
      color: foregroundStrong,
    } satisfies CSSProperties,
    subtleSurface: {
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(37,99,235,0.06)",
      borderColor: subtleBorder,
      color: foreground,
    } satisfies CSSProperties,
    chip: {
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(37,99,235,0.08)",
      borderColor: subtleBorder,
      color: isDark ? "#dbeafe" : "#1d4ed8",
    } satisfies CSSProperties,
    mutedText: {
      color: muted,
    } satisfies CSSProperties,
    helperText: {
      color: helper,
    } satisfies CSSProperties,
    accentButton: {
      backgroundColor: "#2563eb",
      color: "#ffffff",
      boxShadow: isDark
        ? "0 18px 34px -22px rgba(37, 99, 235, 0.72)"
        : "0 18px 34px -22px rgba(37, 99, 235, 0.36)",
    } satisfies CSSProperties,
    ghostButton: {
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.82)",
      borderColor: border,
      color: foreground,
    } satisfies CSSProperties,
    inputSurface: {
      backgroundColor: strongSurfaceBase,
      borderColor: border,
      color: foregroundStrong,
      ["--field-placeholder" as string]: placeholder,
    } satisfies CSSProperties,
    placeholderText: {
      color: placeholder,
    } satisfies CSSProperties,
    infoText: {
      color: info,
    } satisfies CSSProperties,
    successText: {
      color: success,
    } satisfies CSSProperties,
    errorText: {
      color: error,
    } satisfies CSSProperties,
    heroAccent: {
      background: isDark
        ? "linear-gradient(135deg, rgba(37,99,235,0.2), rgba(14,165,233,0.06))"
        : "linear-gradient(135deg, rgba(37,99,235,0.1), rgba(14,165,233,0.04))",
      borderColor: isDark ? "rgba(96,165,250,0.16)" : "rgba(96,165,250,0.2)",
    } satisfies CSSProperties,
  };
}
