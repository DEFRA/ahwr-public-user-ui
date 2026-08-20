import { getConfig } from "../../../../app/config/index.js";

describe("Base config", () => {
  const env = {
    APPLICATION_API_URI: "https://ahwr-application-backend",
    AWS_REGION: "eu-west-2",
    COOKIE_PASSWORD: "testtestesttesttesttesttesttestesttesttesttest",
    TERMS_AND_CONDITIONS_URL: "test",
    POULTRY_TERMS_AND_CONDITIONS_URL: "test",
    POULTRY_VET_SUMMARY_TEMPLATE_URL: "test",
    MESSAGE_QUEUE_HOST: "something.servicebus.windows.net",
    MESSAGE_QUEUE_USER: "message-queue-user",
    FCP_AHWR_EVENT_QUEUE_SA_KEY: "fcp-eenue-qery",
    EVENT_QUEUE_ADDRESS: "ffc-ahwr-event-xyz",
    DOCUMENT_BUCKET_NAME: "dev-ahwr-documents-xyz",
    SESSION_TIMEOUT_MILLISECONDS: "1800000",
  };

  beforeEach(() => {
    jest.replaceProperty(process, "env", env);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("environment variables used for overriding values", () => {
    jest.replaceProperty(process, "env", { ...env, WRECK_HTTP_TIMEOUT_MILLISECONDS: "5000" });

    const config = getConfig();

    expect(config.get("wreckHttp.timeoutMilliseconds")).toBe(5000);
  });

  test("session cookie and cache uses SESSION_TIMEOUT_MILLISECONDS", () => {
    const config = getConfig();

    expect(config.get("cache.expiresIn")).toBe(1800000);
    expect(config.get("cookie.ttl")).toBe(1800000);
  });

  test("should throw an error if config is invalid", () => {
    const { TERMS_AND_CONDITIONS_URL, ...envWithoutTerms } = env;
    jest.replaceProperty(process, "env", { ...envWithoutTerms });

    expect(() => getConfig()).toThrow(/latestTermsAndConditionsUri/);
  });

  test("should throw an error if poultry terms and conditions URL is missing", () => {
    const { POULTRY_TERMS_AND_CONDITIONS_URL, ...envWithoutTerms } = env;
    jest.replaceProperty(process, "env", { ...envWithoutTerms });
    expect(() => getConfig()).toThrow(/poultry\.termsAndConditionsUri/);
  });

  test("should throw an error if poultry vet summary template URL is missing", () => {
    const { POULTRY_VET_SUMMARY_TEMPLATE_URL, ...envWithoutTemplate } = env;
    jest.replaceProperty(process, "env", { ...envWithoutTemplate });
    expect(() => getConfig()).toThrow(/poultry\.vetSummaryTemplateUri/);
  });

  test("poultry interview page is enabled by default", () => {
    const config = getConfig();

    expect(config.get("poultry.disableInterviewPage")).toBe(false);
  });

  test("poultry interview page can be disabled via DISABLE_INTERVIEW_PAGE=true", () => {
    jest.replaceProperty(process, "env", { ...env, DISABLE_INTERVIEW_PAGE: "true" });

    const config = getConfig();

    expect(config.get("poultry.disableInterviewPage")).toBe(true);
  });
});
