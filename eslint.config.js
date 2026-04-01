import neostandard from "neostandard";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import importPlugin from "eslint-plugin-import";

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
];
