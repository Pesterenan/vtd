export const MIGRATION = {
  ToolMenu: true,
  SideMenu: true,
  TransformMenu: true,
  LayersMenu: true,
  TextMenu: true,
  GradientMenu: true,
  Alerts: false,
  LoadingOverlay: false,
  Dialogs: false,
  VideoFrameExtractor: false,
} as const;

export type MigrationFlag = keyof typeof MIGRATION;
