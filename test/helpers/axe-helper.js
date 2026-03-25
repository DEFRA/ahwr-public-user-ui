import { configureAxe } from "jest-axe";

export const axe = configureAxe({
  runOnly: {
    type: "tag",
    values: ["wcag22aa"],
  },
  rules: {
    // FIXME rpa-contact-details.njk uses a <br> inside <ul>
    list: { enabled: false },
  },
});
