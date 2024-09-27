const EVENT: Record<string, string> = {
  ADD_ELEMENT: "evt_add-element",
  ADD_TEXT_ELEMENT: "evt_add-text-element",
  CLEAR_WORKAREA: "evt_clear-workarea",
  CHANGE_LAYER_NAME: "evt_change_layer_name",
  DELETE_ELEMENT: "evt_delete-element",
  REORGANIZE_LAYERS: "evt_layers-reorganized",
  RECALCULATE_TRANSFORM_BOX: "evt_transform-box-recalculated",
  SELECT_ELEMENT: "evt_select_element",
  TOGGLE_ELEMENT_VISIBILITY: "evt_toggle_element_visibility",
  UPDATE_WORKAREA: "evt_update-workarea",
  UPDATE_VFE: "evt_update-video-frame-extractor",
} as const;

export default EVENT;
