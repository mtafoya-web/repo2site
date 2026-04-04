import type { PortfolioOverrides } from "@/lib/types";

export type SystemTemplateDefinition = {
  id: string;
  slug: string;
  profileUrl: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  sourceLabel: string;
  isRecommended: boolean;
  exampleContent: {
    aboutTitle: string;
    professionalTitle: string;
    availability: string;
    contactTitle: string;
    contactDescription: string;
    contactCustomText: string;
    linksTitle: string;
    linksDescription: string;
  };
  overrides: Partial<PortfolioOverrides["appearance"]> & {
    sectionOrder: PortfolioOverrides["layout"]["sectionOrder"];
    hiddenSections: PortfolioOverrides["layout"]["hiddenSections"];
  };
};

export const SYSTEM_TEMPLATE_DEFINITIONS: SystemTemplateDefinition[] = [
  {
    id: "system-vercel-canvas",
    slug: "starter-vercel-canvas",
    profileUrl: "https://github.com/vercel",
    title: "Frontend Canvas",
    description:
      "A clean product-minded starter built from real platform tooling repositories and repo2site’s own portfolio generation flow.",
    category: "product-focused",
    tags: ["starter", "frontend", "platform", "nextjs"],
    sourceLabel: "Inspired by real-world repositories from the Vercel ecosystem",
    isRecommended: true,
    exampleContent: {
      aboutTitle: "About this frontend-focused template",
      professionalTitle: "Product + Platform Focus",
      availability: "Well suited for frontend, platform, and product engineering portfolios.",
      contactTitle: "Start a conversation",
      contactDescription:
        "Use this section to invite product teams, hiring managers, and collaborators to reach out.",
      contactCustomText: "Add the best way to connect for portfolio reviews, hiring, or collaboration.",
      linksTitle: "Proof of work",
      linksDescription:
        "Collect your resume, LinkedIn, GitHub, and any supporting links in one clear, recruiter-friendly section.",
    },
    overrides: {
      themeId: "builder-blue",
      colorMode: "dark",
      density: "compact",
      sectionLayout: "split",
      cardStyle: "elevated",
      sectionOrder: ["hero", "projects", "about", "professional", "links", "contact"],
      hiddenSections: [],
    },
  },
  {
    id: "system-stripe-ledger",
    slug: "starter-stripe-ledger",
    profileUrl: "https://github.com/stripe",
    title: "API Ledger",
    description:
      "A structured API-first starter generated from public developer tooling repositories, tailored for polished full-stack and product engineering portfolios.",
    category: "full-stack",
    tags: ["starter", "api", "tooling", "full-stack"],
    sourceLabel: "Inspired by real-world repositories from the Stripe developer ecosystem",
    isRecommended: true,
    exampleContent: {
      aboutTitle: "About this API-first template",
      professionalTitle: "API + Product Engineering",
      availability: "A strong fit for full-stack, API, and developer-platform portfolio stories.",
      contactTitle: "Connect for product work",
      contactDescription:
        "Use this area to guide recruiters and teammates toward the best way to reach you for product and platform roles.",
      contactCustomText: "Mention whether you prefer email, LinkedIn, or a portfolio contact form.",
      linksTitle: "Professional links",
      linksDescription:
        "Highlight resume access, product links, technical writing, and professional profiles without adding clutter.",
    },
    overrides: {
      themeId: "editorial-amber",
      colorMode: "light",
      density: "compact",
      sectionLayout: "stacked",
      cardStyle: "outlined",
      sectionOrder: ["hero", "professional", "projects", "about", "links", "contact"],
      hiddenSections: [],
    },
  },
  {
    id: "system-meta-infra",
    slug: "starter-meta-infra",
    profileUrl: "https://github.com/facebook",
    title: "Scale Grid",
    description:
      "A systems-heavy starter generated from large-scale engineering repositories, with stronger emphasis on technical depth and infrastructure posture.",
    category: "backend-systems",
    tags: ["starter", "systems", "infrastructure", "engineering"],
    sourceLabel: "Inspired by real-world repositories from the Meta open-source ecosystem",
    isRecommended: false,
    exampleContent: {
      aboutTitle: "About this systems template",
      professionalTitle: "Systems + Scale Focus",
      availability: "Best for infrastructure, distributed systems, and backend engineering positioning.",
      contactTitle: "Reach out about systems work",
      contactDescription:
        "Use this section for hiring conversations, architecture discussions, and backend or infrastructure opportunities.",
      contactCustomText: "Add a brief note about the kinds of technical problems or teams you want to work with.",
      linksTitle: "Reference links",
      linksDescription:
        "Keep key references close: GitHub profile, technical writing, resume, and any notable project or demo links.",
    },
    overrides: {
      themeId: "systems-green",
      colorMode: "dark",
      density: "spacious",
      sectionLayout: "split",
      cardStyle: "soft",
      sectionOrder: ["hero", "professional", "about", "projects", "contact", "links"],
      hiddenSections: [],
    },
  },
  {
    id: "system-netflix-backplane",
    slug: "starter-netflix-backplane",
    profileUrl: "https://github.com/netflix",
    title: "Service Backplane",
    description:
      "A backend-first starter generated from public service and resilience repositories, designed for operational and platform engineering portfolios.",
    category: "backend-systems",
    tags: ["starter", "backend", "resilience", "distributed-systems"],
    sourceLabel: "Inspired by real-world repositories from the Netflix engineering ecosystem",
    isRecommended: false,
    exampleContent: {
      aboutTitle: "About this backend starter",
      professionalTitle: "Backend + Reliability Profile",
      availability: "Designed for portfolios centered on service architecture, reliability, and platform ownership.",
      contactTitle: "Talk through platform work",
      contactDescription:
        "Use this contact section to support conversations around backend ownership, resilience, and engineering leadership.",
      contactCustomText: "Mention how you prefer to hear about backend, platform, or reliability opportunities.",
      linksTitle: "Support materials",
      linksDescription:
        "Add the documents and links that help reviewers understand your architecture work quickly.",
    },
    overrides: {
      themeId: "slate-mono",
      colorMode: "dark",
      density: "compact",
      sectionLayout: "stacked",
      cardStyle: "outlined",
      sectionOrder: ["hero", "projects", "professional", "about", "links", "contact"],
      hiddenSections: ["links"],
    },
  },
  {
    id: "system-google-quiet-form",
    slug: "starter-google-quiet-form",
    profileUrl: "https://github.com/google",
    title: "Quiet Form",
    description:
      "A restrained structured starter generated from broad public engineering repositories, ideal for minimal and text-first developer portfolios.",
    category: "minimal-developer",
    tags: ["starter", "minimal", "structured", "developer"],
    sourceLabel: "Inspired by real-world repositories from Google’s open-source ecosystem",
    isRecommended: true,
    exampleContent: {
      aboutTitle: "About this minimal template",
      professionalTitle: "Developer Snapshot",
      availability: "A clean starting point for concise developer portfolios and early-career personal sites.",
      contactTitle: "Keep it easy to connect",
      contactDescription:
        "Use a short invitation here so recruiters and collaborators know how to follow up without distracting from the work.",
      contactCustomText: "Add your preferred contact channel or a brief note about what you are open to.",
      linksTitle: "Resume + profile links",
      linksDescription:
        "This section works best for a focused set of links: resume, LinkedIn, portfolio, and one or two supporting resources.",
    },
    overrides: {
      themeId: "signal-violet",
      colorMode: "light",
      density: "spacious",
      sectionLayout: "split",
      cardStyle: "elevated",
      sectionOrder: ["hero", "about", "projects", "professional", "contact", "links"],
      hiddenSections: [],
    },
  },
  {
    id: "system-saas-clean",
    slug: "starter-saas-clean",
    profileUrl: "https://github.com/vercel",
    title: "SaaS Clean",
    description:
      "A quieter product-style starter with neutral surfaces, cleaner hierarchy, and a restrained palette for portfolios that should feel polished but not colorful.",
    category: "product-focused",
    tags: ["starter", "saas", "clean", "minimal", "product"],
    sourceLabel: "Built for teams and founders who want a crisp SaaS look in either light or dark mode",
    isRecommended: true,
    exampleContent: {
      aboutTitle: "About this SaaS-style template",
      professionalTitle: "Product Snapshot",
      availability: "A clean fit for SaaS portfolios, product engineers, indie makers, and founder-friendly personal sites.",
      contactTitle: "Start a conversation",
      contactDescription:
        "Use this version when you want the site to feel calm, clean, and product-minded without loud palette choices.",
      contactCustomText: "Mention the best way to reach you for product, engineering, or consulting conversations.",
      linksTitle: "Proof of work",
      linksDescription:
        "Keep resume, GitHub, LinkedIn, and product links in one tidy section with the same clean visual language.",
    },
    overrides: {
      themeId: "saas-clean",
      colorMode: "light",
      density: "compact",
      sectionLayout: "split",
      cardStyle: "outlined",
      sectionOrder: ["hero", "projects", "about", "professional", "links", "contact"],
      hiddenSections: [],
    },
  },
];
