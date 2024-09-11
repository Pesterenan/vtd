const EVENT: Record<string, string> = {
  ADD_ELEMENT: 'evt_add-element',
  CLEAR_WORKAREA: 'evt_clear-workarea',
  DELETE_ELEMENT: 'evt_delete-element',
  REORGANIZE_LAYERS: 'evt_layers-reorganized',
  RECALCULATE_TRANSFORM_BOX: 'evt_transform-box-recalculated',
  UPDATE_WORKAREA: 'evt_update-workarea'
} as const;

export default EVENT;
