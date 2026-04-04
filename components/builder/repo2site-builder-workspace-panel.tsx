"use client";

import type { Repo2SiteThemeStyleMap } from "@/lib/repo2site-builder-theme";
import type {
  PortfolioCanvasComponent,
  PortfolioCustomProject,
  PortfolioProjectsLayoutMode,
  PortfolioProjectsOverflowSize,
  PortfolioSectionId,
} from "@/lib/types";

type HiddenChildGroup = {
  parentId: string;
  label: string;
  items: Array<{
    id: string;
    label: string;
  }>;
};

export function Repo2SiteBuilderWorkspacePanel({
  previewReady,
  themeStyles,
  selectedSectionLabel,
  selectedSectionHint,
  visibleCanvasCount,
  hiddenSectionCount,
  hiddenBlockCount,
  isExpanded,
  modeToggleLabel,
  canvasComponents,
  availableBuiltInSections,
  hiddenCanvasComponents,
  hiddenChildComponentGroups,
  hiddenProjectNames,
  customProjects,
  projectsLayoutMode,
  projectsOverflowSize,
  selectedSectionId,
  sectionLabels,
  customSectionTitles,
  onAddProject,
  onChangeProject,
  onChangeProjectsLayoutMode,
  onChangeProjectsOverflowSize,
  onRemoveProject,
  onToggleEditMode,
  onToggleExpanded,
  onResetCanvas,
  onOpenCustomize,
  onFocusSection,
  onAddBuiltInSection,
  onAddCustomSection,
  onRestoreProject,
  onRestoreSection,
  onSetChildComponentVisible,
}: {
  previewReady: boolean;
  themeStyles: Repo2SiteThemeStyleMap;
  selectedSectionLabel: string;
  selectedSectionHint: string;
  visibleCanvasCount: number;
  hiddenSectionCount: number;
  hiddenBlockCount: number;
  isExpanded: boolean;
  modeToggleLabel: string;
  canvasComponents: PortfolioCanvasComponent[];
  availableBuiltInSections: Array<PortfolioCanvasComponent & { type: PortfolioSectionId }>;
  hiddenCanvasComponents: PortfolioCanvasComponent[];
  hiddenChildComponentGroups: HiddenChildGroup[];
  hiddenProjectNames: string[];
  customProjects: PortfolioCustomProject[];
  projectsLayoutMode: PortfolioProjectsLayoutMode;
  projectsOverflowSize: PortfolioProjectsOverflowSize;
  selectedSectionId: string | null;
  sectionLabels: Record<PortfolioSectionId, string>;
  customSectionTitles: Record<string, string>;
  onAddProject: () => void;
  onChangeProject: (
    projectId: string,
    key: keyof Pick<PortfolioCustomProject, "name" | "description" | "language" | "href">,
    value: string,
  ) => void;
  onChangeProjectsLayoutMode: (mode: PortfolioProjectsLayoutMode) => void;
  onChangeProjectsOverflowSize: (size: PortfolioProjectsOverflowSize) => void;
  onRemoveProject: (projectName: string) => void;
  onToggleEditMode: () => void;
  onToggleExpanded: () => void;
  onResetCanvas: () => void;
  onOpenCustomize: () => void;
  onFocusSection: (sectionId: string) => void;
  onAddBuiltInSection: (sectionType: PortfolioSectionId) => void;
  onAddCustomSection: () => void;
  onRestoreProject: (projectName: string) => void;
  onRestoreSection: (sectionId: string) => void;
  onSetChildComponentVisible: (componentId: string, visible: boolean) => void;
}) {
  if (!previewReady) {
    return null;
  }

  return (
    <div
      data-tour-id="tour-workspace-panel"
      className="rounded-[1.1rem] border px-4 py-4 sm:px-5"
      style={themeStyles.sectionSurface}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={themeStyles.mutedText}>
            Builder Workspace
          </p>
          <p className="mt-1 text-sm font-medium">
            {selectedSectionId
              ? `${selectedSectionLabel} selected. Drag, resize, or edit it directly on the canvas.`
              : "Select a section, move it on the canvas, then refine content and styling in the inspector."}
          </p>
          <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
            Flexible layout lets non-project sections share a row. Projects always stay full width.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={themeStyles.chip}>
            {visibleCanvasCount} visible
          </span>
          {hiddenSectionCount > 0 ? (
            <span className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={themeStyles.ghostButton}>
              {hiddenSectionCount} hidden
            </span>
          ) : null}
          <button
            type="button"
            onClick={onToggleExpanded}
            className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
            style={themeStyles.ghostButton}
          >
            {isExpanded ? "Collapse" : "Expand"}
          </button>
          <button
            type="button"
            onClick={onToggleEditMode}
            className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
            style={themeStyles.ghostButton}
          >
            {modeToggleLabel}
          </button>
          <button
            type="button"
            onClick={onResetCanvas}
            className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
            style={themeStyles.ghostButton}
          >
            Reset Canvas
          </button>
          <button
            type="button"
            onClick={onOpenCustomize}
            className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] xl:hidden"
            style={themeStyles.accentButton}
          >
            Open Customize
          </button>
        </div>
      </div>

      {!isExpanded ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-[1rem] border px-4 py-3" style={themeStyles.surface}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
              Focus
            </p>
            <p className="mt-2 text-sm font-medium">
              {selectedSectionId ? selectedSectionLabel : "No section selected"}
            </p>
            <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
              {selectedSectionHint}
            </p>
          </div>
          <div className="rounded-[1rem] border px-4 py-3" style={themeStyles.surface}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
              Overview
            </p>
            <p className="mt-2 text-sm font-medium">{visibleCanvasCount} visible sections</p>
            <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
              {hiddenSectionCount > 0 ? `${hiddenSectionCount} hidden sections ready to restore.` : "Everything is currently visible."}
            </p>
          </div>
          <div className="rounded-[1rem] border px-4 py-3" style={themeStyles.surface}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
              Quick Actions
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenCustomize}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                style={themeStyles.accentButton}
              >
                Customize
              </button>
              <button
                type="button"
                onClick={onAddProject}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                style={themeStyles.ghostButton}
              >
                Add Project
              </button>
            </div>
          </div>
        </div>
      ) : (
      <>
      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="rounded-[1rem] border px-4 py-3" style={themeStyles.surface}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                Page Structure
              </p>
              <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
                {selectedSectionHint}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {canvasComponents.map((component) => {
              const label =
                component.type === "custom"
                  ? customSectionTitles[component.id] || component.title || "Custom Section"
                  : sectionLabels[component.type];
              const isSelected = selectedSectionId === component.id;

              return (
                <button
                  key={`navigator-${component.id}`}
                  type="button"
                  onClick={() => onFocusSection(component.id)}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]"
                  style={
                    isSelected
                      ? themeStyles.accentButton
                      : component.visible
                        ? themeStyles.ghostButton
                        : {
                            ...themeStyles.ghostButton,
                            opacity: 0.68,
                          }
                  }
                >
                  {label}
                  {!component.visible ? " (Hidden)" : ""}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[1rem] border px-4 py-3" style={themeStyles.surface}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
            Manage Sections
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {availableBuiltInSections.map((component) => (
              <button
                key={`add-${component.id}`}
                type="button"
                onClick={() => onAddBuiltInSection(component.type)}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                style={themeStyles.ghostButton}
              >
                {sectionLabels[component.type]}
              </button>
            ))}
            <button
              type="button"
              onClick={onAddCustomSection}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
              style={themeStyles.accentButton}
            >
              Custom Section
            </button>
            {hiddenCanvasComponents.map((component) => (
              <button
                key={`restore-${component.id}`}
                type="button"
                onClick={() => onRestoreSection(component.id)}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                style={themeStyles.ghostButton}
              >
                Restore {component.type === "custom" ? component.title || "Custom Section" : sectionLabels[component.type]}
              </button>
            ))}
          </div>
          {hiddenBlockCount > 0 ? (
            <div className="mt-3 grid gap-2">
              {hiddenChildComponentGroups.map((group) => (
                <div key={group.parentId}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={themeStyles.mutedText}>
                    {group.label}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSetChildComponentVisible(item.id, true)}
                        className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                        style={themeStyles.ghostButton}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 rounded-[1rem] border px-4 py-3" style={themeStyles.surface}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
              Manage Projects
            </p>
            <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
              Add your own project card or restore a project you removed from Selected Work.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddProject}
            className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
            style={themeStyles.accentButton}
          >
            Add Project
          </button>
        </div>
        <div className="mt-3 grid gap-2 rounded-[0.95rem] border p-3" style={themeStyles.strongSurface}>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
              Selected Work Layout
            </p>
            <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
              Choose how added project cards flow underneath the featured project.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ["side-by-side", "Side by Side"],
              ["stacked", "Stacked"],
              ["hybrid", "Mixed"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onChangeProjectsLayoutMode(value)}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                style={projectsLayoutMode === value ? themeStyles.accentButton : themeStyles.ghostButton}
              >
                {label}
              </button>
            ))}
          </div>
          {projectsLayoutMode === "hybrid" ? (
            <div className="mt-2 grid gap-2 rounded-[0.9rem] border p-3" style={themeStyles.surface}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                  Overflow Card Size
                </p>
                <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
                  Make the projects below the top row feel more compact or more open, while mobile stays stacked.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {([
                  ["compact", "Compact"],
                  ["expanded", "Expanded"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onChangeProjectsOverflowSize(value)}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                    style={projectsOverflowSize === value ? themeStyles.accentButton : themeStyles.ghostButton}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        {hiddenProjectNames.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {hiddenProjectNames.map((projectName) => (
              <button
                key={projectName}
                type="button"
                onClick={() => onRestoreProject(projectName)}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                style={themeStyles.ghostButton}
              >
                Restore {projectName}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs leading-5" style={themeStyles.mutedText}>
            Removed projects will show up here so you can bring them back anytime.
          </p>
        )}
        {customProjects.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {customProjects.map((project) => (
              <div key={project.id} className="grid gap-3 rounded-[0.95rem] border p-3" style={themeStyles.strongSurface}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                    Custom Project
                  </p>
                  <button
                    type="button"
                    onClick={() => onRemoveProject(project.name)}
                    className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                    style={themeStyles.ghostButton}
                  >
                    Remove
                  </button>
                </div>
                <input
                  value={project.name}
                  onChange={(event) => onChangeProject(project.id, "name", event.target.value)}
                  placeholder="Project title"
                  className="h-10 rounded-[0.9rem] border px-3 text-sm outline-none transition"
                  style={themeStyles.surface}
                />
                <textarea
                  value={project.description}
                  onChange={(event) => onChangeProject(project.id, "description", event.target.value)}
                  rows={3}
                  placeholder="Describe what this project does and why it matters"
                  className="min-h-[88px] rounded-[0.9rem] border px-3 py-3 text-sm leading-6 outline-none transition"
                  style={themeStyles.surface}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={project.href}
                    onChange={(event) => onChangeProject(project.id, "href", event.target.value)}
                    placeholder="https://example.com/project"
                    className="h-10 rounded-[0.9rem] border px-3 text-sm outline-none transition"
                    style={themeStyles.surface}
                  />
                  <input
                    value={project.language}
                    onChange={(event) => onChangeProject(project.id, "language", event.target.value)}
                    placeholder="TypeScript"
                    className="h-10 rounded-[0.9rem] border px-3 text-sm outline-none transition"
                    style={themeStyles.surface}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      </>
      )}
    </div>
  );
}
