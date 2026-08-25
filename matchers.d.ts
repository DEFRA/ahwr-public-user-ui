// Ambient types for the custom Jest matchers registered in this repo
// Lives at the repo root (not test/, which jsconfig.json excludes) so the
// augmentation is visible to the co-located *.test.js files under app/.
interface CustomMatchers<R = unknown> {
  /**
   * Asserts a cheerio selection matched exactly one element.
   *
   * @example expect($("#claimDocument")).toExistOnce();
   */
  toExistOnce(): R;

  /**
   * Asserts a cheerio selection matched no elements.
   *
   * @example expect($("#claimDocument")).toBeAbsent();
   */
  toBeAbsent(): R;

  /**
   * Asserts a loaded cheerio document shows the standard GOV.UK beta phase banner.
   *
   * @example
   * const $ = cheerio.load(response.payload);
   * expect($).toShowPhaseBanner();
   */
  toShowPhaseBanner(): R;

  /**
   * Asserts a loaded cheerio document shows the date-of-visit page content.
   *
   * @param previousPageUrl - the expected back-link href
   * @example
   * const $ = cheerio.load(response.payload);
   * expect($).toShowDateOfVisitPage(livestockClaimRoutes.whichTypeOfReview);
   */
  toShowDateOfVisitPage(previousPageUrl: string): R;

  /**
   * Asserts `shouldShowManageYourClaims` returns true for the request once the
   * relevant session lookup has been stubbed by the matcher.
   *
   * @param options.mockSessionData - stubs the endemics or poultry session lookup
   * @param options.application - the latest application the session returns
   * @example
   * expect({ path, method: "get" }).toShowManageYourClaims({
   *   mockSessionData: mockEndemicsSessionData,
   *   application: { status: "AGREED" },
   * });
   */
  toShowManageYourClaims(options: {
    mockSessionData: (request: object, application: object) => void;
    application: object;
  }): R;
}

declare global {
  namespace jest {
    interface Matchers<R> extends CustomMatchers<R> {}
  }
}

export {};
