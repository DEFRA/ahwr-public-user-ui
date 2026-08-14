import neostandard from "neostandard";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import importPlugin from "eslint-plugin-import";
import sonarjs from "eslint-plugin-sonarjs";

export default [
  ...neostandard({
    env: ["node", "jest", "browser"],
    ignores: ["app/frontend/dist/**/*", "\\.#*"],
  }),
  eslintConfigPrettier,
  {
    plugins: { import: importPlugin },
    rules: {
      "import/extensions": ["error", "always", { ignorePackages: true }],
    },
  },
  sonarjs.configs.recommended,
  {
    rules: {
      "sonarjs/no-commented-code": "error",
    },
  },
];
