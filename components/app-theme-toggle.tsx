"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useAppTheme } from "@/components/app-theme-provider";
import { buildAppThemeStyles } from "@/lib/app-theme";

type AppThemeToggleProps = {
  onThemeChange?: (themeChoice: "system" | "light" | "dark") => void;
  emphasized?: boolean;
} & ComponentPropsWithoutRef<"div">;

export function AppThemeToggle({ onThemeChange, emphasized = false, className, ...props }: AppThemeToggleProps) {
  const { renderTheme, themeChoice, setThemeChoice } = useAppTheme();
  const styles = buildAppThemeStyles(renderTheme);
  const options = [
    { id: "system", label: "System", icon: "◌" },
    { id: "light", label: "Light", icon: "☀" },
    { id: "dark", label: "Dark", icon: "◐" },
  ] as const;

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border p-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${emphasized ? "w-full gap-1.5 rounded-[1rem] p-1.5" : ""} ${className ?? ""}`.trim()}
      style={
        emphasized
          ? {
              ...styles.strongSurface,
              boxShadow:
                renderTheme === "dark"
                  ? "0 18px 42px -28px rgba(2, 6, 23, 0.78)"
                  : "0 20px 42px -30px rgba(15, 23, 42, 0.18)",
            }
          : styles.navSurface
      }
      aria-label="Theme selector"
      role="group"
      {...props}
    >
      {options.map((option) => {
        const isActive = themeChoice === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              setThemeChoice(option.id);
              onThemeChange?.(option.id);
            }}
            aria-pressed={isActive}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 transition hover:-translate-y-0.5 ${emphasized ? "flex-1 justify-center px-4 py-2.5 text-xs" : ""}`}
            style={
              isActive
                ? styles.accentButton
                : emphasized
                  ? {
                      ...styles.ghostButton,
                      backgroundColor: renderTheme === "dark" ? "rgba(255,255,255,0.08)" : "#ffffff",
                      borderColor: renderTheme === "dark" ? "rgba(148,163,184,0.24)" : "rgba(148,163,184,0.28)",
                    }
                  : styles.ghostButton
            }
          >
            <span aria-hidden="true" className="text-sm leading-none">
              {option.icon}
            </span>
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
