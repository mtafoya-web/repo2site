import { buildRepo2SitePublicLayoutModel, type PublicPortfolioData } from "@/lib/repo2site-public-layout";
import type { ResolvedProfessionalAction, ResolvedPreviewRepository } from "@/lib/portfolio";

export type Repo2SiteHeroActionModel = {
  id: string;
  label: string;
  href: string;
  primary: boolean;
};

export type Repo2SiteHeroHighlightModel = {
  label: string;
  value: string;
};

export type Repo2SiteSectionModels = {
  hero: {
    name: string;
    profileLabel: string;
    imageUrl: string;
    headline: {
      value: string;
      source: string;
    };
    intro: {
      value: string;
      source: string;
    };
    summary: string;
    actions: Repo2SiteHeroActionModel[];
    stackItems: string[];
    highlightItems: Repo2SiteHeroHighlightModel[];
  };
  about: {
    eyebrow: string;
    heading: string;
    description: string;
    profileDetails: Array<{ label: string; value: string }>;
  };
  professional: {
    eyebrow: string;
    heading: string;
    summary: string;
    chips: string[];
  };
  projects: {
    eyebrow: string;
    heading: string;
    description: string;
    layoutMode: PublicPortfolioData["appearance"]["projectsLayout"];
    overflowSize: PublicPortfolioData["appearance"]["projectsOverflowSize"];
    featuredProject: ResolvedPreviewRepository | null;
    secondaryProjects: ResolvedPreviewRepository[];
    featuredBadgeLabel: string;
    exploreHref: string;
    secondaryColumnCount: 2 | 3;
  };
  links: {
    eyebrow: string;
    heading: string;
    description: string;
    items: Array<{ id: string; label: string; href: string }>;
  };
  contact: {
    eyebrow: string;
    heading: string;
    description: string;
    customNote: string;
    methods: Array<{ id: string; label: string; value: string; href: string }>;
    actions: Array<ResolvedProfessionalAction>;
  };
};

export function buildRepo2SiteSectionModels(
  portfolio: PublicPortfolioData,
  layoutModel = buildRepo2SitePublicLayoutModel(portfolio),
): Repo2SiteSectionModels {
  const profileSummary =
    layoutModel.profileSummary ||
    portfolio.professional.summary ||
    portfolio.about.description.value;

  const heroActions = (layoutModel.heroActions.length > 0
    ? layoutModel.heroActions
    : portfolio.professional.actions.filter((action) => action.id === "github")
  ).slice(0, 4);

  return {
    hero: {
      name: portfolio.hero.name,
      profileLabel: portfolio.profile?.username ? `@${portfolio.profile.username}` : "@username",
      imageUrl: portfolio.hero.imageUrl,
      headline: {
        value: portfolio.hero.headline.value,
        source: portfolio.hero.headline.source,
      },
      intro: {
        value: portfolio.hero.subheadline.value,
        source: portfolio.hero.subheadline.source,
      },
      summary: profileSummary,
      actions: heroActions.map((action, index) => ({
        id: action.id,
        label: action.label,
        href: action.href,
        primary: index === 0,
      })),
      stackItems: layoutModel.orderedHeroStackItems,
      highlightItems: layoutModel.heroHighlightItems,
    },
    about: {
      eyebrow: "About",
      heading: portfolio.about.title.value || "About Me",
      description: portfolio.about.description.value,
      profileDetails: [
        layoutModel.profileCompany ? { label: "Company", value: layoutModel.profileCompany } : null,
        layoutModel.profileLocation ? { label: "Location", value: layoutModel.profileLocation } : null,
      ].filter(Boolean) as Array<{ label: string; value: string }>,
    },
    professional: {
      eyebrow: portfolio.professional.title || "Professional",
      heading: "Professional Snapshot",
      summary: portfolio.professional.summary,
      chips: [
        portfolio.professional.company,
        portfolio.professional.location,
        portfolio.professional.availability,
      ].filter(Boolean),
    },
    projects: {
      eyebrow: "Projects",
      heading: "Selected Work",
      description:
        "Drag project cards to change the order, or use Make Featured to move a project into the spotlight.",
      layoutMode: portfolio.appearance.projectsLayout,
      overflowSize: portfolio.appearance.projectsOverflowSize,
      featuredProject: layoutModel.featuredProject,
      secondaryProjects: layoutModel.secondaryRepositories,
      featuredBadgeLabel: "Featured",
      exploreHref: "#projects",
      secondaryColumnCount: 2,
    },
    links: {
      eyebrow: portfolio.linksSection.title.value || "Links",
      heading: "Professional links",
      description: portfolio.linksSection.description.value,
      items: layoutModel.visibleLinkItems.map(({ id, link }) => ({
        id,
        label: link.label,
        href: link.href,
      })),
    },
    contact: {
      eyebrow: portfolio.contact.title.value || "Contact",
      heading: "Get in touch",
      description: portfolio.contact.description.value,
      customNote: portfolio.contact.customText,
      methods: layoutModel.visibleContactMethods,
      actions: layoutModel.visibleActionButtons,
    },
  };
}
