import { getConfig } from "../../../../app/config/index.js";

describe("Base config", () => {
  const env = process.env;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("environment variables used for overriding values", () => {
    jest.replaceProperty(process, "env", { ...env, DISPLAY_PAGE_SIZE: "100" });

    const config = getConfig();

    expect(config.displayPageSize).toBe(100);
  });

  test("session cookie and cache expires in 3 days", () => {
    const config = getConfig();

    expect(config).toHaveProperty("cache.expiresIn", 259200000);
    expect(config).toHaveProperty("cookie.ttl", 259200000);
  });

  test("should throw an error if config is invalid", () => {
    const { TERMS_AND_CONDITIONS_URL, ...envWithoutTerms } = env;
    jest.replaceProperty(process, "env", { ...envWithoutTerms });

    expect(() => getConfig()).toThrow(
      'The server config is invalid. "latestTermsAndConditionsUri" is required',
    );
  });

  test("should throw an error if poultry terms and conditions URL is missing", () => {
    const { POULTRY_TERMS_AND_CONDITIONS_URL, ...envWithoutTerms } = env;
    jest.replaceProperty(process, "env", { ...envWithoutTerms });
    expect(() => getConfig()).toThrow(/poultry.*termsAndConditionsUri.*required/);
  });

  test("should throw an error if poultry vet summary template URL is missing", () => {
    const { POULTRY_VET_SUMMARY_TEMPLATE_URL, ...envWithoutTemplate } = env;
    jest.replaceProperty(process, "env", { ...envWithoutTemplate });
    expect(() => getConfig()).toThrow(/poultry.*vetSummaryTemplateUri.*required/);
  });

  test("poultry interview page is enabled by default", () => {
    const config = getConfig();

    expect(config.poultry.disableInterviewPage).toBe(false);
  });

  test("poultry interview page can be disabled via DISABLE_INTERVIEW_PAGE=true", () => {
    jest.replaceProperty(process, "env", { ...env, DISABLE_INTERVIEW_PAGE: "true" });

    const config = getConfig();

    expect(config.poultry.disableInterviewPage).toBe(true);
  });
});
