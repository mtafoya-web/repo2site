import type { FinalPortfolio } from "@/lib/portfolio";
import { orderCanvasChildIds } from "@/lib/portfolio";
import { resolvePortfolioSectionRows } from "@/lib/repo2site-layout";
import type { SharedPortfolioRecord } from "@/lib/share-store";

export type PublicPortfolioData = SharedPortfolioRecord["portfolio"] | FinalPortfolio;

function toCanvasKey(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

function hasText(value?: string | null) {
  return Boolean(value && value.trim());
}

export function buildRepo2SitePublicLayoutModel(portfolio: PublicPortfolioData) {
  const visibleSections = portfolio.layout.components.filter((component) => component.visible);
  const sectionRows = resolvePortfolioSectionRows(
    visibleSections,
    portfolio.appearance.sectionLayout,
  ).rows;
  const hiddenSections = new Set(
    portfolio.layout.components
      .filter((component) => !component.visible && component.type !== "custom")
      .map((component) => component.type),
  );
  const hiddenChildIds = new Set(portfolio.layout.hiddenComponentIds);
  const featuredProject = portfolio.repositories[0] ?? null;
  const profileCompany = portfolio.professional.company || portfolio.profile?.company || "";
  const profileLocation = portfolio.professional.location || portfolio.profile?.location || "";
  const profileSummary =
    portfolio.professional.summary ||
    portfolio.profile?.bio ||
    portfolio.summary ||
    portfolio.about.description.value;
  const actionButtons = portfolio.professional.actions.filter((action) =>
    ["resume", "coverLetter", "linkedIn", "handshake", "portfolio", "github"].includes(action.id),
  );
  const heroActions = actionButtons.slice(0, 4);

  const orderedHeroLeftIds = orderCanvasChildIds(
    ["hero:image", "hero:name", "hero:title", "hero:intro", "hero:actions"],
    portfolio.layout.componentOrder["hero:left"],
  ).filter((id) => !hiddenChildIds.has(id));

  const orderedAboutIds = orderCanvasChildIds(
    ["about:description"],
    portfolio.layout.componentOrder.about,
  ).filter((id) => !hiddenChildIds.has(id));

  const visibleHeroStack = !hiddenChildIds.has("hero:stack");
  const orderedHeroStackItems = orderCanvasChildIds(
    portfolio.techStack.slice(0, 8).map((tech) => `hero-stack:${toCanvasKey(tech)}`),
    portfolio.layout.componentOrder["hero:stack:items"],
  )
    .filter((id) => !hiddenChildIds.has(id))
    .map((id) => portfolio.techStack.slice(0, 8).find((tech) => `hero-stack:${toCanvasKey(tech)}` === id))
    .filter(Boolean) as string[];

  const visibleActionButtons = orderCanvasChildIds(
    actionButtons.map((action) => `contact-action:${action.id}`),
    portfolio.layout.componentOrder["contact:actions"],
  )
    .filter((id) => !hiddenChildIds.has(id))
    .map((id) => actionButtons.find((action) => `contact-action:${action.id}` === id))
    .filter(Boolean) as typeof actionButtons;

  const contactMethodItems = [
    portfolio.contact.email && portfolio.contact.emailHref
      ? { id: "contact-method:email", label: "Email", value: portfolio.contact.email, href: portfolio.contact.emailHref }
      : null,
    portfolio.contact.phone && portfolio.contact.phoneHref
      ? { id: "contact-method:phone", label: "Phone", value: portfolio.contact.phone, href: portfolio.contact.phoneHref }
      : null,
  ].filter(Boolean) as Array<{ id: string; label: string; value: string; href: string }>;

  const visibleContactMethods = orderCanvasChildIds(
    contactMethodItems.map((item) => item.id),
    portfolio.layout.componentOrder["contact:methods"],
  )
    .filter((id) => !hiddenChildIds.has(id))
    .map((id) => contactMethodItems.find((item) => item.id === id))
    .filter(Boolean) as typeof contactMethodItems;

  const linkItems = portfolio.linksSection.links.map((link, index) => ({
    id: `link-card:${toCanvasKey(link.label)}-${index}`,
    link,
  }));

  const visibleLinkItems = orderCanvasChildIds(
    linkItems.map((item) => item.id),
    portfolio.layout.componentOrder["links:cards"],
  )
    .filter((id) => !hiddenChildIds.has(id))
    .map((id) => linkItems.find((item) => item.id === id))
    .filter(Boolean) as typeof linkItems;

  const orderedRepositories = [
    portfolio.repositories[0],
    ...orderCanvasChildIds(
      portfolio.repositories.slice(1).map((repository) => `project-card:${toCanvasKey(repository.name)}`),
      portfolio.layout.componentOrder["projects:grid"],
    )
      .filter((id) => !hiddenChildIds.has(id))
      .map((id) =>
        portfolio.repositories.slice(1).find((repository) => `project-card:${toCanvasKey(repository.name)}` === id),
      )
      .filter(Boolean),
  ].filter(Boolean) as typeof portfolio.repositories;

  const secondaryRepositories = orderedRepositories.slice(1);
  const isExpandedOverflow = portfolio.appearance.projectsOverflowSize === "expanded";

  const heroHighlightItems = [
    profileCompany ? { label: "Company", value: profileCompany } : null,
    profileLocation ? { label: "Location", value: profileLocation } : null,
    featuredProject ? { label: "Featured project", value: featuredProject.name } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const showAbout =
    !hiddenSections.has("about") &&
    (hasText(portfolio.about.title.value) || hasText(portfolio.about.description.value));
  const showProfileDetails = Boolean(profileCompany || profileLocation);
  const showContact =
    !hiddenSections.has("contact") &&
    (
      hasText(portfolio.contact.title.value) ||
      hasText(portfolio.contact.description.value) ||
      hasText(portfolio.contact.customText) ||
      hasText(portfolio.contact.email) ||
      visibleActionButtons.length > 0
    );
  const showLinks = !hiddenSections.has("links") && visibleLinkItems.length > 0;
  const showProjects = !hiddenSections.has("projects") && portfolio.repositories.length > 0;
  const showHero = !hiddenSections.has("hero");
  const showProfessional =
    !hiddenSections.has("professional") &&
    (
      hasText(portfolio.professional.title) ||
      hasText(portfolio.professional.summary) ||
      hasText(portfolio.professional.company) ||
      hasText(portfolio.professional.location) ||
      hasText(portfolio.professional.availability)
    );

  return {
    visibleSections,
    sectionRows,
    hiddenSections,
    hiddenChildIds,
    featuredProject,
    orderedRepositories,
    secondaryRepositories,
    profileCompany,
    profileLocation,
    profileSummary,
    actionButtons,
    heroActions,
    orderedHeroLeftIds,
    orderedAboutIds,
    visibleHeroStack,
    orderedHeroStackItems,
    visibleActionButtons,
    contactMethodItems,
    visibleContactMethods,
    linkItems,
    visibleLinkItems,
    heroHighlightItems,
    isExpandedOverflow,
    shouldUseThreeColumnOverflow: false,
    showAbout,
    showProfileDetails,
    showContact,
    showLinks,
    showProjects,
    showHero,
    showProfessional,
  };
}
