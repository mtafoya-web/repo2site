import {
  canSectionShareRow,
  canSectionsShareRow,
  getAllowedRowWidthRatios,
  getCanvasSectionWidthRatio,
  normalizeLayoutComponents,
  snapRowWidthRatio,
} from "@/lib/portfolio";
import type {
  PortfolioCanvasComponent,
  PortfolioOverrides,
  PortfolioSectionLayout,
  PortfolioSectionType,
} from "@/lib/types";

export type Repo2SiteResolvedLayoutMode = "stacked" | "free-flow";
export type Repo2SiteSectionDropPosition = "before" | "after" | "left" | "right";

export type Repo2SiteLayoutIssueCode =
  | "responsive-stack"
  | "stacked-only-section"
  | "invalid-row"
  | "row-width-normalized";

export type Repo2SiteLayoutIssue = {
  code: Repo2SiteLayoutIssueCode;
  rowId: string;
  sectionIds: string[];
};

export type Repo2SiteResolvedLayoutRow = {
  id: string;
  items: PortfolioCanvasComponent[];
  isFlexible: boolean;
};

type LayoutViewportMode = "desktop" | "narrow";

type LayoutSectionMetadata = {
  supportsFreeFlow: boolean;
  defaultLeadRatio?: number;
};

const SECTION_LAYOUT_METADATA: Record<PortfolioSectionType, LayoutSectionMetadata> = {
  hero: { supportsFreeFlow: true, defaultLeadRatio: 0.5 },
  about: { supportsFreeFlow: true, defaultLeadRatio: 0.6 },
  professional: { supportsFreeFlow: true, defaultLeadRatio: 0.6 },
  projects: { supportsFreeFlow: false },
  links: { supportsFreeFlow: true, defaultLeadRatio: 0.5 },
  contact: { supportsFreeFlow: true, defaultLeadRatio: 0.5 },
  custom: { supportsFreeFlow: true, defaultLeadRatio: 0.6 },
};

function getLayoutSectionMetadata(
  component: Pick<PortfolioCanvasComponent, "type"> | PortfolioSectionType,
) {
  const sectionType = typeof component === "string" ? component : component.type;
  return SECTION_LAYOUT_METADATA[sectionType];
}

export function getResolvedLayoutMode(sectionLayout: PortfolioSectionLayout): Repo2SiteResolvedLayoutMode {
  return sectionLayout === "stacked" ? "stacked" : "free-flow";
}

export function supportsSectionFreeFlow(component: Pick<PortfolioCanvasComponent, "type">) {
  return getLayoutSectionMetadata(component).supportsFreeFlow && canSectionShareRow(component);
}

function createStackedRow(component: PortfolioCanvasComponent): Repo2SiteResolvedLayoutRow {
  return {
    id: component.id,
    items: [
      {
        ...component,
        rowId: component.id,
        width: "full",
        widthRatio: 1,
      },
    ],
    isFlexible: false,
  };
}

function normalizeFlexiblePair(
  rowId: string,
  leftComponent: PortfolioCanvasComponent,
  rightComponent: PortfolioCanvasComponent,
) {
  const leftPreferredRatio =
    getLayoutSectionMetadata(leftComponent).defaultLeadRatio ??
    getAllowedRowWidthRatios(leftComponent, rightComponent)[0] ??
    0.5;
  const snappedLeftRatio = snapRowWidthRatio(
    getCanvasSectionWidthRatio(leftComponent) < 1 ? getCanvasSectionWidthRatio(leftComponent) : leftPreferredRatio,
    leftComponent,
    rightComponent,
  );

  return [
    {
      ...leftComponent,
      rowId,
      width: undefined,
      widthRatio: snappedLeftRatio,
    },
    {
      ...rightComponent,
      rowId,
      width: undefined,
      widthRatio: 1 - snappedLeftRatio,
    },
  ] satisfies PortfolioCanvasComponent[];
}

export function buildPortfolioLayoutForMode(
  components: PortfolioCanvasComponent[],
  nextLayout: PortfolioOverrides["appearance"]["sectionLayout"],
) {
  const normalizedComponents = normalizeLayoutComponents(components);

  if (getResolvedLayoutMode(nextLayout) === "stacked") {
    return normalizedComponents.map((component) => ({
      ...component,
      rowId: component.id,
      width: "full" as const,
      widthRatio: 1,
    }));
  }

  const preparedComponents = normalizedComponents.map((component) => ({
    ...component,
    rowId: component.id,
    width: supportsSectionFreeFlow(component) ? undefined : ("full" as const),
    widthRatio: supportsSectionFreeFlow(component) ? undefined : 1,
  }));

  for (let index = 0; index < preparedComponents.length - 1; index += 1) {
    const leftComponent = preparedComponents[index];
    const rightComponent = preparedComponents[index + 1];

    if (!supportsSectionFreeFlow(leftComponent) || !supportsSectionFreeFlow(rightComponent)) {
      continue;
    }

    if (!canSectionsShareRow(leftComponent, rightComponent)) {
      continue;
    }

    const sharedRowId = `${leftComponent.id}-${rightComponent.id}`;
    const [nextLeft, nextRight] = normalizeFlexiblePair(sharedRowId, leftComponent, rightComponent);
    preparedComponents[index] = nextLeft;
    preparedComponents[index + 1] = nextRight;
    index += 1;
  }

  return normalizeLayoutComponents(preparedComponents);
}

function resetSectionToStacked(component: PortfolioCanvasComponent) {
  return {
    ...component,
    rowId: component.id,
    width: "full" as const,
    widthRatio: 1,
  };
}

function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

export function moveSectionPlacement(
  components: PortfolioCanvasComponent[],
  sectionLayout: PortfolioSectionLayout,
  draggedSectionId: string,
  targetSectionId: string,
  position: Repo2SiteSectionDropPosition,
) {
  const normalizedComponents = normalizeLayoutComponents(components);
  const draggedIndex = normalizedComponents.findIndex((component) => component.id === draggedSectionId);
  const targetIndex = normalizedComponents.findIndex((component) => component.id === targetSectionId);

  if (
    draggedIndex === -1 ||
    targetIndex === -1 ||
    draggedSectionId === targetSectionId
  ) {
    return normalizedComponents;
  }

  const draggedComponent = normalizedComponents[draggedIndex];
  const targetComponent = normalizedComponents[targetIndex];
  const resolvedRows = resolvePortfolioSectionRows(normalizedComponents, sectionLayout).rows;
  const sourceRow = resolvedRows.find((row) => row.items.some((component) => component.id === draggedSectionId));
  const targetRow = resolvedRows.find((row) => row.items.some((component) => component.id === targetSectionId));

  if (!draggedComponent || !targetComponent || !sourceRow || !targetRow) {
    return normalizedComponents;
  }

  const detachedComponents = normalizedComponents.map((component) => {
    if (
      sourceRow.isFlexible &&
      sourceRow.items.some((item) => item.id === component.id)
    ) {
      return resetSectionToStacked(component);
    }

    if (
      position !== "before" &&
      position !== "after" &&
      targetRow.isFlexible &&
      targetRow.id !== sourceRow.id &&
      targetRow.items.some((item) => item.id === component.id)
    ) {
      return resetSectionToStacked(component);
    }

    return component;
  });

  const sourceDetachedIndex = detachedComponents.findIndex((component) => component.id === draggedSectionId);
  const targetDetachedIndex = detachedComponents.findIndex((component) => component.id === targetSectionId);

  if (sourceDetachedIndex === -1 || targetDetachedIndex === -1) {
    return normalizedComponents;
  }

  if (position === "before" || position === "after") {
    const moved = moveArrayItem(
      detachedComponents,
      sourceDetachedIndex,
      position === "after" ? targetDetachedIndex + (sourceDetachedIndex < targetDetachedIndex ? 0 : 1) : targetDetachedIndex,
    );

    return normalizeLayoutComponents(moved);
  }

  if (
    getResolvedLayoutMode(sectionLayout) !== "free-flow" ||
    !supportsSectionFreeFlow(draggedComponent) ||
    !supportsSectionFreeFlow(targetComponent) ||
    !canSectionsShareRow(draggedComponent, targetComponent)
  ) {
    return normalizedComponents;
  }

  if (targetRow.isFlexible && targetRow.id !== sourceRow.id) {
    return normalizedComponents;
  }

  const reordered = moveArrayItem(
    detachedComponents,
    sourceDetachedIndex,
    position === "right"
      ? targetDetachedIndex + (sourceDetachedIndex < targetDetachedIndex ? 0 : 1)
      : targetDetachedIndex,
  );

  const sharedRowId = `${position === "left" ? draggedSectionId : targetSectionId}-${position === "left" ? targetSectionId : draggedSectionId}`;
  const leftSectionId = position === "left" ? draggedSectionId : targetSectionId;
  const rightSectionId = position === "left" ? targetSectionId : draggedSectionId;
  const leftSection = reordered.find((component) => component.id === leftSectionId);
  const rightSection = reordered.find((component) => component.id === rightSectionId);

  if (!leftSection || !rightSection) {
    return normalizedComponents;
  }

  const [nextLeft, nextRight] = normalizeFlexiblePair(sharedRowId, leftSection, rightSection);

  return normalizeLayoutComponents(
    reordered.map((component) => {
      if (component.id === leftSectionId) {
        return nextLeft;
      }

      if (component.id === rightSectionId) {
        return nextRight;
      }

      return component;
    }),
  );
}

export function moveSectionRow(
  components: PortfolioCanvasComponent[],
  sectionLayout: PortfolioSectionLayout,
  sectionId: string,
  direction: -1 | 1,
) {
  const normalizedComponents = normalizeLayoutComponents(components);
  const visibleRows = resolvePortfolioSectionRows(
    normalizedComponents.filter((component) => component.visible),
    sectionLayout,
  ).rows;
  const sourceRowIndex = visibleRows.findIndex((row) => row.items.some((component) => component.id === sectionId));

  if (sourceRowIndex === -1) {
    return normalizedComponents;
  }

  const targetRowIndex = sourceRowIndex + direction;

  if (targetRowIndex < 0 || targetRowIndex >= visibleRows.length) {
    return normalizedComponents;
  }

  const sourceRow = visibleRows[sourceRowIndex];
  const targetRow = visibleRows[targetRowIndex];
  const sourceIds = new Set(sourceRow.items.map((component) => component.id));
  const remainingComponents = normalizedComponents.filter((component) => !sourceIds.has(component.id));
  const targetIndices = remainingComponents.reduce<number[]>((indices, component, index) => {
    if (targetRow.items.some((item) => item.id === component.id)) {
      indices.push(index);
    }

    return indices;
  }, []);

  if (targetIndices.length === 0) {
    return normalizedComponents;
  }

  const insertIndex =
    direction < 0 ? Math.min(...targetIndices) : Math.max(...targetIndices) + 1;

  remainingComponents.splice(insertIndex, 0, ...sourceRow.items);
  return normalizeLayoutComponents(remainingComponents);
}

export function resolvePortfolioSectionRows(
  components: PortfolioCanvasComponent[],
  sectionLayout: PortfolioSectionLayout,
  options: {
    viewport?: LayoutViewportMode;
  } = {},
) {
  const viewport = options.viewport ?? "desktop";
  const requestedMode = getResolvedLayoutMode(sectionLayout);
  const normalizedComponents = normalizeLayoutComponents(components);
  const issues: Repo2SiteLayoutIssue[] = [];

  if (requestedMode === "stacked" || viewport === "narrow") {
    if (requestedMode === "free-flow" && viewport === "narrow") {
      issues.push({
        code: "responsive-stack",
        rowId: "viewport",
        sectionIds: normalizedComponents.map((component) => component.id),
      });
    }

    return {
      mode: viewport === "narrow" ? ("stacked" as const) : requestedMode,
      rows: normalizedComponents.map(createStackedRow),
      issues,
    };
  }

  const groupedRows = normalizedComponents.reduce<Array<{ id: string; items: PortfolioCanvasComponent[] }>>(
    (rows, component) => {
      const nextRowId =
        supportsSectionFreeFlow(component) && component.widthRatio !== 1
          ? component.rowId || component.id
          : component.id;
      const existing = rows.find((row) => row.id === nextRowId);

      if (existing) {
        existing.items.push(component);
      } else {
        rows.push({ id: nextRowId, items: [component] });
      }

      return rows;
    },
    [],
  );

  const rows = groupedRows.flatMap((row) => {
    if (row.items.length === 1) {
      const [component] = row.items;
      return [createStackedRow(component)];
    }

    if (row.items.length !== 2) {
      issues.push({
        code: "invalid-row",
        rowId: row.id,
        sectionIds: row.items.map((component) => component.id),
      });
      return row.items.map(createStackedRow);
    }

    const [leftComponent, rightComponent] = row.items;

    if (
      !supportsSectionFreeFlow(leftComponent) ||
      !supportsSectionFreeFlow(rightComponent) ||
      !canSectionsShareRow(leftComponent, rightComponent)
    ) {
      issues.push({
        code: supportsSectionFreeFlow(leftComponent) && supportsSectionFreeFlow(rightComponent)
          ? "invalid-row"
          : "stacked-only-section",
        rowId: row.id,
        sectionIds: row.items.map((component) => component.id),
      });
      return row.items.map(createStackedRow);
    }

    const [normalizedLeft, normalizedRight] = normalizeFlexiblePair(row.id, leftComponent, rightComponent);
    const leftChanged =
      normalizedLeft.rowId !== leftComponent.rowId ||
      normalizedLeft.widthRatio !== leftComponent.widthRatio;
    const rightChanged =
      normalizedRight.rowId !== rightComponent.rowId ||
      normalizedRight.widthRatio !== rightComponent.widthRatio;

    if (leftChanged || rightChanged) {
      issues.push({
        code: "row-width-normalized",
        rowId: row.id,
        sectionIds: row.items.map((component) => component.id),
      });
    }

    return [
      {
        id: row.id,
        items: [normalizedLeft, normalizedRight],
        isFlexible: true,
      },
    ];
  });

  return {
    mode: requestedMode,
    rows,
    issues,
  };
}
