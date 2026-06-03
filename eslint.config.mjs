import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";
import security from "eslint-plugin-security";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // SonarJS plugin for code quality
  {
    plugins: {
      sonarjs,
      security,
    },
    rules: {
      // SonarQube aligned rules
      "no-console": "warn",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": [
        "warn",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],

      // Complexity rules
      complexity: ["error", { max: 10 }],
      // React 컴포넌트(JSX)는 50줄이 비현실적으로 빡빡 → 80으로 상향(공백/주석 제외 기준).
      // 80 초과의 진짜 비대 함수는 서브컴포넌트/헬퍼로 분해해 해소(임계값 우회 아님, 현실치 + 분해 병행).
      "max-lines-per-function": [
        "warn",
        { max: 80, skipBlankLines: true, skipComments: true },
      ],
      "max-depth": ["error", { max: 4 }],
      "max-nested-callbacks": ["error", { max: 3 }],

      // SonarJS rules
      "sonarjs/cognitive-complexity": ["error", 15],
      "sonarjs/no-duplicate-string": ["error", { threshold: 3 }],
      "sonarjs/no-identical-functions": "error",
      "sonarjs/no-collapsible-if": "error",
      "sonarjs/prefer-immediate-return": "error",
      "sonarjs/no-redundant-jump": "error",

      // Security rules
      "security/detect-object-injection": "warn",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-unsafe-regex": "error",

      // Best practices
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      "prefer-template": "error",
      "no-nested-ternary": "error",

      // CLAUDE.md enforced rules
      "@typescript-eslint/no-non-null-assertion": "error",
      "no-restricted-globals": ["error", { name: "window", message: "Use globalThis instead of window." }, { name: "global", message: "Use globalThis instead of global." }],
      "no-restricted-properties": ["error", { object: "window", message: "Use globalThis instead of window." }],
    },
  },

  // Relax rules for shadcn/ui generated components
  {
    files: ["src/components/ui/**/*.tsx"],
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "max-lines-per-function": "off",
    },
  },
  // Relax max-lines for test files (describe blocks are naturally long)
  {
    files: ["__tests__/**/*.{ts,tsx}"],
    rules: {
      "max-lines-per-function": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "next-env.d.ts",
    "node_modules/**",
    "scripts/**",
    "scripts-temp/**",
    ".sonar-jscpd/**",
    ".sonar-scan/**",
    ".claude/hooks/**",
    "clone-*.mjs",
  ]),
]);

export default eslintConfig;
