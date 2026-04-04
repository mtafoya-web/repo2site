import type { PortfolioAppearance } from "@/lib/types";

export type Repo2SiteLayoutPreset = {
  id: string;
  label: string;
  description: string;
  appearance: Pick<
    PortfolioAppearance,
    "sectionLayout" | "projectsLayout" | "projectsOverflowSize" | "density"
  >;
};

export const REPO2SITE_LAYOUT_PRESETS: Repo2SiteLayoutPreset[] = [
  {
    id: "balanced-showcase",
    label: "Balanced Showcase",
    description: "A safe default: split sections with a measured featured-project spotlight.",
    appearance: {
      sectionLayout: "split",
      projectsLayout: "hybrid",
      projectsOverflowSize: "compact",
      density: "compact",
    },
  },
  {
    id: "editorial-stack",
    label: "Editorial Stack",
    description: "Clear vertical storytelling with generous spacing and full-width projects.",
    appearance: {
      sectionLayout: "stacked",
      projectsLayout: "stacked",
      projectsOverflowSize: "expanded",
      density: "spacious",
    },
  },
  {
    id: "product-grid",
    label: "Product Grid",
    description: "A tighter product-style layout with split sections and even project cards.",
    appearance: {
      sectionLayout: "split",
      projectsLayout: "side-by-side",
      projectsOverflowSize: "compact",
      density: "compact",
    },
  },
];
