"use client";

import type {
  CSSProperties,
  DragEvent,
  PointerEvent,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { getRepo2SiteTechIcon } from "@/lib/repo2site-tech";
import type { ContentSource } from "@/lib/portfolio";
import type { PreviewTheme } from "@/lib/types";
import type { Repo2SiteThemeStyleMap } from "@/lib/repo2site-builder-theme";

const SECTION_RESIZE_HANDLE_HIT_WIDTH = 22;

function formatSourceLabel(source: ContentSource | "github") {
  if (source === "user") return "Edited";
  if (source === "ai") return "AI";
  if (source === "readme") return "README";
  return "GitHub";
}

export function SourceBadge({
  source,
  themeStyles,
}: {
  source: ContentSource | "github";
  themeStyles: Repo2SiteThemeStyleMap;
}) {
  const badgeStyle =
    source === "user"
      ? themeStyles.userBadge
      : source === "ai"
        ? themeStyles.aiBadge
        : source === "readme"
          ? themeStyles.readmeBadge
          : themeStyles.githubBadge;

  return (
    <span className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]" style={badgeStyle}>
      {formatSourceLabel(source)}
    </span>
  );
}

export function TechBadge({
  label,
  themeStyles,
  compact = false,
}: {
  label: string;
  themeStyles: Repo2SiteThemeStyleMap;
  compact?: boolean;
}) {
  const techIcon = getRepo2SiteTechIcon(label);

  if (!techIcon) {
    return (
      <span
        className={`rounded-full border font-medium ${compact ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"}`}
        style={themeStyles.chip}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-medium ${compact ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"}`}
      style={themeStyles.chip}
    >
      <svg
        viewBox="0 0 28 28"
        aria-hidden="true"
        className={compact ? "h-4 w-4 shrink-0" : "h-5 w-5 shrink-0"}
      >
        <rect x="1.5" y="1.5" width="25" height="25" rx="8" fill={techIcon.accent} opacity="0.16" />
        <rect x="5" y="5" width="18" height="18" rx="6" fill={techIcon.accent} />
        <text
          x="14"
          y="14.6"
          fill="#ffffff"
          fontSize={techIcon.shortLabel.length > 2 ? "6.5" : "8.5"}
          fontWeight="700"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontFamily: "var(--font-mono), monospace", letterSpacing: "-0.04em" }}
        >
          {techIcon.shortLabel}
        </text>
      </svg>
      <span>{label}</span>
    </span>
  );
}

export function ActionLink({
  href,
  label,
  themeStyles,
  primary = false,
}: {
  href: string;
  label: string;
  themeStyles: Repo2SiteThemeStyleMap;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("#") ? undefined : "_blank"}
      rel={href.startsWith("#") ? undefined : "noreferrer"}
      className="inline-flex rounded-xl border px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
      style={primary ? themeStyles.accentButton : themeStyles.ghostButton}
    >
      {label}
    </a>
  );
}

export function AutoResizeTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      onInput={(event) => {
        const element = event.currentTarget;
        element.style.height = "auto";
        element.style.height = `${element.scrollHeight}px`;
        props.onInput?.(event);
      }}
    />
  );
}

export function CompactActionMenu({
  themeStyles,
  items,
}: {
  themeStyles: Repo2SiteThemeStyleMap;
  items: Array<{
    label: string;
    onSelect: () => void;
    tone?: "default" | "danger";
  }>;
}) {
  return (
    <details className="relative">
      <summary
        className="motion-surface motion-press inline-flex cursor-pointer list-none items-center justify-center rounded-full border p-2 text-xs font-semibold uppercase tracking-[0.16em]"
        style={themeStyles.ghostButton}
        onClick={(event) => event.stopPropagation()}
        aria-label="Section actions"
      >
        •••
      </summary>
      <div
        className="absolute right-0 top-[calc(100%+0.5rem)] z-30 min-w-[12rem] rounded-[1rem] border p-2 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)]"
        style={themeStyles.strongSurface}
      >
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              item.onSelect();
              const details = document.activeElement?.closest("details");
              details?.removeAttribute("open");
            }}
            className="flex w-full rounded-[0.8rem] px-3 py-2 text-left text-sm transition hover:-translate-y-0.5"
            style={{
              color: item.tone === "danger" ? themeStyles.errorText.color : themeStyles.strongSurface.color,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </details>
  );
}

export function InlineActionButton({
  label,
  onClick,
  themeStyles,
}: {
  label: string;
  onClick: () => void;
  themeStyles: Repo2SiteThemeStyleMap;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
      style={themeStyles.ghostButton}
    >
      {label}
    </button>
  );
}

export function PaletteFieldControl({
  label,
  value,
  onChange,
  onReset,
  themeStyles,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  onReset: () => void;
  themeStyles: Repo2SiteThemeStyleMap;
}) {
  return (
    <div className="grid gap-2 rounded-[0.95rem] border p-3" style={themeStyles.surface}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
          {label}
        </p>
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={themeStyles.ghostButton}
        >
          Reset
        </button>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 rounded border bg-transparent p-1"
          style={themeStyles.strongSurface}
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#000000"
          className="h-10 min-w-0 flex-1 rounded-full border px-4 text-sm outline-none transition"
          style={themeStyles.strongSurface}
        />
      </div>
    </div>
  );
}

export function PreviewSectionFrame({
  sectionId,
  label,
  themeStyles,
  theme,
  isEditing,
  isDragging,
  isResizing,
  isSelected,
  isHovered,
  isDropTarget,
  dropPosition,
  widthRatio,
  canResize,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove,
  onRequestRemove,
  onCancelRemove,
  onSelect,
  onHoverChange,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  canGrow = false,
  canShrink = false,
  onGrow,
  onShrink,
  sizePresets = [],
  canGroupWithPrevious = false,
  canGroupWithNext = false,
  canStackAlone = false,
  onGroupWithPrevious,
  onGroupWithNext,
  onStackAlone,
  duplicateLabel,
  onDuplicate,
  isPendingRemoval = false,
  children,
}: {
  sectionId: string;
  label: string;
  themeStyles: Repo2SiteThemeStyleMap;
  theme: PreviewTheme;
  isEditing: boolean;
  isDragging: boolean;
  isResizing: boolean;
  isSelected: boolean;
  isHovered: boolean;
  isDropTarget: boolean;
  dropPosition: "before" | "after" | "left" | "right" | null;
  widthRatio: number;
  canResize: boolean;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onRemove: () => void;
  onRequestRemove?: () => void;
  onCancelRemove?: () => void;
  onSelect: () => void;
  onHoverChange: (hovered: boolean) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canGrow?: boolean;
  canShrink?: boolean;
  onGrow?: () => void;
  onShrink?: () => void;
  sizePresets?: Array<{
    label: string;
    isActive: boolean;
    onSelect: () => void;
  }>;
  canGroupWithPrevious?: boolean;
  canGroupWithNext?: boolean;
  canStackAlone?: boolean;
  onGroupWithPrevious?: () => void;
  onGroupWithNext?: () => void;
  onStackAlone?: () => void;
  duplicateLabel?: string;
  onDuplicate?: () => void;
  isPendingRemoval?: boolean;
  children: ReactNode;
}) {
  const showToolbar = isHovered || (isEditing && (isSelected || isResizing));
  const showLayoutControls =
    canMoveUp ||
    canMoveDown ||
    canGrow ||
    canShrink ||
    sizePresets.length > 0 ||
    canGroupWithPrevious ||
    canGroupWithNext ||
    canStackAlone;

  return (
    <section
      id={sectionId}
      onDragOver={isEditing ? onDragOver : undefined}
      onDrop={isEditing ? onDrop : undefined}
      onClick={isEditing ? onSelect : undefined}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      className={`group/section motion-surface relative h-full min-w-0 ${isEditing ? "cursor-pointer" : ""} ${isDragging ? "opacity-60" : ""}`}
    >
      {isEditing && isDropTarget && dropPosition === "before" ? (
        <div className="app-drop-indicator absolute inset-x-4 top-0 z-20 h-1 rounded-full" style={{ backgroundColor: theme.palette.accent }} />
      ) : null}
      {isEditing && isDropTarget && dropPosition === "after" ? (
        <div className="app-drop-indicator absolute inset-x-4 bottom-0 z-20 h-1 rounded-full" style={{ backgroundColor: theme.palette.accent }} />
      ) : null}
      {isEditing && isDropTarget && dropPosition === "left" ? (
        <div className="app-drop-indicator absolute inset-y-4 left-0 z-20 w-1 rounded-full" style={{ backgroundColor: theme.palette.accent }} />
      ) : null}
      {isEditing && isDropTarget && dropPosition === "right" ? (
        <div className="app-drop-indicator absolute inset-y-4 right-0 z-20 w-1 rounded-full" style={{ backgroundColor: theme.palette.accent }} />
      ) : null}
      <div
        className="motion-surface flex h-full min-w-0 flex-col rounded-[1.75rem] border px-4 py-4 sm:px-5 sm:py-5"
        style={{
          ...themeStyles.surface,
          borderColor: isEditing && (isDropTarget || isSelected) ? theme.palette.accent : themeStyles.surface.borderColor,
          boxShadow:
            isEditing && isDragging
              ? `0 20px 48px -30px ${theme.palette.accentSoft}`
              : isEditing && (isDropTarget || isSelected)
                ? `0 0 0 1px ${theme.palette.accent}, 0 24px 56px -36px ${theme.palette.accentSoft}`
                : isEditing && isHovered
                  ? `0 18px 42px -34px rgba(15, 23, 42, 0.28)`
                  : undefined,
          transform: isEditing ? (isDragging ? "scale(0.992)" : isResizing ? "scale(1.002)" : undefined) : undefined,
        }}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={themeStyles.mutedText}>
              {label}
            </p>
            {isPendingRemoval ? (
              <p className="mt-2 text-xs leading-5" style={themeStyles.mutedText}>
                Delete this section?
              </p>
            ) : null}
          </div>
          <div
            className={`flex items-center gap-2 transition duration-200 ${showToolbar ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0 group-hover/section:pointer-events-auto group-hover/section:translate-y-0 group-hover/section:opacity-100"}`}
          >
            {showLayoutControls ? (
              <div className="flex items-center gap-1 rounded-full border px-1.5 py-1" style={themeStyles.strongSurface}>
                {canMoveUp ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onMoveUp?.();
                    }}
                    className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={themeStyles.ghostButton}
                    title={`Move ${label} up`}
                  >
                    Up
                  </button>
                ) : null}
                {canMoveDown ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onMoveDown?.();
                    }}
                    className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={themeStyles.ghostButton}
                    title={`Move ${label} down`}
                  >
                    Down
                  </button>
                ) : null}
                {canShrink ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onShrink?.();
                    }}
                    className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={themeStyles.ghostButton}
                    title={`Make ${label} smaller`}
                  >
                    Smaller
                  </button>
                ) : null}
                {canGrow ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onGrow?.();
                    }}
                    className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={themeStyles.ghostButton}
                    title={`Make ${label} larger`}
                  >
                    Larger
                  </button>
                ) : null}
                {sizePresets.length > 0 ? (
                  <div className="flex items-center gap-1 rounded-full border px-1 py-1" style={themeStyles.surface}>
                    {sizePresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          preset.onSelect();
                        }}
                        className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                        style={preset.isActive ? themeStyles.accentButton : themeStyles.ghostButton}
                        title={`Set ${label} width to ${preset.label}`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                {canGroupWithPrevious ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onGroupWithPrevious?.();
                    }}
                    className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={themeStyles.ghostButton}
                    title={`Place ${label} beside the previous section`}
                  >
                    Left
                  </button>
                ) : null}
                {canStackAlone ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onStackAlone?.();
                    }}
                    className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={themeStyles.ghostButton}
                    title={`Make ${label} full width`}
                  >
                    Full
                  </button>
                ) : null}
                {canGroupWithNext ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onGroupWithNext?.();
                    }}
                    className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={themeStyles.ghostButton}
                    title={`Place ${label} beside the next section`}
                  >
                    Right
                  </button>
                ) : null}
              </div>
            ) : null}
            {isEditing && canResize && (isSelected || isResizing) ? (
              <span className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={themeStyles.mutedText}>
                {Math.round(widthRatio * 100)}%
              </span>
            ) : null}
            {isEditing ? (
              <>
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.stopPropagation();
                    onDragStart(event);
                  }}
                  onDragEnd={onDragEnd}
                  className="motion-surface motion-press inline-flex cursor-grab items-center justify-center rounded-full border p-2 text-xs font-semibold uppercase tracking-[0.16em] active:cursor-grabbing"
                  style={themeStyles.ghostButton}
                  aria-label={`Drag ${label}`}
                  title={`Drag ${label}`}
                  data-tour-id="tour-drag-section"
                >
                  <span aria-hidden="true">⋮⋮</span>
                </button>
                {isPendingRemoval ? (
                  <>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemove();
                      }}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                      style={themeStyles.accentButton}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onCancelRemove?.();
                      }}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                      style={themeStyles.ghostButton}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRequestRemove?.();
                    }}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                    style={themeStyles.ghostButton}
                  >
                    Delete
                  </button>
                )}
                <CompactActionMenu
                  themeStyles={themeStyles}
                  items={[
                    ...(onDuplicate ? [{ label: duplicateLabel || "Duplicate section", onSelect: onDuplicate }] : []),
                    { label: "Remove section", onSelect: onRequestRemove ?? onRemove, tone: "danger" as const },
                  ]}
                />
              </>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

export function PreviewRowResizeHandle({
  themeStyles,
  theme,
  isActive,
  onPointerDown,
}: {
  themeStyles: Repo2SiteThemeStyleMap;
  theme: PreviewTheme;
  isActive: boolean;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="hidden xl:flex xl:w-5 xl:flex-none xl:items-stretch xl:justify-center">
      <button
        type="button"
        onPointerDown={onPointerDown}
        className="group relative h-full min-h-[12rem] cursor-ew-resize touch-none"
        aria-label="Resize sections"
        title="Drag to resize sections"
      >
        <span
          className="absolute inset-y-3 left-1/2 -translate-x-1/2 rounded-full transition duration-200"
          style={{
            width: "2px",
            backgroundColor: isActive ? theme.palette.accent : themeStyles.surface.borderColor,
            boxShadow: isActive ? `0 0 12px ${theme.palette.accentSoft}` : undefined,
          }}
        />
        <span
          className="motion-surface absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border"
          style={{
            width: `${SECTION_RESIZE_HANDLE_HIT_WIDTH}px`,
            height: "2.75rem",
            ...themeStyles.strongSurface,
            borderColor: isActive ? theme.palette.accent : themeStyles.strongSurface.borderColor,
            boxShadow: isActive
              ? `0 0 0 1px ${theme.palette.accent}, 0 16px 28px -20px ${theme.palette.accentSoft}`
              : undefined,
          }}
        >
          <span className="flex items-center gap-1">
            <span className="h-4 w-[2px] rounded-full" style={{ backgroundColor: theme.palette.muted }} />
            <span className="h-4 w-[2px] rounded-full" style={{ backgroundColor: theme.palette.muted }} />
          </span>
        </span>
      </button>
    </div>
  );
}

export function PreviewCanvasItemFrame({
  label,
  themeStyles,
  isEditing,
  isDragging = false,
  isDropTarget = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove,
  children,
}: {
  label: string;
  themeStyles: Repo2SiteThemeStyleMap;
  isEditing: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onDragStart?: (event: DragEvent<HTMLElement>) => void;
  onDragOver?: (event: DragEvent<HTMLElement>) => void;
  onDrop?: (event: DragEvent<HTMLElement>) => void;
  onDragEnd?: () => void;
  onRemove?: () => void;
  children: ReactNode;
}) {
  if (!isEditing) {
    return <>{children}</>;
  }

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`group/item motion-surface relative rounded-[1.2rem] border p-3 ${isDragging ? "opacity-60" : ""}`}
      style={{
        ...themeStyles.strongSurface,
        borderColor: isDropTarget ? themeStyles.accentButton.backgroundColor : themeStyles.strongSurface.borderColor,
        boxShadow: isDropTarget
          ? `0 0 0 1px ${themeStyles.accentButton.backgroundColor}, 0 18px 30px -24px ${themeStyles.accentButton.backgroundColor}`
          : undefined,
        transform: isDragging ? "scale(0.99)" : undefined,
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={themeStyles.mutedText}>
          {label}
        </p>
        <div className="flex -translate-y-1 items-center gap-2 opacity-0 transition duration-200 group-hover/item:translate-y-0 group-hover/item:opacity-100 focus-within:translate-y-0 focus-within:opacity-100">
          {onDragStart ? (
            <button
              type="button"
              draggable
              onDragStart={(event) => {
                event.stopPropagation();
                onDragStart(event);
              }}
              onDragEnd={onDragEnd}
              className="motion-surface motion-press rounded-full border p-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={themeStyles.ghostButton}
              aria-label={`Drag ${label}`}
              title={`Drag ${label}`}
            >
              <span aria-hidden="true">⋮⋮</span>
            </button>
          ) : null}
          {onRemove ? (
            <CompactActionMenu
              themeStyles={themeStyles}
              items={[{ label: "Hide block", onSelect: onRemove, tone: "danger" }]}
            />
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}
