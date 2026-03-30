import { configureAxe } from "jest-axe";

export const axe = configureAxe({
  runOnly: {
    type: "tag",
    values: ["wcag22aa"],
  },
  rules: {
    list: { enabled: true },
  },
});
