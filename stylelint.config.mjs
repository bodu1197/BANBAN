/** @type {import('stylelint').Config} */
const config = {
  extends: ["stylelint-config-standard"],
  rules: {
    // Tailwind CSS directives
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "tailwind",
          "apply",
          "layer",
          "config",
          "theme",
          "custom-variant",
          "import",
        ],
      },
    ],
    // Allow Tailwind functions
    "function-no-unknown": [
      true,
      {
        ignoreFunctions: ["theme", "oklch", "var"],
      },
    ],
    // Selector complexity limits
    "selector-max-compound-selectors": 3,
    "selector-max-id": 0,
    // No duplicate properties
    "declaration-block-no-duplicate-properties": true,
    // Limit !important usage
    "declaration-no-important": true,
    // No empty blocks
    "block-no-empty": true,
    // Allow modern CSS
    "media-feature-range-notation": null,
    // Disable rules that conflict with Tailwind
    "import-notation": null,
    "no-descending-specificity": null,
    // Allow @theme inline syntax
    "selector-pseudo-class-no-unknown": [
      true,
      {
        ignorePseudoClasses: ["global"],
      },
    ],
  },
  ignoreFiles: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx", "node_modules/**"],
};
export default config;
