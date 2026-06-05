export const MIGRATION = {
  ToolMenu: true,
  SideMenu: true,
  TransformMenu: true,
  LayersMenu: true,
  TextMenu: false,
  GradientMenu: false,
  Alerts: false,
  LoadingOverlay: false,
  Dialogs: false,
  VideoFrameExtractor: false,
} as const;

export type MigrationFlag = keyof typeof MIGRATION;
