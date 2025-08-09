import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";
import { WebpackPlugin } from "@electron-forge/plugin-webpack";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

import { mainConfig } from "./webpack.main.config";
import { rendererConfig } from "./webpack.renderer.config";

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: "resources/icon",
    executableName: "vtd",
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      authors: "Renan Torres",
      description: "Editor de miniaturas para vídeos.",
      name: "vtd",
      setupExe: "vtd-setup.exe",
      setupIcon: "resources/icon.ico",
      setupMsi: "vtd-installer.msi",
    }),
    new MakerZIP({}, ["darwin"]),
    new MakerRpm({
      options: {
        name: "vtd",
        genericName: "Video Thumbnail Designer",
        homepage: "https://github.com/Pesterenan/vtd",
      },
    }),
    new MakerDeb({
      options: {
        genericName: "Video Thumbnail Designer",
        homepage: "https://github.com/Pesterenan/vtd",
        icon: "resources/icon.png",
        maintainer: "Renan Torres",
        name: "vtd",
        priority: "optional",
        section: "video",
      },
    }),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      devContentSecurityPolicy:
        "default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-eval' 'unsafe-inline' data:",
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: "./src/index.html",
            js: "./src/renderer.ts",
            name: "main_window",
            preload: {
              js: "./src/preload.ts",
            },
          },
          {
            html: "./src/modals/videoFrameExtractor/video-frame-extractor.html",
            js: "./src/modals/videoFrameExtractor/index.ts",
            name: "video_frame_extractor",
            preload: {
              js: "./src/preload.ts",
            },
          },
        ],
      },
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
