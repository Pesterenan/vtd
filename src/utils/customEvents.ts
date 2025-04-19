import type { AddAlertDetail, AddElementDetail, ChangeToolDetail, DeleteElementDetail, OpenFiltersDialogDetail, RecalculateTransformBoxDetail, ReorganizeLayersDetail, SelectElementDetail, UpdateElementDetail, UsingToolDetail } from "src/components/types";

const EVENT = {
  ADD_ALERT: "ADD_ALERT",
  ADD_ELEMENT: "ADD_ELEMENT",
  CHANGE_TOOL: "CHANGE_TOOL",
  CLEAR_WORKAREA: "CLEAR_WORKAREA",
  DELETE_ELEMENT: "DELETE_ELEMENT",
  OPEN_EXPORT_IMAGE_DIALOG: "OPEN_EXPORT_IMAGE_DIALOG",
  OPEN_FILTERS_DIALOG: "OPEN_FILTERS_DIALOG",
  RECALCULATE_TRANSFORM_BOX: "RECALCULATE_TRANSFORM_BOX",
  REORGANIZE_LAYERS: "REORGANIZE_LAYERS",
  SELECT_ELEMENT: "SELECT_ELEMENT",
  UPDATE_ELEMENT: "UPDATE_ELEMENT",
  UPDATE_VFE: "UPDATE_VFE",
  UPDATE_WORKAREA: "UPDATE_WORKAREA",
  USING_TOOL: "USING_TOOL",
} as const;

declare global {
  interface WindowEventMap {
    [EVENT.ADD_ALERT]: CustomEvent<AddAlertDetail>;
    [EVENT.ADD_ELEMENT]: CustomEvent<AddElementDetail>;
    [EVENT.CHANGE_TOOL]: CustomEvent<ChangeToolDetail>;
    [EVENT.CLEAR_WORKAREA]: CustomEvent<void>;
    [EVENT.DELETE_ELEMENT]: CustomEvent<DeleteElementDetail>;
    [EVENT.OPEN_EXPORT_IMAGE_DIALOG]: CustomEvent<void>;
    [EVENT.OPEN_FILTERS_DIALOG]: CustomEvent<OpenFiltersDialogDetail>;
    [EVENT.RECALCULATE_TRANSFORM_BOX]: CustomEvent<RecalculateTransformBoxDetail>;
    [EVENT.REORGANIZE_LAYERS]: CustomEvent<ReorganizeLayersDetail>;
    [EVENT.SELECT_ELEMENT]: CustomEvent<SelectElementDetail>;
    [EVENT.UPDATE_ELEMENT]: CustomEvent<UpdateElementDetail>;
    [EVENT.UPDATE_VFE]: CustomEvent<void>;
    [EVENT.UPDATE_WORKAREA]: CustomEvent<void>;
    [EVENT.USING_TOOL]: CustomEvent<UsingToolDetail>;
  }
}

type EventName = (typeof EVENT)[keyof typeof EVENT];

export function dispatch<E extends EventName>(
  evt: E,
  detail?: WindowEventMap[E]["detail"],
): void {
  window.dispatchEvent(new CustomEvent(evt, { detail }));
}

export default EVENT;
