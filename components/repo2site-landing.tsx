"use client";

import { useAppTheme } from "@/components/app-theme-provider";
import { buildAppThemeStyles } from "@/lib/app-theme";

const valueProps = [
  {
    title: "Generate from real work",
    description:
      "Turn public GitHub repositories, README context, and profile details into a portfolio draft instead of starting from a blank page.",
  },
  {
    title: "Edit the actual site",
    description:
      "Shape sections directly on the canvas, manage Selected Work, add custom projects, and tune layouts without leaving the builder.",
  },
  {
    title: "Control layout and style",
    description:
      "Switch between stacked and free-flow sections, resize rows, choose cleaner themes, and keep preview and export aligned.",
  },
  {
    title: "Share or export cleanly",
    description:
      "Publish a shareable public link, browse templates, or export a deployable static site when the portfolio is ready.",
  },
];

const howItWorks = [
  "Start with GitHub, then optionally add a resume or public links for stronger context.",
  "Review the generated draft in the live builder and reshape the page section by section.",
  "Tune layout, Selected Work, custom sections, and theme until the site feels like yours.",
  "Use AI suggestions only when helpful, then publish or export the final portfolio.",
];

const demoRows = [
  { label: "Builder canvas", value: "Edit sections, rows, projects, and custom blocks live" },
  { label: "Selected Work", value: "Feature projects, add your own, and control project layout" },
  { label: "Theme toolkit", value: "Use colorful presets or clean SaaS light and dark modes" },
  { label: "Ship options", value: "Publish a public link, use templates, or export a deployable ZIP" },
];

const featureTracks = [
  {
    title: "Live builder",
    description: "Directly edit sections, move rows around, manage Selected Work, and add custom sections with their own blocks.",
  },
  {
    title: "Layout controls",
    description: "Mix stacked and shared-row layouts, rebalance project presentation, and keep the page readable across devices.",
  },
  {
    title: "Publishing flow",
    description: "Use templates, publish a public share page, or export a static site that stays true to the preview.",
  },
];

export function Repo2SiteLanding() {
  const { renderTheme } = useAppTheme();
  const styles = buildAppThemeStyles(renderTheme);
  const isDarkTheme = renderTheme === "dark";

  return (
    <section
      className="relative overflow-hidden border-b"
      style={{
        ...styles.page,
        borderColor: isDarkTheme ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.16)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40 [background-size:64px_64px]"
        style={{
          backgroundImage: isDarkTheme
            ? "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)"
            : "linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)",
        }}
      />
      <div className="relative mx-auto flex w-full max-w-[112rem] flex-col gap-16 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border text-sm font-semibold shadow-[0_18px_48px_-30px_rgba(59,130,246,0.42)]" style={styles.strongSurface}>
              R2
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">Repo2Site</p>
              <p className="text-xs" style={styles.mutedText}>GitHub-first portfolio builder</p>
            </div>
          </div>
          <a
            href="/builder"
            className="motion-surface motion-surface-hover motion-press rounded-full border px-4 py-2 text-sm font-medium"
            style={styles.ghostButton}
          >
            Open builder
          </a>
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
          <div className="animate-fade-up">
            <p className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]" style={styles.chip}>
              Portfolio builder, editor, and exporter
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Turn GitHub work into a portfolio site you can actually shape, preview, share, and ship.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 sm:text-lg" style={styles.mutedText}>
              Repo2Site now goes far beyond a one-shot generator. It creates the starting draft from real repositories, then gives you a real builder for layout, projects, custom sections, themes, AI-assisted polish, public sharing, and export.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/builder"
                className="motion-surface motion-surface-hover motion-press rounded-full px-5 py-3 text-sm font-semibold"
                style={styles.accentButton}
              >
                Start building
              </a>
              <a
                href="#demo-preview"
                className="motion-surface motion-surface-hover motion-press rounded-full border px-5 py-3 text-sm font-semibold"
                style={styles.ghostButton}
              >
                See the workflow
              </a>
            </div>
          </div>

          <div className="animate-fade-up animation-delay-150">
            <div className="rounded-[2rem] border p-5 backdrop-blur-xl" style={styles.navSurface}>
              <div className="rounded-[1.6rem] border p-5" style={styles.surface}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={styles.mutedText}>
                      What the product is now
                    </p>
                    <p className="mt-1 text-lg font-semibold">Builder-centered workflow</p>
                  </div>
                  <span className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]" style={styles.chip}>
                    Real editing controls
                  </span>
                </div>
                <div className="mt-5 grid gap-3">
                  {demoRows.map((row, index) => (
                    <div
                      key={row.label}
                      className="motion-surface motion-surface-hover group rounded-[1.2rem] border px-4 py-3"
                      style={{
                        ...styles.subtleSurface,
                        animationDelay: `${index * 90}ms`,
                      }}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={styles.mutedText}>{row.label}</p>
                      <p className="mt-1 text-sm font-medium">{row.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border px-3 py-1 text-xs font-medium" style={styles.chip}>
                    GitHub import
                  </span>
                  <span className="rounded-full border px-3 py-1 text-xs font-medium" style={styles.chip}>
                    Custom sections
                  </span>
                  <span className="rounded-full border px-3 py-1 text-xs font-medium" style={styles.chip}>
                    Public share + export
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {valueProps.map((item, index) => (
            <article
              key={item.title}
              className="motion-surface motion-surface-hover animate-fade-up rounded-[1.6rem] border p-5 backdrop-blur-md"
              style={{
                ...styles.surface,
                animationDelay: `${index * 90}ms`,
              }}
            >
              <div className="mb-4 h-10 w-10 rounded-2xl border" style={styles.heroAccent} />
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-7" style={styles.mutedText}>{item.description}</p>
            </article>
          ))}
        </div>

        <div id="demo-preview" className="grid gap-10 rounded-[2rem] border p-6 backdrop-blur-md lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]" style={styles.surface}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={styles.mutedText}>How it works</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              A builder workflow that stays useful after the first draft.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7" style={styles.mutedText}>
              The draft is only the starting point. The real value now is the editing system around it: layout, projects, themes, custom content, AI, sharing, and export.
            </p>
          </div>
          <div className="grid gap-3">
            {howItWorks.map((step, index) => (
              <div
                key={step}
                className="motion-surface flex gap-4 rounded-[1.25rem] border px-4 py-4"
                style={styles.subtleSurface}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold" style={styles.chip}>
                  {index + 1}
                </div>
                <p className="text-sm leading-7">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {featureTracks.map((item, index) => (
            <article
              key={item.title}
              className="motion-surface motion-surface-hover animate-fade-up rounded-[1.6rem] border p-5"
              style={{
                ...styles.subtleSurface,
                animationDelay: `${index * 100}ms`,
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={styles.mutedText}>
                {item.title}
              </p>
              <p className="mt-3 text-base leading-7">{item.description}</p>
            </article>
          ))}
        </div>

        <div className="rounded-[2rem] border px-6 py-8 text-center shadow-[0_24px_70px_-40px_rgba(14,165,233,0.2)]" style={styles.heroAccent}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={styles.chip}>Ready to try it?</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Start with GitHub, then build the version you actually want to publish.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7" style={styles.mutedText}>
            Load a profile, refine the site in the live builder, use themes or templates when helpful, and export or publish when the portfolio feels done.
          </p>
          <a
            href="/builder"
            className="motion-surface motion-surface-hover motion-press mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold"
            style={styles.accentButton}
          >
            Open Repo2Site
          </a>
        </div>
      </div>
    </section>
  );
}
