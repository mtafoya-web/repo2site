"use client";

import { useReducer } from "react";

export type BuilderInspectorTab = "style" | "theme";

type BuilderUiState = {
  isEditMode: boolean;
  isWorkspaceExpanded: boolean;
  selectedSectionId: string | null;
  hoveredSectionId: string | null;
  pendingSectionRemovalId: string | null;
  activeInspectorTab: BuilderInspectorTab;
  isCustomizeOpen: boolean;
  isQuickStartExpanded: boolean;
  isShareOpen: boolean;
  isTemplateOpen: boolean;
  isGitHubSignInHelpOpen: boolean;
};

type BuilderUiAction =
  | { type: "toggle_edit_mode"; nextOpen?: boolean }
  | { type: "toggle_workspace"; nextOpen?: boolean }
  | { type: "focus_section"; sectionId: string }
  | { type: "set_selected_section"; sectionId: string | null }
  | { type: "set_hovered_section"; sectionId: string | null }
  | { type: "request_section_removal"; sectionId: string }
  | { type: "cancel_section_removal" }
  | { type: "clear_section_removal"; sectionId?: string }
  | { type: "set_active_inspector_tab"; tab: BuilderInspectorTab }
  | { type: "toggle_customize_panel"; nextOpen?: boolean }
  | { type: "toggle_quick_start"; nextOpen?: boolean }
  | { type: "toggle_share_panel"; nextOpen?: boolean }
  | { type: "toggle_template_panel"; nextOpen?: boolean }
  | { type: "toggle_github_help"; nextOpen?: boolean };

const initialState: BuilderUiState = {
  isEditMode: false,
  isWorkspaceExpanded: true,
  selectedSectionId: null,
  hoveredSectionId: null,
  pendingSectionRemovalId: null,
  activeInspectorTab: "style",
  isCustomizeOpen: false,
  isQuickStartExpanded: false,
  isShareOpen: false,
  isTemplateOpen: false,
  isGitHubSignInHelpOpen: false,
};

function resolveToggle(current: boolean, nextOpen?: boolean) {
  return typeof nextOpen === "boolean" ? nextOpen : !current;
}

function builderUiReducer(state: BuilderUiState, action: BuilderUiAction): BuilderUiState {
  switch (action.type) {
    case "toggle_edit_mode":
      return {
        ...state,
        isEditMode: resolveToggle(state.isEditMode, action.nextOpen),
        pendingSectionRemovalId: null,
      };
    case "toggle_workspace":
      return {
        ...state,
        isWorkspaceExpanded: resolveToggle(state.isWorkspaceExpanded, action.nextOpen),
      };
    case "focus_section":
      return {
        ...state,
        selectedSectionId: action.sectionId,
        pendingSectionRemovalId:
          state.pendingSectionRemovalId === action.sectionId ? state.pendingSectionRemovalId : null,
        isEditMode: true,
      };
    case "set_selected_section":
      return {
        ...state,
        selectedSectionId: action.sectionId,
        pendingSectionRemovalId:
          action.sectionId && state.pendingSectionRemovalId === action.sectionId
            ? state.pendingSectionRemovalId
            : null,
      };
    case "set_hovered_section":
      return {
        ...state,
        hoveredSectionId: action.sectionId,
      };
    case "request_section_removal":
      return {
        ...state,
        pendingSectionRemovalId: action.sectionId,
      };
    case "cancel_section_removal":
      return {
        ...state,
        pendingSectionRemovalId: null,
      };
    case "clear_section_removal":
      return {
        ...state,
        pendingSectionRemovalId:
          !action.sectionId || state.pendingSectionRemovalId === action.sectionId
            ? null
            : state.pendingSectionRemovalId,
      };
    case "set_active_inspector_tab":
      return {
        ...state,
        activeInspectorTab: action.tab,
      };
    case "toggle_customize_panel":
      return {
        ...state,
        isCustomizeOpen: resolveToggle(state.isCustomizeOpen, action.nextOpen),
      };
    case "toggle_quick_start":
      return {
        ...state,
        isQuickStartExpanded: resolveToggle(state.isQuickStartExpanded, action.nextOpen),
      };
    case "toggle_share_panel":
      return {
        ...state,
        isShareOpen: resolveToggle(state.isShareOpen, action.nextOpen),
      };
    case "toggle_template_panel":
      return {
        ...state,
        isTemplateOpen: resolveToggle(state.isTemplateOpen, action.nextOpen),
      };
    case "toggle_github_help":
      return {
        ...state,
        isGitHubSignInHelpOpen: resolveToggle(state.isGitHubSignInHelpOpen, action.nextOpen),
      };
    default:
      return state;
  }
}

export function useRepo2SiteBuilderUiState() {
  const [state, dispatch] = useReducer(builderUiReducer, initialState);

  return {
    ...state,
    setActiveInspectorTab(tab: BuilderInspectorTab) {
      dispatch({ type: "set_active_inspector_tab", tab });
    },
    toggleCustomizePanel(nextOpen?: boolean) {
      dispatch({ type: "toggle_customize_panel", nextOpen });
    },
    toggleEditMode(nextOpen?: boolean) {
      dispatch({ type: "toggle_edit_mode", nextOpen });
    },
    toggleWorkspace(nextOpen?: boolean) {
      dispatch({ type: "toggle_workspace", nextOpen });
    },
    toggleQuickStart(nextOpen?: boolean) {
      dispatch({ type: "toggle_quick_start", nextOpen });
    },
    toggleSharePanel(nextOpen?: boolean) {
      dispatch({ type: "toggle_share_panel", nextOpen });
    },
    toggleTemplatePanel(nextOpen?: boolean) {
      dispatch({ type: "toggle_template_panel", nextOpen });
    },
    toggleGitHubHelp(nextOpen?: boolean) {
      dispatch({ type: "toggle_github_help", nextOpen });
    },
    focusSection(sectionId: string) {
      dispatch({ type: "focus_section", sectionId });
    },
    setSelectedSectionId(sectionId: string | null) {
      dispatch({ type: "set_selected_section", sectionId });
    },
    setHoveredSectionId(sectionId: string | null) {
      dispatch({ type: "set_hovered_section", sectionId });
    },
    requestSectionRemoval(sectionId: string) {
      dispatch({ type: "request_section_removal", sectionId });
    },
    cancelSectionRemoval() {
      dispatch({ type: "cancel_section_removal" });
    },
    clearSectionRemoval(sectionId?: string) {
      dispatch({ type: "clear_section_removal", sectionId });
    },
  };
}

export type Repo2SiteBuilderUiStateApi = ReturnType<typeof useRepo2SiteBuilderUiState>;
