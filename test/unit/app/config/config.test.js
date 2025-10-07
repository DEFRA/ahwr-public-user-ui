import { getConfig } from "../../../../app/config/index.js";

describe("Base config", () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  test("defaults used for missing values where applicable", () => {
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_HOSTNAME;
    delete process.env.PORT;

    const config = getConfig();

    expect(config.cache.options.port).toBe(6379);
    expect(config.cache.options.host).toBe("redis-hostname.default");
    expect(config.port).toBe(3000);
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
});
