"use client";

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
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.22),transparent_34%),linear-gradient(180deg,#07101c_0%,#0a1525_48%,#08111f_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:64px_64px]" />
      <div className="relative mx-auto flex w-full max-w-[112rem] flex-col gap-16 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/6 text-sm font-semibold text-white shadow-[0_18px_48px_-30px_rgba(59,130,246,0.6)]">
              R2
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-white">Repo2Site</p>
              <p className="text-xs text-slate-400">GitHub-first portfolio builder</p>
            </div>
          </div>
          <a
            href="/builder"
            className="rounded-full border border-white/15 bg-white/6 px-4 py-2 text-sm font-medium text-slate-100 transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            Open builder
          </a>
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
          <div className="animate-fade-up">
            <p className="inline-flex rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
              Build a portfolio from real code
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Turn GitHub work into a polished portfolio without wrestling with templates.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              Repo2Site generates a strong starting draft from public repositories, README context, and optional career materials, then lets you shape the final site in a live editor.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/builder"
                className="rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-sky-400"
              >
                Start building
              </a>
              <a
                href="#demo-preview"
                className="rounded-full border border-white/15 bg-white/6 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                See the workflow
              </a>
            </div>
          </div>

          <div className="animate-fade-up animation-delay-150">
            <div className="rounded-[2rem] border border-white/10 bg-white/6 p-5 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.95)] backdrop-blur-xl">
              <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/70 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Live workflow
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">Portfolio builder preview</p>
                  </div>
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                    Reviewable AI
                  </span>
                </div>
                <div className="mt-5 grid gap-3">
                  {demoRows.map((row, index) => (
                    <div
                      key={row.label}
                      className="group rounded-[1.2rem] border border-white/8 bg-white/[0.04] px-4 py-3 transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.07]"
                      style={{ animationDelay: `${index * 90}ms` }}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{row.label}</p>
                      <p className="mt-1 text-sm font-medium text-slate-100">{row.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200">
                    GitHub import
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200">
                    Resume upload
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200">
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
              className="animate-fade-up rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.9)] backdrop-blur-md transition hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.06]"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <div className="mb-4 h-10 w-10 rounded-2xl border border-sky-400/25 bg-sky-400/10" />
              <h2 className="text-lg font-semibold text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">{item.description}</p>
            </article>
          ))}
        </div>

        <div id="demo-preview" className="grid gap-10 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_-44px_rgba(15,23,42,0.95)] backdrop-blur-md lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              A clear path from GitHub profile to deployable portfolio.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
              The workflow is designed to stay simple for first-time users while still giving experienced builders room to refine details.
            </p>
          </div>
          <div className="grid gap-3">
            {howItWorks.map((step, index) => (
              <div
                key={step}
                className="flex gap-4 rounded-[1.25rem] border border-white/8 bg-slate-950/40 px-4 py-4 transition hover:border-white/15 hover:bg-slate-950/55"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-400/30 bg-sky-400/10 text-sm font-semibold text-sky-200">
                  {index + 1}
                </div>
                <p className="text-sm leading-7 text-slate-200">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(15,23,42,0.2))] px-6 py-8 text-center shadow-[0_24px_70px_-40px_rgba(14,165,233,0.45)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">Ready to try it?</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            Start with your GitHub profile and shape the rest in minutes.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-200">
            Load a profile, upload a resume if you want stronger personalization, review AI suggestions, and export a site you can actually ship.
          </p>
          <a
            href="/builder"
            className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5"
          >
            Open Repo2Site
          </a>
        </div>
      </div>
    </section>
  );
}
