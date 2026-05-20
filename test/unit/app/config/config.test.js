import { getConfig } from "../../../../app/config/index.js";

describe("Base config", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  test("environment variables used for overriding values", () => {
    process.env.DISPLAY_PAGE_SIZE = "100";

    const config = getConfig();

    expect(config.displayPageSize).toBe(100);
  });

  test("should throw an error if config is invalid", () => {
    delete process.env.TERMS_AND_CONDITIONS_URL;
    expect(() => getConfig()).toThrow(
      'The server config is invalid. "latestTermsAndConditionsUri" is required',
    );
  });

  test("should throw an error if poultry terms and conditions URL is missing", () => {
    delete process.env.POULTRY_TERMS_AND_CONDITIONS_URL;
    expect(() => getConfig()).toThrow(/poultry.*termsAndConditionsUri.*required/);
  });

  test("should throw an error if poultry vet summary template URL is missing", () => {
    delete process.env.POULTRY_VET_SUMMARY_TEMPLATE_URL;
    expect(() => getConfig()).toThrow(/poultry.*vetSummaryTemplateUri.*required/);
  });
});
