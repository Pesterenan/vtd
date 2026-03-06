import type { ISelectOption } from "./components/helpers/createSelectInput";

export const TOOL_MENU_WIDTH = 40;
export const SIDE_MENU_WIDTH = 320;

export const OPTION_SEPARATOR_VALUE = 'OPTION_SEPARATOR_VALUE';

// Keys for the template data
export const T_480P_WIDE = "480p (SD wide)";
export const T_720P_HD = "720p (HD)";
export const T_900P_HD_PLUS = "900p (HD+)";
export const T_1080P_FULL_HD = "Youtube Miniatura (Full HD)";
export const T_INSTA_SQUARE = "Instagram Post (Quadrado)";
export const T_INSTA_PORTRAIT = "Instagram Post (Retrato)";
export const T_INSTA_LANDSCAPE = "Instagram Post (Paisagem)";
export const T_FACEBOOK_POST = "Facebook Post";

export const TEMPLATE_DATA: Record<string, { height: number; width: number }> = {
  [T_480P_WIDE]: { width: 854, height: 480 },
  [T_720P_HD]: { width: 1280, height: 720 },
  [T_900P_HD_PLUS]: { width: 1600, height: 900 },
  [T_1080P_FULL_HD]: { width: 1920, height: 1080 },
  [T_INSTA_SQUARE]: { width: 1080, height: 1080 },
  [T_INSTA_PORTRAIT]: { width: 1080, height: 1350 },
  [T_INSTA_LANDSCAPE]: { width: 1080, height: 566 },
  [T_FACEBOOK_POST]: { width: 1200, height: 630 },
};

export const TEMPLATE_OPTIONS: Array<ISelectOption> = [
  { label: "Personalizado", value: "CUSTOM" },
  { label: "--- Padrões de Vídeo ---", value: OPTION_SEPARATOR_VALUE },
  { label: T_480P_WIDE, value: T_480P_WIDE },
  { label: T_720P_HD, value: T_720P_HD },
  { label: T_900P_HD_PLUS, value: T_900P_HD_PLUS },
  { label: T_1080P_FULL_HD, value: T_1080P_FULL_HD },
  { label: "--- Redes Sociais ---", value: OPTION_SEPARATOR_VALUE },
  { label: T_INSTA_SQUARE, value: T_INSTA_SQUARE },
  { label: T_INSTA_PORTRAIT, value: T_INSTA_PORTRAIT },
  { label: T_INSTA_LANDSCAPE, value: T_INSTA_LANDSCAPE },
  { label: T_FACEBOOK_POST, value: T_FACEBOOK_POST },
];

