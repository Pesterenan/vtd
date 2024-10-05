import type { Configuration } from "webpack";
import path from 'path';
import { rules } from "./webpack.rules";
import { plugins } from "./webpack.plugins";

rules.push({
  test: /\.css$/,
  use: [{ loader: "style-loader" }, { loader: "css-loader" }],
});
rules.push({
  test: /\.svg$/,
  type: "asset/resource",
  generator: {
    filename: "assets/[hash][ext][query]",
  },
});

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  plugins,
  resolve: {
    alias: {
      'src': path.resolve(__dirname, 'src')
    },
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css"],
  },
};
