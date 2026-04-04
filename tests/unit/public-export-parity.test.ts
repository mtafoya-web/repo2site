import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildStaticPortfolioBundle } from "@/lib/static-export";
import { buildFinalPortfolio } from "@/lib/portfolio";
import { buildRepo2SiteSectionModels } from "@/lib/repo2site-section-models";
import {
  FALLBACK_ABOUT,
  FALLBACK_CONTACT,
  FALLBACK_HERO,
  FALLBACK_LINKS,
  FALLBACK_LINKS_SECTION,
  FALLBACK_REPOSITORIES,
  FALLBACK_TECH_STACK,
  FALLBACK_THEME,
} from "@/lib/repo2site-builder-constants";
import { createSampleOverrides, createSamplePreview } from "@/tests/fixtures/sample-preview";

function countMatches(input: string, pattern: RegExp) {
  return [...input.matchAll(pattern)].length;
}

function buildSamplePortfolio() {
  const preview = createSamplePreview();
  const overrides = createSampleOverrides();
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

  return { preview, overrides, portfolio };
}

describe("public/export section parity", () => {
  test("export derives hero and project structure from the shared section models", () => {
    const { preview, overrides, portfolio } = buildSamplePortfolio();
    const sectionModels = buildRepo2SiteSectionModels(portfolio);
    const bundle = buildStaticPortfolioBundle({ portfolio, preview, overrides });
    const html = bundle.files.find((file) => file.path === "index.html")?.content ?? "";

    assert.match(
      html,
      new RegExp(sectionModels.hero.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
    assert.match(html, new RegExp(sectionModels.projects.heading, "i"));
    assert.equal(
      countMatches(html, /class="hero-highlight-card"/g),
      sectionModels.hero.highlightItems.length,
    );
    assert.equal(
      countMatches(html, /class="project-featured"/g),
      sectionModels.projects.featuredProject ? 1 : 0,
    );
    assert.equal(
      countMatches(html, /class="project-card"/g),
      sectionModels.projects.secondaryProjects.length,
    );

    if (sectionModels.projects.featuredProject) {
      assert.match(html, new RegExp(sectionModels.projects.featuredProject.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }

    for (const project of sectionModels.projects.secondaryProjects) {
      assert.match(html, new RegExp(project.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });
});
