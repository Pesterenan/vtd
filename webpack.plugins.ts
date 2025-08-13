import { DefinePlugin } from "webpack";
import packageJson from "./package.json";

import forkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";

export const plugins = [
  new forkTsCheckerWebpackPlugin({
    logger: "webpack-infrastructure",
  }),
  new DefinePlugin({
    APP_VERSION: JSON.stringify(packageJson.version),
  }),
];
