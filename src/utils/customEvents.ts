import type { AddAlertDetail, AddElementDetail, ChangeToolDetail } from "src/components/types";

const EVENT = {
  ADD_ALERT: "ADD_ALERT",
  ADD_ELEMENT: "ADD_ELEMENT",
  CHANGE_LAYER_NAME: "CHANGE_LAYER_NAME",
  CHANGE_TOOL: "CHANGE_TOOL",
  CLEAR_WORKAREA: "CLEAR_WORKAREA",
  DELETE_ELEMENT: "DELETE_ELEMENT",
  OPEN_EXPORT_IMAGE_DIALOG: "OPEN_EXPORT_IMAGE_DIALOG",
  OPEN_FILTERS_DIALOG: "OPEN_FILTERS_DIALOG",
  RECALCULATE_TRANSFORM_BOX: "RECALCULATE_TRANSFORM_BOX",
  REORGANIZE_LAYERS: "REORGANIZE_LAYERS",
  SELECT_ELEMENT: "SELECT_ELEMENT",
  TOGGLE_ELEMENT_LOCK: "TOGGLE_ELEMENT_LOCK",
  TOGGLE_ELEMENT_VISIBILITY: "TOGGLE_ELEMENT_VISIBILITY",
  UPDATE_VFE: "UPDATE_VFE",
  UPDATE_WORKAREA: "UPDATE_WORKAREA",
  USING_TOOL: "USING_TOOL",
} as const;

declare global {
  interface WindowEventMap {
    [EVENT.ADD_ALERT]: AddAlertDetail;
    [EVENT.ADD_ELEMENT]: AddElementDetail;
    [EVENT.CHANGE_LAYER_NAME]: unknown;
    [EVENT.CHANGE_TOOL]: ChangeToolDetail;
    [EVENT.CLEAR_WORKAREA]: void;
    [EVENT.DELETE_ELEMENT]: unknown;
    [EVENT.OPEN_EXPORT_IMAGE_DIALOG]: unknown;
    [EVENT.OPEN_FILTERS_DIALOG]: unknown;
    [EVENT.RECALCULATE_TRANSFORM_BOX]: unknown;
    [EVENT.REORGANIZE_LAYERS]: unknown;
    [EVENT.SELECT_ELEMENT]: unknown;
    [EVENT.TOGGLE_ELEMENT_LOCK]: unknown;
    [EVENT.TOGGLE_ELEMENT_VISIBILITY]: unknown;
    [EVENT.UPDATE_VFE]: unknown;
    [EVENT.UPDATE_WORKAREA]: unknown;
    [EVENT.USING_TOOL]: unknown;
  }
}

type EventName = (typeof EVENT)[keyof typeof EVENT];

export function dispatch<E extends EventName>(
  evt: E,
  detail?: WindowEventMap[E],
): void {
  window.dispatchEvent(new CustomEvent(evt, { detail }));
}

export default EVENT;
