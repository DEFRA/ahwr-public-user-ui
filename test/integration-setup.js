if (typeof document !== "undefined") {
  const { toHaveNoViolations } = require("jest-axe");
  expect.extend(toHaveNoViolations);
}

expect.extend({
  /**
   * Asserts that a cheerio selection matched exactly one element.
   *
   * @param {{ length: number }} received - a cheerio selection, e.g. `$("#claim")`
   * @returns {{ pass: boolean, message: () => string }}
   * @example
   * expect($("#claimDocument")).toExistOnce();
   */
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

  /**
   * Asserts that a cheerio selection matched no elements.
   *
   * @param {{ length: number }} received - a cheerio selection, e.g. `$("#claim")`
   * @returns {{ pass: boolean, message: () => string }}
   * @example
   * expect($("#claimDocument")).toBeAbsent();
   */
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

  /**
   * Asserts a loaded cheerio document shows the standard GOV.UK beta phase banner.
   *
   * @param {import("cheerio").CheerioAPI} $ - a loaded cheerio document
   * @returns {{ pass: boolean, message: () => string }}
   * @example
   * const $ = cheerio.load(response.payload);
   * expect($).toShowPhaseBanner();
   */
  toShowPhaseBanner($) {
    const banner = $(".govuk-phase-banner");
    const text = banner.text();
    const pass =
      banner.length === 1 && text.includes("beta") && text.includes("This is a new service");
    return {
      pass,
      message: () =>
        pass
          ? "expected not to show the beta phase banner"
          : `expected to show exactly one beta phase banner reading "This is a new service", ` +
            `but found ${banner.length} banner(s) with text "${text}"`,
    };
  },
});
