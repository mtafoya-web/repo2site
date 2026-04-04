"use client";

import { useAppTheme } from "@/components/app-theme-provider";
import { buildAppThemeStyles } from "@/lib/app-theme";

const valueProps = [
  {
    title: "Start from real work",
    description:
      "Turn public GitHub repositories, README context, and profile details into a portfolio draft instead of starting from a blank page.",
  },
  {
    title: "Polish with guided editing",
    description:
      "Edit copy, reorder projects, upload images, and refine your profile in a live preview that stays easy to understand.",
  },
  {
    title: "Use AI without losing control",
    description:
      "Suggestions stay pending until you approve them, so the portfolio only changes when it matches your voice and goals.",
  },
  {
    title: "Export a deployable site",
    description:
      "Download a clean ZIP bundle with just the final portfolio site, ready for static hosting or further customization.",
  },
];

const howItWorks = [
  "Paste a public GitHub profile to generate your starting portfolio.",
  "Upload a resume if you want stronger summaries and profile personalization.",
  "Review the live preview, edit your details, and reorder projects visually.",
  "Use AI suggestions when you want help sharpening copy, then export when it looks right.",
];

const demoRows = [
  { label: "Profile draft", value: "Generated from GitHub + resume context" },
  { label: "Project order", value: "Drag to feature your strongest work" },
  { label: "AI review", value: "Accept only the suggestions you want" },
  { label: "Export", value: "Download a static portfolio ZIP" },
];

export function Repo2SiteLanding() {
  const { resolvedTheme } = useAppTheme();
  const styles = buildAppThemeStyles(resolvedTheme);
  const isDarkTheme = resolvedTheme === "dark";

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
            className="rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
            style={styles.ghostButton}
          >
            Open builder
          </a>
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
          <div className="animate-fade-up">
            <p className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]" style={styles.chip}>
              Build a portfolio from real code
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Turn GitHub work into a polished portfolio without wrestling with templates.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 sm:text-lg" style={styles.mutedText}>
              Repo2Site generates a strong starting draft from public repositories, README context, and optional career materials, then lets you shape the final site in a live editor.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/builder"
                className="rounded-full px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
                style={styles.accentButton}
              >
                Start building
              </a>
              <a
                href="#demo-preview"
                className="rounded-full border px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
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
                      Live workflow
                    </p>
                    <p className="mt-1 text-lg font-semibold">Portfolio builder preview</p>
                  </div>
                  <span className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]" style={styles.chip}>
                    Reviewable AI
                  </span>
                </div>
                <div className="mt-5 grid gap-3">
                  {demoRows.map((row, index) => (
                    <div
                      key={row.label}
                      className="group rounded-[1.2rem] border px-4 py-3 transition hover:-translate-y-0.5"
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
                    Resume upload
                  </span>
                  <span className="rounded-full border px-3 py-1 text-xs font-medium" style={styles.chip}>
                    Static export
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
              className="animate-fade-up rounded-[1.6rem] border p-5 backdrop-blur-md transition hover:-translate-y-1"
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
              A clear path from GitHub profile to deployable portfolio.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7" style={styles.mutedText}>
              The workflow is designed to stay simple for first-time users while still giving experienced builders room to refine details.
            </p>
          </div>
          <div className="grid gap-3">
            {howItWorks.map((step, index) => (
              <div
                key={step}
                className="flex gap-4 rounded-[1.25rem] border px-4 py-4 transition"
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

        <div className="rounded-[2rem] border px-6 py-8 text-center shadow-[0_24px_70px_-40px_rgba(14,165,233,0.2)]" style={styles.heroAccent}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={styles.chip}>Ready to try it?</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Start with your GitHub profile and shape the rest in minutes.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7" style={styles.mutedText}>
            Load a profile, upload a resume if you want stronger personalization, review AI suggestions, and export a site you can actually ship.
          </p>
          <a
            href="/builder"
            className="mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
            style={styles.accentButton}
          >
            Open Repo2Site
          </a>
        </div>
      </div>
    </section>
  );
}
