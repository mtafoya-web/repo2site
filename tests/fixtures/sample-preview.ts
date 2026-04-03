import { createEmptyOverrides } from "@/lib/portfolio";
import type { GeneratePreviewResponse } from "@/lib/types";

export function createSamplePreview(): GeneratePreviewResponse {
  return {
    profile: {
      username: "janedoe",
      url: "https://github.com/janedoe",
      name: "Jane Doe",
      bio: "Full-stack engineer focused on product quality, developer tools, and resilient web systems.",
      avatarUrl: "https://avatars.githubusercontent.com/u/123456?v=4",
      location: "San Francisco, CA",
      company: "Repo2Site Labs",
      blog: "https://janedoe.dev",
      followers: 120,
      following: 42,
      publicRepos: 18,
    },
    summary:
      "Builds polished developer-facing products with strong UX, thoughtful systems design, and production-ready frontend architecture.",
    hero: {
      name: "Jane Doe",
      headline: "Building polished developer products from real code and product context.",
      subheadline: "Frontend-first engineer with a strong systems mindset and a habit of shipping clean interfaces.",
      ctaLabel: "View GitHub Profile",
    },
    about: {
      title: "About Me",
      description:
        "I work across product, frontend systems, and developer experience, with a focus on clear interfaces and maintainable implementation details.",
    },
    contact: {
      title: "Contact",
      description: "Open to product engineering roles, collaboration, and thoughtful builder conversations.",
    },
    linksSection: {
      title: "Links",
      description: "A few useful places to learn more and get in touch.",
    },
    featuredRepositories: [
      {
        name: "repo2site-starter",
        description: "Generates customizable portfolio sites from public GitHub profile data and project context.",
        language: "TypeScript",
        href: "https://github.com/janedoe/repo2site-starter",
        stars: 18,
        image: {
          url: "https://images.example.com/repo2site-starter.png",
          alt: "Repo2Site starter preview",
          source: "readme",
        },
        readmeImages: ["https://images.example.com/repo2site-starter.png"],
        readmeExcerpt: "A portfolio generator focused on readability, theme control, and deployable output.",
      },
      {
        name: "design-systems-lab",
        description: "A component and theming playground for high-quality SaaS interfaces.",
        language: "CSS",
        href: "https://github.com/janedoe/design-systems-lab",
        stars: 11,
        image: null,
        readmeImages: [],
        readmeExcerpt: "Explores tokens, responsive layout systems, and composition patterns.",
      },
    ],
    techStack: ["TypeScript", "Next.js", "React", "Tailwind CSS"],
    links: [
      { label: "GitHub", href: "https://github.com/janedoe" },
      { label: "Website", href: "https://janedoe.dev" },
    ],
    theme: {
      id: "builder-blue",
      name: "Builder Blue",
      reason: "Default theme for test fixtures.",
      palette: {
        page: "#f6f8fc",
        pageAccent: "rgba(96, 165, 250, 0.16)",
        surface: "rgba(255,255,255,0.88)",
        surfaceStrong: "#ffffff",
        border: "rgba(148, 163, 184, 0.28)",
        text: "#0f172a",
        muted: "#475569",
        accent: "#2563eb",
        accentSoft: "rgba(37, 99, 235, 0.12)",
        chip: "#e0ecff",
      },
    },
    promptSeed: "Test preview seed",
  };
}

export function createSampleOverrides() {
  const overrides = createEmptyOverrides();
  overrides.appearance.themeId = "builder-blue";
  return overrides;
}
