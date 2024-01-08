import styleXPlugin from "@stylexjs/babel-plugin";

const config = {
  plugins: [
    [
      styleXPlugin,
      {
        dev: true,
        // Set this to true for snapshot testing
        // default: false
        test: false,
        // Required for CSS variable support
        unstable_moduleResolution: {
          // type: 'commonJS' | 'haste'
          // default: 'commonJS'
          type: "haste",
          // The absolute path to the root directory of your project
          // rootDir: __dirname,
        },
      },
    ],
    ["module:@preact/signals-react-transform"],
  ],
};

export default config;
