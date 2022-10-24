const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const DotenvPlugin = require("dotenv-webpack");
const { DefinePlugin } = require("webpack");
const path = require("path");

const cesium = path.dirname(require.resolve("cesium"));
const cesiumSource = path.join(cesium, "Source");
const cesiumWorkers = "../Build/CesiumUnminified/Workers";

const packageSrc = (name) => path.resolve(__dirname, "deps", name, "src");

module.exports = {
  mode: "development",
  // Enable sourcemaps for debugging webpack's output.
  devtool: "source-map",
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
    alias: {
      cesium,
      cesiumSource,
      "@macrostrat/map-panel": packageSrc("map-panel"),
      "maplibre-gl": path.resolve(__dirname, "..", "packages", "maplibre-gl"),
      react: path.resolve(__dirname, "node_modules", "react"),
      "react-dom": path.resolve(__dirname, "node_modules", "react-dom"),
    },
    fallback: { path: false },
  },
  module: {
    unknownContextCritical: false,
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        use: ["babel-loader"],
        exclude: [/node_modules/, /..\/packages\/maplibre-gl\/dist/],
      },
      {
        test: /\.(png|svg)$/,
        use: ["file-loader"],
      },
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
      // // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
      {
        enforce: "pre",
        test: /\.js$/,
        loader: "source-map-loader",
      },
      {
        test: /\.glsl$/,
        loader: "webpack-glsl-loader",
      },
      // https://github.com/CesiumGS/cesium/issues/9790#issuecomment-943773870
      {
        test: /.js$/,
        include: cesiumSource,
        use: { loader: require.resolve("@open-wc/webpack-import-meta-loader") },
      },
    ],
  },
  entry: {
    index: "./src/index.ts",
  },
  amd: {
    // Enable webpack-friendly use of require in Cesium
    toUrlUndefined: true,
  },
  output: {
    publicPath: "auto",
  },
  plugins: [
    new HtmlWebpackPlugin({ title: "Mapbox / Cesium Vector Provider" }),
    new CopyPlugin({
      patterns: [
        { from: path.join(cesiumSource, cesiumWorkers), to: "Workers" },
        { from: path.join(cesiumSource, "Assets"), to: "Assets" },
        { from: path.join(cesiumSource, "Widgets"), to: "Widgets" },
      ],
    }),
    new DotenvPlugin(),
    new DefinePlugin({
      // Define relative base path in cesium for loading assets
      CESIUM_BASE_URL: JSON.stringify(process.env.PUBLIC_PATH ?? "/"),
    }),
  ],
};
