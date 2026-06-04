export const MIGRATION = {
  ToolMenu: true,
  SideMenu: true,
  TransformMenu: false,
  LayersMenu: false,
  TextMenu: false,
  GradientMenu: false,
  Alerts: false,
  LoadingOverlay: false,
  Dialogs: false,
  VideoFrameExtractor: false,
} as const;

export type MigrationFlag = keyof typeof MIGRATION;
