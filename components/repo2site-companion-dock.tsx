"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  Repo2SiteBuilderSprite,
  type BuilderSpriteReactionSignal,
  type BuilderSpriteReactionType,
} from "@/components/repo2site-builder-sprite";
import { useAppTheme } from "@/components/app-theme-provider";
import type { PreviewTheme } from "@/lib/types";

type Repo2SiteCompanionContextValue = {
  triggerSpriteReaction: (type: BuilderSpriteReactionType, meta?: string) => void;
};

const Repo2SiteCompanionContext = createContext<Repo2SiteCompanionContextValue | null>(null);

function getAppCompanionPalette(theme: "light" | "dark"): PreviewTheme["palette"] {
  if (theme === "dark") {
    return {
      page: "#0d1728",
      pageAccent: "rgba(59,130,246,0.18)",
      surface: "rgba(15,24,41,0.92)",
      surfaceStrong: "#0f1729",
      border: "rgba(148,163,184,0.16)",
      text: "#e5eefb",
      muted: "#9fb0c8",
      accent: "#2563eb",
      accentSoft: "rgba(37,99,235,0.12)",
      chip: "rgba(255,255,255,0.04)",
    };
  }

  return {
    page: "#f8fbff",
    pageAccent: "rgba(59,130,246,0.12)",
    surface: "rgba(255,255,255,0.96)",
    surfaceStrong: "#ffffff",
    border: "rgba(148,163,184,0.22)",
    text: "#0f172a",
    muted: "#475569",
    accent: "#2563eb",
    accentSoft: "rgba(37,99,235,0.12)",
    chip: "rgba(37,99,235,0.08)",
  };
}

export function Repo2SiteCompanionProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [spriteReaction, setSpriteReaction] = useState<BuilderSpriteReactionSignal | null>(null);
  const { renderTheme } = useAppTheme();
  const spritePalette = useMemo(() => getAppCompanionPalette(renderTheme), [renderTheme]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const value = useMemo<Repo2SiteCompanionContextValue>(
    () => ({
      triggerSpriteReaction: (type, meta) => {
        setSpriteReaction({
          type,
          meta,
          nonce: Date.now() + Math.random(),
        });
      },
    }),
    [],
  );

  return (
    <Repo2SiteCompanionContext.Provider value={value}>
      {children}
      {isHydrated ? (
        <div className="pointer-events-none fixed bottom-3 left-3 z-[48] hidden sm:block sm:bottom-4 sm:left-4 xl:bottom-5 xl:left-5">
          <Repo2SiteBuilderSprite
            enabled
            palette={spritePalette}
            reaction={spriteReaction}
          />
        </div>
      ) : null}
    </Repo2SiteCompanionContext.Provider>
  );
}

export function useRepo2SiteCompanion() {
  const value = useContext(Repo2SiteCompanionContext);

  if (!value) {
    throw new Error("useRepo2SiteCompanion must be used within Repo2SiteCompanionProvider.");
  }

  return value;
}
