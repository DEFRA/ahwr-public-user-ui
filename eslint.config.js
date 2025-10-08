import neostandard from "neostandard";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default [
  ...neostandard({
    env: ["node", "jest", "browser"],
    ignores: ["app/frontend/dist/**/*"],
  }),
  eslintConfigPrettier,
];
