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

  /**
   * Asserts a loaded cheerio document shows the date-of-visit page content.
   *
   * @param {import("cheerio").CheerioAPI} $ - a loaded cheerio document
   * @param {string} previousPageUrl - the expected back-link href
   * @returns {{ pass: boolean, message: () => string }}
   * @example
   * expect($).toShowDateOfVisitPage(livestockClaimRoutes.whichTypeOfReview);
   */
  toShowDateOfVisitPage($, previousPageUrl) {
    const backLink = $(".govuk-back-link");
    const checks = {
      title:
        /Date of livestock review|follow-up - Get funding to improve animal health and welfare/i.test(
          $("title").text(),
        ),
      heading: /(Date of review | follow-up)/i.test($("h1").text().trim()),
      "intro paragraph":
        /(This is the date the vet last visited the farm for this review\. You can find it on the summary the vet gave you\.| follow-up)/i.test(
          $("p").text(),
        ),
      hint: $("#visit-date-hint").text().includes("For example, 27 3 2022"),
      "day label": $("label[for=visit-date-day]").text().includes("Day"),
      "month label": $("label[for=visit-date-month]").text().includes("Month"),
      "year label": $("label[for=visit-date-year]").text().includes("Year"),
      "continue button": $(".govuk-button").text().includes("Continue"),
      "back link text": backLink.text().includes("Back"),
      "back link href": (backLink.attr("href") ?? "").includes(previousPageUrl),
    };
    const failed = Object.keys(checks).filter((name) => !checks[name]);
    const pass = failed.length === 0;
    return {
      pass,
      message: () =>
        pass
          ? "expected the document not to show the date-of-visit page content"
          : `expected the date-of-visit page content, but these checks failed: ${failed.join(", ")}`,
    };
  },
});
