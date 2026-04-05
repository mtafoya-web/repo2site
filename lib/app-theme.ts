import type { CSSProperties } from "react";

export const APP_THEME_STORAGE_KEY = "repo2site-ui-theme";

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
  const border = isDark ? "rgba(148,163,184,0.16)" : "rgba(100,116,139,0.28)";
  const subtleBorder = isDark ? "rgba(148,163,184,0.12)" : "rgba(100,116,139,0.22)";
  const placeholder = isDark ? "#7f93b0" : "#64748b";
  const success = isDark ? "#86efac" : "#166534";
  const error = isDark ? "#fda4af" : "#b91c1c";
  const info = isDark ? "#bfdbfe" : "#1d4ed8";

  return {
    page: {
      background: isDark
        ? "radial-gradient(circle at top right, rgba(59,130,246,0.18), transparent 28%), linear-gradient(180deg, #07101d 0%, #0d1728 42%, #09111f 100%)"
        : "radial-gradient(circle at top right, rgba(59,130,246,0.12), transparent 26%), linear-gradient(180deg, #f5f8ff 0%, #edf3ff 42%, #f8fbff 100%)",
      color: foreground,
    } satisfies CSSProperties,
    navSurface: {
      background: isDark
        ? "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(15,23,42,0.82))"
        : "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(232,240,255,0.98))",
      borderColor: border,
      color: foreground,
      boxShadow: isDark
        ? "0 20px 50px -36px rgba(2, 6, 23, 0.72)"
        : "0 24px 60px -38px rgba(15, 23, 42, 0.22)",
    } satisfies CSSProperties,
    surface: {
      background: isDark
        ? "linear-gradient(180deg, rgba(12, 19, 33, 0.92), rgba(15, 24, 41, 0.92))"
        : "linear-gradient(180deg, rgba(255,255,255,0.99), rgba(241,245,255,0.98))",
      borderColor: subtleBorder,
      color: foreground,
      boxShadow: isDark
        ? "0 22px 54px -40px rgba(2, 6, 23, 0.72)"
        : "0 26px 62px -42px rgba(15, 23, 42, 0.18)",
    } satisfies CSSProperties,
    strongSurface: {
      background: isDark ? "rgba(15, 23, 41, 0.94)" : "rgba(255,255,255,1)",
      borderColor: border,
      color: foregroundStrong,
    } satisfies CSSProperties,
    subtleSurface: {
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(37,99,235,0.09)",
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
      borderColor: isDark ? "rgba(96, 165, 250, 0.24)" : "rgba(29, 78, 216, 0.34)",
      boxShadow: isDark
        ? "0 18px 34px -22px rgba(37, 99, 235, 0.72)"
        : "0 18px 34px -22px rgba(37, 99, 235, 0.36)",
    } satisfies CSSProperties,
    ghostButton: {
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(226, 232, 240, 0.82)",
      borderColor: isDark ? border : "rgba(71, 85, 105, 0.24)",
      color: isDark ? foreground : "#0f172a",
      boxShadow: isDark ? "none" : "inset 0 1px 0 rgba(255,255,255,0.65)",
    } satisfies CSSProperties,
    inputSurface: {
      backgroundColor: isDark ? "rgba(15, 23, 41, 0.94)" : "rgba(255,255,255,1)",
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
    errorBox: {
      backgroundColor: isDark ? "rgba(127, 29, 29, 0.22)" : "rgba(254, 226, 226, 0.9)",
      borderColor: isDark ? "rgba(248, 113, 113, 0.28)" : "rgba(248, 113, 113, 0.3)",
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
