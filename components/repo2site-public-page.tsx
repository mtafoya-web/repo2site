import type { CSSProperties } from "react";
import { getCanvasSectionWidthRatio } from "@/lib/portfolio";
import { buildRepo2SitePublicLayoutModel, type PublicPortfolioData } from "@/lib/repo2site-public-layout";
import { buildRepo2SitePublicTheme } from "@/lib/repo2site-public-theme";
import { buildRepo2SiteSectionModels } from "@/lib/repo2site-section-models";
import type { SharedPortfolioRecord } from "@/lib/share-store";
import { getSiteOrigin } from "@/lib/site-url";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function buildPublicThemeStyles(portfolio: PublicPortfolioData) {
  const sharedTheme = buildRepo2SitePublicTheme(portfolio);

  return {
    page: {
      background: sharedTheme.pageBackground,
      color: sharedTheme.pageColor,
    } satisfies CSSProperties,
    shell: {
      background: sharedTheme.shellBackground,
      borderColor: sharedTheme.shellBorder,
      color: sharedTheme.surfaceColor,
      boxShadow: sharedTheme.shellShadow,
    } satisfies CSSProperties,
    surface: {
      background: sharedTheme.surfaceBackground,
      borderColor: sharedTheme.surfaceBorder,
      color: sharedTheme.surfaceColor,
    } satisfies CSSProperties,
    muted: {
      color: sharedTheme.mutedColor,
    } satisfies CSSProperties,
    accent: {
      backgroundColor: sharedTheme.accentBackground,
      color: sharedTheme.accentColor,
    } satisfies CSSProperties,
    chip: {
      backgroundColor: sharedTheme.chipBackground,
      borderColor: sharedTheme.chipBorder,
      color: sharedTheme.chipColor,
    } satisfies CSSProperties,
  };
}

export function Repo2SitePublicPortfolio({
  portfolio,
  updatedAt,
  viewCount = 0,
  showShell = true,
  showRepo2SiteCta = true,
}: {
  portfolio: PublicPortfolioData;
  updatedAt?: string;
  viewCount?: number;
  showShell?: boolean;
  showRepo2SiteCta?: boolean;
}) {
  const themeStyles = buildPublicThemeStyles(portfolio);
  const layoutModel = buildRepo2SitePublicLayoutModel(portfolio);
  const sectionModels = buildRepo2SiteSectionModels(portfolio, layoutModel);
  const { sectionRows, orderedHeroLeftIds, orderedAboutIds, visibleSections } = layoutModel;
  const { hero, about, professional, projects, links, contact } = sectionModels;

  const renderProjectCard = (
    repository: (typeof projects.secondaryProjects)[number] | NonNullable<typeof projects.featuredProject>,
    options?: { compactImage?: boolean; featured?: boolean },
  ) => {
    const compactImage = options?.compactImage ?? true;
    const featured = options?.featured ?? false;

    return (
      <article
        key={repository.name}
        className="flex h-full flex-col overflow-hidden rounded-[1.8rem] border"
        style={themeStyles.surface}
      >
        {repository.resolvedImage ? (
          <img
            src={repository.resolvedImage.url}
            alt={repository.resolvedImage.alt}
            className={`${compactImage ? "aspect-[16/9]" : "aspect-[4/3] xl:aspect-[16/10]"} w-full object-cover`}
          />
        ) : null}
        <div className="flex h-full flex-col space-y-4 p-6">
          <div className="h-1 w-14 rounded-full" style={{ backgroundColor: themeStyles.accent.backgroundColor }} />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {featured ? (
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={themeStyles.chip}
                  >
                    {projects.featuredBadgeLabel}
                  </span>
                </div>
              ) : null}
              <h3 className={`${featured ? "text-3xl sm:text-4xl" : "text-xl"} font-semibold tracking-tight`}>
                {repository.name}
              </h3>
            </div>
          </div>
          <p className={`flex-1 ${featured ? "text-base leading-8 sm:text-lg" : "text-sm leading-7 sm:text-base"}`}>
            {repository.description}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {repository.language ? (
              <span className="rounded-full border px-3 py-1 text-xs font-medium" style={themeStyles.chip}>
                {repository.language}
              </span>
            ) : null}
            <a
              href={repository.href}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold uppercase tracking-[0.16em]"
              style={{ color: themeStyles.accent.backgroundColor }}
            >
              Open Project
            </a>
          </div>
        </div>
      </article>
    );
  };

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
            {viewCount > 0 ? (
              <span
                className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
                style={themeStyles.chip}
              >
                {viewCount} views
              </span>
            ) : null}
            {updatedAt ? (
              <span
                className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
                style={themeStyles.chip}
              >
                Updated {formatDate(updatedAt)}
              </span>
            ) : null}
          </div>
          {orderedHeroLeftIds.map((componentId) => {
            if (componentId === "hero:name") {
              return (
                <div key={componentId} className="space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em]" style={themeStyles.muted}>
                    {hero.name}
                  </p>
                </div>
              );
            }

            if (componentId === "hero:title") {
              return (
                <h1 key={componentId} className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
                  {hero.headline.value}
                </h1>
              );
            }

            if (componentId === "hero:intro") {
              return (
                <p key={componentId} className="max-w-3xl text-base leading-7 sm:text-lg" style={themeStyles.muted}>
                  {hero.intro.value}
                </p>
              );
            }

            if (componentId === "hero:actions") {
              return (
                <div key={componentId} className="flex flex-wrap gap-3">
                  {hero.actions.map((action) => (
                    <a
                      key={action.id}
                      href={action.href}
                      target={action.href.startsWith("mailto:") ? undefined : "_blank"}
                      rel={action.href.startsWith("mailto:") ? undefined : "noreferrer"}
                      className="rounded-full px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                      style={action.primary ? themeStyles.accent : themeStyles.surface}
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
            {hero.summary}
          </p>
          {layoutModel.visibleHeroStack && hero.stackItems.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {hero.stackItems.map((tech) => (
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
          {orderedHeroLeftIds.includes("hero:image") && hero.imageUrl ? (
            <div className="overflow-hidden rounded-[1.75rem] border" style={themeStyles.surface}>
              <img
                src={hero.imageUrl}
                alt={`${hero.name} profile visual`}
                className="aspect-[4/4.4] w-full object-cover"
              />
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {hero.highlightItems.map((item) => (
              <div
                key={item.label}
                className="rounded-[1.35rem] border px-4 py-3"
                style={themeStyles.surface}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={themeStyles.muted}>
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    about: about.description.trim() ? (
      <section key="about" className="grid gap-4 rounded-[1.8rem] border p-6 sm:p-7" style={themeStyles.surface}>
        {orderedAboutIds.map((componentId) => {
          if (componentId === "about:description") {
            return (
              <div key={componentId} className="grid gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={themeStyles.muted}>
                  {about.eyebrow}
                </p>
                <p className="max-w-4xl text-base leading-7 sm:text-lg">{about.description}</p>
              </div>
            );
          }

          return null;
        })}
      </section>
    ) : null,
    professional: professional.summary.trim() || professional.chips.length > 0 ? (
      <section
        key="professional"
        className="grid gap-5 rounded-[1.8rem] border p-6 sm:p-7 lg:grid-cols-[0.9fr_1.1fr]"
        style={themeStyles.surface}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={themeStyles.muted}>
            {professional.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{professional.heading}</h2>
        </div>
        <div className="space-y-4">
          {professional.summary.trim() ? (
            <p className="text-base leading-7">{professional.summary}</p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {professional.chips.map((chip) => (
              <span key={chip} className="rounded-full border px-3 py-1 text-sm" style={themeStyles.chip}>
                {chip}
              </span>
            ))}
          </div>
        </div>
      </section>
    ) : null,
    projects: portfolio.repositories.length > 0 ? (
      <section key="projects" className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={themeStyles.muted}>
            {projects.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{projects.heading}</h2>
        </div>
        <div className="space-y-4">
          {projects.featuredProject ? (
            projects.layoutMode === "hybrid" && projects.secondaryProjects.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(18rem,0.84fr)_minmax(24rem,1.16fr)] lg:items-start">
                {renderProjectCard(projects.featuredProject, { compactImage: false, featured: true })}
                <div className="grid gap-4 md:grid-cols-2 md:auto-rows-fr">
                  {projects.secondaryProjects.map((repository) => renderProjectCard(repository))}
                </div>
              </div>
            ) : (
              renderProjectCard(projects.featuredProject, { compactImage: false, featured: true })
            )
          ) : null}
          {projects.layoutMode === "side-by-side" && projects.secondaryProjects.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2 lg:auto-rows-fr">
              {projects.secondaryProjects.map((repository) => renderProjectCard(repository))}
            </div>
          ) : null}
          {projects.layoutMode === "stacked" && projects.secondaryProjects.length > 0 ? (
            <div className="grid gap-4">
              {projects.secondaryProjects.map((repository) => renderProjectCard(repository))}
            </div>
          ) : null}
        </div>
      </section>
    ) : null,
    links: links.items.length > 0 ? (
      <section
        key="links"
        className="grid gap-4 rounded-[1.8rem] border p-6 sm:p-7 lg:grid-cols-[0.85fr_1.15fr]"
        style={themeStyles.surface}
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={themeStyles.muted}>
            {links.eyebrow}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">{links.heading}</h2>
          {links.description.trim() ? (
            <p className="text-sm leading-6" style={themeStyles.muted}>
              {links.description}
            </p>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {links.items.map((link) => (
            <a
              key={link.id}
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
    contact: contact.description.trim() || contact.customNote.trim() || contact.methods.length > 0 ? (
      <section
        key="contact"
        className="grid gap-4 rounded-[1.8rem] border p-6 sm:p-7 lg:grid-cols-[0.85fr_1.15fr]"
        style={themeStyles.surface}
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={themeStyles.muted}>
            {contact.eyebrow}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">{contact.heading}</h2>
          <p className="text-sm leading-6" style={themeStyles.muted}>
            {contact.customNote || contact.description}
          </p>
        </div>
        <div className="grid gap-3">
          {contact.methods.map((method) => (
            <a
              key={method.id}
              href={method.href}
              className="rounded-[1.2rem] border px-4 py-3 text-sm font-medium"
              style={themeStyles.surface}
            >
              {method.value}
            </a>
          ))}
          {contact.actions.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {contact.actions.map((action) => (
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
        {(section.blocks ?? []).length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {(section.blocks ?? []).map((block) => (
              <div
                key={block.id}
                className={`rounded-[1.2rem] border p-4 ${block.width === "full" ? "md:col-span-2" : ""}`}
                style={themeStyles.surface}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={themeStyles.muted}>
                  {block.label || (block.type === "image" ? "Image" : "Text")}
                </p>
                {block.title ? <h3 className="mt-2 text-lg font-semibold tracking-tight">{block.title}</h3> : null}
                {block.type === "image" ? (
                  <div className="mt-4 space-y-3">
                    {block.imageUrl ? (
                      <img
                        src={block.imageUrl}
                        alt={block.title || block.label || "Custom section image"}
                        className="w-full rounded-[1rem] border object-cover"
                        style={{
                          borderColor: themeStyles.surface.borderColor,
                          maxHeight: block.width === "full" ? "24rem" : "18rem",
                        }}
                      />
                    ) : null}
                    {block.text ? <p className="text-sm leading-7 sm:text-base">{block.text}</p> : null}
                  </div>
                ) : block.text ? (
                  <p className="mt-4 text-sm leading-7 sm:text-base">{block.text}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>,
    ]),
  );

  return (
    <main className="min-h-screen px-3 py-4 sm:px-5 sm:py-6" style={themeStyles.page}>
      <div className="mx-auto flex w-full max-w-[72rem] flex-col gap-5">
        <div className={`${showShell ? "rounded-[2rem] border p-3 sm:p-4" : ""}`} style={showShell ? themeStyles.shell : undefined}>
          {showShell ? (
            <div
              className="flex flex-wrap items-center justify-between gap-3 border-b px-4 pb-4 sm:px-5"
              style={{ borderColor: themeStyles.surface.borderColor }}
            >
              <div>
                <p className="text-sm font-semibold tracking-tight">Repo2Site Portfolio</p>
                <p className="mt-1 text-xs leading-5" style={themeStyles.muted}>
                  Shared public portfolio for {portfolio.hero.name}
                </p>
              </div>
              <a
                href={portfolio.hero.profileLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-full px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                style={themeStyles.accent}
              >
                {portfolio.hero.ctaLabel}
              </a>
            </div>
          ) : null}

          <div className={`space-y-5 ${showShell ? "px-1 py-4 sm:px-2" : ""}`}>
            {sectionRows.map((row) => (
              <div
                key={row.id}
                className={`grid gap-4 ${
                  !row.isFlexible || row.items.length === 1 ? "grid-cols-1" : "grid-cols-1 lg:grid lg:items-start"
                }`}
                style={
                  row.isFlexible && row.items.length === 2
                    ? ({
                        gridTemplateColumns: `minmax(22rem, ${Math.max(1, Math.round(getCanvasSectionWidthRatio(row.items[0]) * 10))}fr) minmax(22rem, ${Math.max(1, Math.round(getCanvasSectionWidthRatio(row.items[1]) * 10))}fr)`,
                      } as CSSProperties)
                    : undefined
                }
              >
                {row.items.map((component) => {
                  const widthRatio =
                    portfolio.appearance.sectionLayout === "stacked" ? 1 : getCanvasSectionWidthRatio(component);
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
                      className={`w-full ${
                        row.isFlexible && row.items.length === 2
                          ? "lg:min-w-[22rem]"
                          : "lg:shrink-0 lg:basis-[var(--section-width)] lg:max-w-[var(--section-width)]"
                      }`}
                      style={
                        row.isFlexible && row.items.length === 2
                          ? undefined
                          : ({ ["--section-width" as string]: `${Math.round(widthRatio * 100)}%` } as CSSProperties)
                      }
                    >
                      {markup}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {showRepo2SiteCta ? (
            <footer
              className="mt-2 grid gap-4 rounded-[1.8rem] border px-5 py-5 sm:grid-cols-[1fr_auto]"
              style={themeStyles.surface}
            >
              <div>
                <p className="text-sm font-semibold tracking-tight">Built with Repo2Site</p>
                <p className="mt-1 text-sm leading-6" style={themeStyles.muted}>
                  Start with GitHub, edit the live canvas, customize the look, then publish a public page or export a static site.
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
          ) : null}
        </div>
      </div>
    </main>
  );
}

export function Repo2SitePublicPage({ record }: { record: SharedPortfolioRecord }) {
  return (
    <Repo2SitePublicPortfolio
      portfolio={record.portfolio}
      updatedAt={record.updatedAt}
      viewCount={record.viewCount}
      showShell
      showRepo2SiteCta
    />
  );
}
