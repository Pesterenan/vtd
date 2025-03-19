const EVENT: Record<string, string> = {
  ADD_ELEMENT: "evt_add-element",
  CLEAR_WORKAREA: "evt_clear-workarea",
  CHANGE_LAYER_NAME: "evt_change_layer_name",
  CHANGE_TOOL: "evt_change_tool",
  USING_TOOL: "evt_using_tool",
  DELETE_ELEMENT: "evt_delete-element",
  OPEN_FILTERS_DIALOG: "evt_open-filters-dialog",
  REORGANIZE_LAYERS: "evt_layers-reorganized",
  RECALCULATE_TRANSFORM_BOX: "evt_transform-box-recalculated",
  SELECT_ELEMENT: "evt_select_element",
  TOGGLE_ELEMENT_LOCK: "evt_toggle_element_lock",
  TOGGLE_ELEMENT_VISIBILITY: "evt_toggle_element_visibility",
  UPDATE_WORKAREA: "evt_update-workarea",
  UPDATE_VFE: "evt_update-video-frame-extractor",
} as const;

export default EVENT;
