import type { CSSProperties } from "react";
import { orderCanvasChildIds } from "@/lib/portfolio";
import type { SharedPortfolioRecord } from "@/lib/share-store";
import { getSiteOrigin } from "@/lib/site-url";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function toCanvasKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function getSectionWidthRatio(widthRatio: number | undefined, width: string | undefined, isFullWidth: boolean) {
  if (isFullWidth) {
    return 1;
  }

  if (typeof widthRatio === "number" && Number.isFinite(widthRatio)) {
    return Math.min(1, Math.max(0.28, widthRatio));
  }

  switch (width) {
    case "half":
      return 0.5;
    case "third":
      return 1 / 3;
    case "two-thirds":
      return 2 / 3;
    case "full":
    default:
      return 1;
  }
}

function buildPublicThemeStyles(record: SharedPortfolioRecord) {
  const { portfolio } = record;
  const { palette } = portfolio.theme;
  const isDarkMode = portfolio.appearance.colorMode === "dark";

  return {
    page: {
      background: isDarkMode
        ? `radial-gradient(circle at top right, ${palette.accentSoft}, transparent 26%), linear-gradient(160deg, #09111f, #0f172a)`
        : `radial-gradient(circle at top right, ${palette.pageAccent}, transparent 26%), ${palette.page}`,
      color: isDarkMode ? "#e5eefb" : palette.text,
    } satisfies CSSProperties,
    shell: {
      backgroundColor: isDarkMode ? "rgba(11, 18, 32, 0.9)" : "rgba(255,255,255,0.9)",
      borderColor: isDarkMode ? palette.border : palette.border,
      color: isDarkMode ? "#e5eefb" : palette.text,
      boxShadow: isDarkMode
        ? "0 30px 90px -44px rgba(2, 6, 23, 0.8)"
        : "0 30px 90px -48px rgba(15, 23, 42, 0.34)",
    } satisfies CSSProperties,
    surface: {
      backgroundColor: isDarkMode ? "rgba(14, 23, 39, 0.92)" : palette.surfaceStrong,
      borderColor: isDarkMode ? palette.border : palette.border,
      color: isDarkMode ? "#e5eefb" : palette.text,
    } satisfies CSSProperties,
    muted: {
      color: isDarkMode ? "#93a4bf" : palette.muted,
    } satisfies CSSProperties,
    accent: {
      backgroundColor: palette.accent,
      color: "#ffffff",
    } satisfies CSSProperties,
    chip: {
      backgroundColor: isDarkMode ? palette.accentSoft : palette.chip,
      borderColor: isDarkMode ? "rgba(148, 163, 184, 0.16)" : palette.border,
      color: isDarkMode ? "#eff6ff" : palette.accent,
    } satisfies CSSProperties,
  };
}

export function Repo2SitePublicPage({ record }: { record: SharedPortfolioRecord }) {
  const { portfolio } = record;
  const themeStyles = buildPublicThemeStyles(record);
  const visibleSections = portfolio.layout.components.filter((component) => component.visible);
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
  const hiddenChildIds = new Set(portfolio.layout.hiddenComponentIds);
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
      ? { id: "contact-method:email", value: portfolio.contact.email, href: portfolio.contact.emailHref }
      : null,
    portfolio.contact.phone && portfolio.contact.phoneHref
      ? { id: "contact-method:phone", value: portfolio.contact.phone, href: portfolio.contact.phoneHref }
      : null,
  ].filter(Boolean) as Array<{ id: string; value: string; href: string }>;
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

  const sectionMap = {
    hero: (
      <section
        key="hero"
        className="grid gap-6 rounded-[2rem] border px-6 py-7 sm:px-8 sm:py-9 lg:grid-cols-[1.15fr_0.85fr]"
        style={themeStyles.surface}
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={themeStyles.chip}
            >
              Public portfolio
            </span>
            {record.viewCount > 0 ? (
              <span
                className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
                style={themeStyles.chip}
              >
                {record.viewCount} views
              </span>
            ) : null}
            <span
              className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={themeStyles.chip}
            >
              Updated {formatDate(record.updatedAt)}
            </span>
          </div>
          {orderedHeroLeftIds.map((componentId) => {
            if (componentId === "hero:name") {
              return (
                <div key={componentId} className="space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em]" style={themeStyles.muted}>
                    {portfolio.hero.name}
                  </p>
                </div>
              );
            }

            if (componentId === "hero:title") {
              return (
                <h1 key={componentId} className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
                  {portfolio.hero.headline.value}
                </h1>
              );
            }

            if (componentId === "hero:intro") {
              return (
                <p key={componentId} className="max-w-3xl text-base leading-7 sm:text-lg" style={themeStyles.muted}>
                  {portfolio.hero.subheadline.value}
                </p>
              );
            }

            if (componentId === "hero:actions") {
              return (
                <div key={componentId} className="flex flex-wrap gap-3">
                  {visibleActionButtons.slice(0, 4).map((action) => (
                    <a
                      key={action.id}
                      href={action.href}
                      target={action.href.startsWith("mailto:") ? undefined : "_blank"}
                      rel={action.href.startsWith("mailto:") ? undefined : "noreferrer"}
                      className="rounded-full px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                      style={action.id === "github" ? themeStyles.surface : themeStyles.accent}
                    >
                      {action.label}
                    </a>
                  ))}
                </div>
              );
            }

            return null;
          })}
          <p className="max-w-3xl text-sm leading-6" style={themeStyles.muted}>
            {profileSummary}
          </p>
          {visibleHeroStack && orderedHeroStackItems.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {orderedHeroStackItems.map((tech) => (
              <span
                key={tech}
                className="rounded-full border px-3 py-1 text-xs font-medium"
                style={themeStyles.chip}
              >
                {tech}
              </span>
            ))}
          </div>
          ) : null}
        </div>
        <div className="space-y-4">
          {orderedHeroLeftIds.includes("hero:image") && portfolio.hero.imageUrl ? (
            <div className="overflow-hidden rounded-[1.75rem] border" style={themeStyles.surface}>
              <img
                src={portfolio.hero.imageUrl}
                alt={`${portfolio.hero.name} profile visual`}
                className="aspect-[4/4.4] w-full object-cover"
              />
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              profileCompany ? { label: "Company", value: profileCompany } : null,
              profileLocation ? { label: "Location", value: profileLocation } : null,
              featuredProject ? { label: "Featured project", value: featuredProject.name } : null,
            ]
              .filter(Boolean)
              .map((item) => (
                <div
                  key={item?.label}
                  className="rounded-[1.35rem] border px-4 py-3"
                  style={themeStyles.surface}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={themeStyles.muted}>
                    {item?.label}
                  </p>
                  <p className="mt-1 text-sm font-medium">{item?.value}</p>
                </div>
              ))}
          </div>
        </div>
      </section>
    ),
    about: portfolio.about.description.value.trim() ? (
      <section key="about" className="grid gap-4 rounded-[1.8rem] border p-6 sm:p-7" style={themeStyles.surface}>
        {orderedAboutIds.map((componentId) => {
          if (componentId === "about:description") {
            return (
              <div key={componentId} className="grid gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={themeStyles.muted}>
                  About Me
                </p>
                <p className="max-w-4xl text-base leading-7 sm:text-lg">
                  {portfolio.about.description.value}
                </p>
              </div>
            );
          }

          return null;
        })}
      </section>
    ) : null,
    professional:
      portfolio.professional.summary.trim() ||
      portfolio.professional.availability.trim() ||
      portfolio.professional.company.trim() ||
      portfolio.professional.location.trim() ? (
        <section
          key="professional"
          className="grid gap-5 rounded-[1.8rem] border p-6 sm:p-7 lg:grid-cols-[0.9fr_1.1fr]"
          style={themeStyles.surface}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={themeStyles.muted}>
              {portfolio.professional.title}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Professional snapshot</h2>
          </div>
          <div className="space-y-4">
            {portfolio.professional.summary.trim() ? (
              <p className="text-base leading-7">{portfolio.professional.summary}</p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              {portfolio.professional.company.trim() ? (
                <span className="rounded-full border px-3 py-1 text-sm" style={themeStyles.chip}>
                  {portfolio.professional.company}
                </span>
              ) : null}
              {portfolio.professional.location.trim() ? (
                <span className="rounded-full border px-3 py-1 text-sm" style={themeStyles.chip}>
                  {portfolio.professional.location}
                </span>
              ) : null}
              {portfolio.professional.availability.trim() ? (
                <span className="rounded-full border px-3 py-1 text-sm" style={themeStyles.chip}>
                  {portfolio.professional.availability}
                </span>
              ) : null}
            </div>
          </div>
        </section>
      ) : null,
    projects: portfolio.repositories.length > 0 ? (
      <section key="projects" className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={themeStyles.muted}>
            Projects
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Selected work</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {orderedRepositories.map((repository, index) => (
            <article
              key={repository.name}
              className={`overflow-hidden rounded-[1.8rem] border ${index === 0 ? "lg:col-span-2" : ""}`}
              style={themeStyles.surface}
            >
              {repository.resolvedImage ? (
                <img
                  src={repository.resolvedImage.url}
                  alt={repository.resolvedImage.alt}
                  className={`w-full object-cover ${index === 0 ? "aspect-[16/7]" : "aspect-[16/9]"}`}
                />
              ) : null}
              <div className="space-y-4 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight">{repository.name}</h3>
                    {repository.language ? (
                      <p className="mt-1 text-sm" style={themeStyles.muted}>
                        {repository.language}
                      </p>
                    ) : null}
                  </div>
                  <a
                    href={repository.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full px-3.5 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                    style={themeStyles.accent}
                  >
                    View project
                  </a>
                </div>
                <p className="text-sm leading-7 sm:text-base">{repository.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    ) : null,
    links: portfolio.linksSection.links.length > 0 ? (
      <section
        key="links"
        className="grid gap-4 rounded-[1.8rem] border p-6 sm:p-7 lg:grid-cols-[0.85fr_1.15fr]"
        style={themeStyles.surface}
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={themeStyles.muted}>
            {portfolio.linksSection.title.value || "Links"}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Professional links</h2>
          {portfolio.linksSection.description.value.trim() ? (
            <p className="text-sm leading-6" style={themeStyles.muted}>
              {portfolio.linksSection.description.value}
            </p>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleLinkItems.map(({ id, link }) => (
            <a
              key={id}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-[1.2rem] border px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5"
              style={themeStyles.surface}
            >
              {link.label}
            </a>
          ))}
        </div>
      </section>
    ) : null,
    contact:
      portfolio.contact.description.value.trim() ||
      portfolio.contact.customText.trim() ||
      portfolio.contact.email.trim() ||
      portfolio.contact.phone.trim() ? (
        <section
          key="contact"
          className="grid gap-4 rounded-[1.8rem] border p-6 sm:p-7 lg:grid-cols-[0.85fr_1.15fr]"
          style={themeStyles.surface}
        >
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={themeStyles.muted}>
              {portfolio.contact.title.value || "Contact"}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">Get in touch</h2>
            <p className="text-sm leading-6" style={themeStyles.muted}>
              {portfolio.contact.customText || portfolio.contact.description.value}
            </p>
          </div>
          <div className="grid gap-3">
            {visibleContactMethods.map((method) => (
              <a key={method.id} href={method.href} className="rounded-[1.2rem] border px-4 py-3 text-sm font-medium" style={themeStyles.surface}>
                {method.value}
              </a>
            ))}
            {visibleActionButtons.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {visibleActionButtons.map((action) => (
                  <a
                    key={`contact-${action.id}`}
                    href={action.href}
                    target={action.href.startsWith("mailto:") ? undefined : "_blank"}
                    rel={action.href.startsWith("mailto:") ? undefined : "noreferrer"}
                    className="rounded-full px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                    style={action.id === "github" ? themeStyles.surface : themeStyles.accent}
                  >
                    {action.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null,
  } as const;

  const customSectionMap = Object.fromEntries(
    portfolio.customSections.map((section) => [
      section.id,
      <section key={section.id} className="grid gap-4 rounded-[1.8rem] border p-6 sm:p-7" style={themeStyles.surface}>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={themeStyles.muted}>
            Custom section
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">{section.title.value || "Custom Section"}</h2>
          {section.description.value.trim() ? (
            <p className="text-sm leading-7 sm:text-base">{section.description.value}</p>
          ) : null}
        </div>
      </section>,
    ]),
  );
  const sectionRows = visibleSections.reduce<Array<{ id: string; items: typeof visibleSections }>>((rows, component) => {
    const rowId =
      portfolio.appearance.sectionLayout === "stacked" || component.type === "projects"
        ? component.id
        : component.rowId || component.id;
    const row = rows.find((item) => item.id === rowId);

    if (row) {
      row.items.push(component);
    } else {
      rows.push({ id: rowId, items: [component] as typeof visibleSections });
    }

    return rows;
  }, []);

  return (
    <main className="min-h-screen px-3 py-4 sm:px-5 sm:py-6" style={themeStyles.page}>
      <div className="mx-auto flex w-full max-w-[72rem] flex-col gap-5">
        <div className="rounded-[2rem] border p-3 sm:p-4" style={themeStyles.shell}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 pb-4 sm:px-5" style={{ borderColor: themeStyles.surface.borderColor }}>
            <div>
              <p className="text-sm font-semibold tracking-tight">Repo2Site Portfolio</p>
              <p className="mt-1 text-xs leading-5" style={themeStyles.muted}>
                Shared public portfolio for {portfolio.hero.name}
              </p>
            </div>
            <a href={portfolio.hero.profileLink} target="_blank" rel="noreferrer" className="rounded-full px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5" style={themeStyles.accent}>
              {portfolio.hero.ctaLabel}
            </a>
          </div>

          <div className="space-y-5 px-1 py-4 sm:px-2">
            {sectionRows.map((row) => (
              <div
                key={row.id}
                className={`grid gap-4 ${
                  portfolio.appearance.sectionLayout === "stacked" || row.items.length === 1
                    ? "grid-cols-1"
                    : "grid-cols-1 lg:flex lg:items-start"
                }`}
              >
                {row.items.map((component) => {
                  const widthRatio = getSectionWidthRatio(
                    component.widthRatio,
                    component.width,
                    portfolio.appearance.sectionLayout === "stacked" || component.type === "projects",
                  );
                  const markup =
                    component.type === "custom"
                      ? customSectionMap[component.id]
                      : sectionMap[component.type as keyof typeof sectionMap];

                  if (!markup) {
                    return null;
                  }

                  return (
                    <div
                      key={component.id}
                      className="w-full lg:shrink-0 lg:basis-[var(--section-width)] lg:max-w-[var(--section-width)]"
                      style={{ ["--section-width" as string]: `${Math.round(widthRatio * 100)}%` } as CSSProperties}
                    >
                      {markup}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <footer
            className="mt-2 grid gap-4 rounded-[1.8rem] border px-5 py-5 sm:grid-cols-[1fr_auto]"
            style={themeStyles.surface}
          >
            <div>
              <p className="text-sm font-semibold tracking-tight">Built with Repo2Site</p>
              <p className="mt-1 text-sm leading-6" style={themeStyles.muted}>
                Want your own shareable portfolio link? Start with your GitHub profile, review the draft, and publish a public page in minutes.
              </p>
            </div>
            <a
              href={`${getSiteOrigin()}/builder`}
              className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
              style={themeStyles.accent}
            >
              Create your own portfolio
            </a>
          </footer>
        </div>
      </div>
    </main>
  );
}
