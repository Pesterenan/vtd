import type { Configuration } from "webpack";
import path from "path";
import { rules } from "./webpack.rules";
import { plugins } from "./webpack.plugins";

export const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: "./src/index.ts",
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins,
  resolve: {
    alias: {
      src: path.resolve(__dirname, "src"),
    },
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".json"],
  },
};
