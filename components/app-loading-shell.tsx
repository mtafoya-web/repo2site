type AppLoadingShellProps = {
  label: string;
  title: string;
  description: string;
};

export function AppLoadingShell({ label, title, description }: AppLoadingShellProps) {
  return (
    <div className="min-h-[52vh] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="app-loading-panel">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--app-muted)]">
              {label}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--app-fg)] sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--app-muted)]">
              {description}
            </p>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
            <div className="app-skeleton-card h-[22rem]">
              <div className="app-skeleton-line w-24" />
              <div className="mt-5 app-skeleton-line w-3/4" />
              <div className="mt-3 app-skeleton-line w-full" />
              <div className="mt-2 app-skeleton-line w-5/6" />
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <div className="app-skeleton-card h-28" />
                <div className="app-skeleton-card h-28" />
              </div>
            </div>
            <div className="grid gap-4">
              <div className="app-skeleton-card h-28" />
              <div className="app-skeleton-card h-28" />
              <div className="app-skeleton-card h-28" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
