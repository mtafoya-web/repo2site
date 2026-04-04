"use client";

import type { CSSProperties, DragEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { Fragment } from "react";
import {
  PreviewRowResizeHandle,
  PreviewSectionFrame,
} from "@/components/builder/repo2site-builder-primitives";
import {
  canSectionShareRow,
  canSectionsShareRow,
  getAllowedRowWidthRatios,
  getCanvasSectionWidthRatio,
} from "@/lib/portfolio";
import type { Repo2SiteThemeStyleMap } from "@/lib/repo2site-builder-theme";
import type { PortfolioCanvasComponent, PortfolioSectionId, PortfolioSectionLayout, PreviewTheme } from "@/lib/types";

type CanvasRow = {
  id: string;
  items: PortfolioCanvasComponent[];
  isFlexible: boolean;
};

export function Repo2SiteBuilderCanvas({
  previewReady,
  isEditing,
  themeStyles,
  theme,
  densityStackGapClassName,
  selectedSectionId,
  visibleSectionRows,
  sectionLabels,
  customSectionTitles,
  rowLayoutMode,
  draggedSectionId,
  dropTargetSectionId,
  hoveredSectionId,
  pendingSectionRemovalId,
  dropPosition,
  resizingSectionIds,
  firstStepContent,
  workspacePanel,
  emptyCanvasActions,
  renderSectionContent,
  onFocusSection,
  onHoverSection,
  onSectionDragStart,
  onSectionDragOver,
  onSectionDrop,
  onSectionDragEnd,
  onRemoveSection,
  onRequestRemoveSection,
  onCancelRemoveSection,
  onMoveSectionRow,
  onPlaceSectionBeside,
  onStackSection,
  onAdjustSectionWidth,
  onSetSectionWidthPreset,
  onDuplicateSection,
  onStartSectionResize,
}: {
  previewReady: boolean;
  isEditing: boolean;
  themeStyles: Repo2SiteThemeStyleMap;
  theme: PreviewTheme;
  densityStackGapClassName: string;
  selectedSectionId: string | null;
  visibleSectionRows: CanvasRow[];
  sectionLabels: Record<PortfolioSectionId, string>;
  customSectionTitles: Record<string, string>;
  rowLayoutMode: PortfolioSectionLayout;
  draggedSectionId: string | null;
  dropTargetSectionId: string | null;
  hoveredSectionId: string | null;
  pendingSectionRemovalId: string | null;
  dropPosition: "before" | "after" | "left" | "right" | null;
  resizingSectionIds: string[];
  firstStepContent: ReactNode;
  workspacePanel: ReactNode;
  emptyCanvasActions: ReactNode;
  renderSectionContent: (component: PortfolioCanvasComponent) => ReactNode;
  onFocusSection: (sectionId: string) => void;
  onHoverSection: (sectionId: string | null) => void;
  onSectionDragStart: (sectionId: string, event: DragEvent<HTMLElement>) => void;
  onSectionDragOver: (sectionId: string, event: DragEvent<HTMLElement>) => void;
  onSectionDrop: (sectionId: string, event: DragEvent<HTMLElement>) => void;
  onSectionDragEnd: () => void;
  onRemoveSection: (sectionId: string) => void;
  onRequestRemoveSection: (sectionId: string) => void;
  onCancelRemoveSection: () => void;
  onMoveSectionRow: (sectionId: string, direction: -1 | 1) => void;
  onPlaceSectionBeside: (sectionId: string, direction: "previous" | "next") => void;
  onStackSection: (sectionId: string) => void;
  onAdjustSectionWidth: (sectionId: string, direction: "grow" | "shrink") => void;
  onSetSectionWidthPreset: (sectionId: string, targetRatio: number) => void;
  onDuplicateSection?: (sectionId: string) => void;
  onStartSectionResize: (
    rowId: string,
    leftSectionId: string,
    rightSectionId: string,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
}) {
  const flatRowItems = visibleSectionRows.flatMap((row) => row.items);
  const rowBySectionId = new Map<string, CanvasRow>();

  visibleSectionRows.forEach((row) => {
    row.items.forEach((component) => {
      rowBySectionId.set(component.id, row);
    });
  });

  return (
    <div
      className={`grid w-full min-w-0 ${densityStackGapClassName} px-4 py-4 sm:px-5 sm:py-5 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:24px_24px]`}
    >
      {!previewReady ? firstStepContent : null}
      {workspacePanel}
      {previewReady && visibleSectionRows.length === 0 ? emptyCanvasActions : null}
      {visibleSectionRows.map((row) => (
        <div
          key={row.id}
          data-layout-row-id={row.id}
          className={`motion-surface grid gap-4 transition-[grid-template-columns,gap,padding,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            rowLayoutMode === "stacked" || row.items.length === 1
              ? "grid-cols-1"
              : "grid-cols-1 rounded-[1.6rem] border p-3 xl:grid xl:items-stretch xl:gap-4 xl:p-4"
          }`}
          style={(() => {
            if (rowLayoutMode === "stacked" || row.items.length === 1) {
              return undefined;
            }

            const leftRatio = getCanvasSectionWidthRatio(row.items[0] ?? row.items[1]);
            const rightRatio = getCanvasSectionWidthRatio(row.items[1] ?? row.items[0]);
            const leftFraction = Math.max(1, Math.round(leftRatio * 10));
            const rightFraction = Math.max(1, Math.round(rightRatio * 10));

            return {
              ...themeStyles.subtleSurface,
              gridTemplateColumns:
                row.items.length === 2
                  ? isEditing
                    ? `minmax(22rem, ${leftFraction}fr) 1.25rem minmax(22rem, ${rightFraction}fr)`
                    : `minmax(22rem, ${leftFraction}fr) minmax(22rem, ${rightFraction}fr)`
                  : undefined,
            } as CSSProperties;
          })()}
        >
          {row.items.map((component, index) => {
            const flatIndex = flatRowItems.findIndex((item) => item.id === component.id);
            const previousComponent = flatIndex > 0 ? flatRowItems[flatIndex - 1] : undefined;
            const nextFlatComponent =
              flatIndex >= 0 && flatIndex < flatRowItems.length - 1 ? flatRowItems[flatIndex + 1] : undefined;
            const previousRow = previousComponent ? rowBySectionId.get(previousComponent.id) : undefined;
            const nextRow = nextFlatComponent ? rowBySectionId.get(nextFlatComponent.id) : undefined;
            const isDragging = draggedSectionId === component.id;
            const isDropTarget = dropTargetSectionId === component.id && draggedSectionId !== component.id;
            const widthRatio =
              rowLayoutMode === "stacked" || !canSectionShareRow(component)
                ? 1
                : getCanvasSectionWidthRatio(component);
            const nextComponent = row.items[index + 1];
            const canShowResizeHandle =
              isEditing &&
              rowLayoutMode !== "stacked" &&
              Boolean(nextComponent) &&
              canSectionsShareRow(component, nextComponent);
            const resizeHandleIsActive =
              Boolean(nextComponent) &&
              resizingSectionIds.includes(component.id) &&
              resizingSectionIds.includes(nextComponent.id);
            const sectionLabel =
              component.type === "custom"
                ? customSectionTitles[component.id] || component.title || "Custom Section"
                : sectionLabels[component.type];
            const canGroupWithPrevious =
              rowLayoutMode !== "stacked" &&
              Boolean(previousComponent) &&
              Boolean(previousRow) &&
              canSectionsShareRow(previousComponent!, component) &&
              (previousRow!.items.length === 1 || previousRow!.id === row.id);
            const canGroupWithNext =
              rowLayoutMode !== "stacked" &&
              Boolean(nextFlatComponent) &&
              Boolean(nextRow) &&
              canSectionsShareRow(component, nextFlatComponent!) &&
              (nextRow!.items.length === 1 || nextRow!.id === row.id);
            const canStackAlone = row.isFlexible && row.items.length > 1;
            const rowIndex = visibleSectionRows.findIndex((candidate) => candidate.id === row.id);
            const canMoveUp = rowIndex > 0;
            const canMoveDown = rowIndex >= 0 && rowIndex < visibleSectionRows.length - 1;
            const siblingComponent = row.items.find((item) => item.id !== component.id);
            const allowedRatios =
              siblingComponent && row.items.length === 2
                ? component.id === row.items[0]?.id
                  ? getAllowedRowWidthRatios(component, siblingComponent)
                  : getAllowedRowWidthRatios(siblingComponent, component).map((ratio) => 1 - ratio)
                : [];
            const currentRatio = widthRatio;
            const canGrow = allowedRatios.some((ratio) => ratio > currentRatio);
            const canShrink = allowedRatios.some((ratio) => ratio < currentRatio);
            const sizePresets = allowedRatios.map((ratio) => ({
              label: `${Math.round(ratio * 100)}%`,
              isActive: Math.abs(ratio - currentRatio) < 0.001,
              onSelect: () => onSetSectionWidthPreset(component.id, ratio),
            }));

            return (
              <Fragment key={component.id}>
                <div
                  className={`min-w-0 w-full ${row.items.length > 1 ? "xl:self-stretch" : "xl:shrink-0 xl:self-stretch xl:basis-[var(--section-width)] xl:max-w-[var(--section-width)]"}`}
                  style={
                    row.items.length > 1
                      ? undefined
                      : ({ ["--section-width" as string]: `${Math.round(widthRatio * 100)}%` } as CSSProperties)
                  }
                >
                  <PreviewSectionFrame
                    sectionId={component.id}
                    label={sectionLabel}
                    themeStyles={themeStyles}
                    theme={theme}
                    isEditing={isEditing}
                    isDragging={isDragging}
                    isResizing={resizingSectionIds.includes(component.id)}
                    isSelected={isEditing && selectedSectionId === component.id}
                    isHovered={isEditing && hoveredSectionId === component.id}
                    isPendingRemoval={isEditing && pendingSectionRemovalId === component.id}
                    isDropTarget={isEditing && isDropTarget}
                    dropPosition={isEditing && isDropTarget ? dropPosition : null}
                    widthRatio={widthRatio}
                    canResize={isEditing && rowLayoutMode !== "stacked" && row.items.length > 1 && canSectionShareRow(component)}
                    duplicateLabel={component.type === "custom" ? "Duplicate" : undefined}
                    onDuplicate={component.type === "custom" && onDuplicateSection ? () => onDuplicateSection(component.id) : undefined}
                    onSelect={() => onFocusSection(component.id)}
                    onHoverChange={(hovered) => onHoverSection(hovered ? component.id : null)}
                    onDragStart={(event) => onSectionDragStart(component.id, event)}
                    onDragOver={(event) => onSectionDragOver(component.id, event)}
                    onDrop={(event) => onSectionDrop(component.id, event)}
                    onDragEnd={onSectionDragEnd}
                    onRequestRemove={() => onRequestRemoveSection(component.id)}
                    onCancelRemove={onCancelRemoveSection}
                    onRemove={() => onRemoveSection(component.id)}
                    canMoveUp={canMoveUp}
                    canMoveDown={canMoveDown}
                    onMoveUp={() => onMoveSectionRow(component.id, -1)}
                    onMoveDown={() => onMoveSectionRow(component.id, 1)}
                    canGrow={canGrow}
                    canShrink={canShrink}
                    onGrow={() => onAdjustSectionWidth(component.id, "grow")}
                    onShrink={() => onAdjustSectionWidth(component.id, "shrink")}
                    sizePresets={sizePresets}
                    canGroupWithPrevious={canGroupWithPrevious}
                    canGroupWithNext={canGroupWithNext}
                    canStackAlone={canStackAlone}
                    onGroupWithPrevious={() => onPlaceSectionBeside(component.id, "previous")}
                    onGroupWithNext={() => onPlaceSectionBeside(component.id, "next")}
                    onStackAlone={() => onStackSection(component.id)}
                  >
                    {renderSectionContent(component)}
                  </PreviewSectionFrame>
                </div>
                {canShowResizeHandle && nextComponent ? (
                  <PreviewRowResizeHandle
                    themeStyles={themeStyles}
                    theme={theme}
                    isActive={resizeHandleIsActive}
                    onPointerDown={(event) => onStartSectionResize(row.id, component.id, nextComponent.id, event)}
                  />
                ) : null}
              </Fragment>
            );
          })}
        </div>
      ))}
    </div>
  );
}
