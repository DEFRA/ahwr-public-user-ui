if (typeof document !== "undefined") {
  const { toHaveNoViolations } = require("jest-axe");
  expect.extend(toHaveNoViolations);
}
