import babel from "@rollup/plugin-babel";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import postcss from "rollup-plugin-postcss";
import autoprefixer from "autoprefixer";
import cssnano from "cssnano";

export default {
  input: "src/index.js",
  output: [
    {
      file: "dist/securent-fb-widget.js",
      format: "iife",
      name: "SecureNTFacebookWidget",
      sourcemap: false,
    },
    {
      file: "dist/securent-fb-widget.min.js",
      format: "iife",
      name: "SecureNTFacebookWidget",
      sourcemap: false,
      plugins: [terser()],
    },
  ],
  plugins: [
    resolve(),
    babel({
      babelHelpers: "bundled",
      presets: [
        [
          "@babel/preset-env",
          {
            targets: {
              chrome: "90",
              firefox: "88",
              safari: "14",
              edge: "90",
            },
          },
        ],
      ],
      exclude: "node_modules/**",
    }),
    postcss({
      extract: "securent-fb-widget.css",
      minimize: true,
      sourceMap: false,
      plugins: [
        autoprefixer(),
        cssnano({
          preset: "default",
        }),
      ],
    }),
  ],
};
