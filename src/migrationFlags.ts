export const MIGRATION = {
  ToolMenu: true,
  SideMenu: true,
  TransformMenu: true,
  LayersMenu: true,
  TextMenu: true,
  GradientMenu: true,
  Alerts: true,
  LoadingOverlay: true,
  Dialogs: true,
  VideoFrameExtractor: false,
} as const;

export type MigrationFlag = keyof typeof MIGRATION;
