if (typeof document !== "undefined") {
  const { toHaveNoViolations } = require("jest-axe");
  expect.extend(toHaveNoViolations);
}

expect.extend({
  toExistOnce(received) {
    const count = received?.length ?? 0;
    const pass = count === 1;
    return {
      pass,
      message: () =>
        pass
          ? "expected the component not to exist exactly once, but found exactly one"
          : `expected the component to exist exactly once, but found ${count}`,
    };
  },
  toBeAbsent(received) {
    const count = received?.length ?? 0;
    const pass = count === 0;
    return {
      pass,
      message: () =>
        pass
          ? "expected the component to be present, but found none"
          : `expected the component to be absent, but found ${count}`,
    };
  },
});
