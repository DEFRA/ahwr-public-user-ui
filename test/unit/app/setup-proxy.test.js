import { config } from "../../../app/config/index.js";
import { setupProxy } from "../../../app/lib/setup-proxy.js";

describe("setupProxy", () => {
  afterEach(() => {
    config.set("proxy", null);
  });

  test("Should not setup proxy if the environment variable is not set", () => {
    config.set("proxy", null);
    setupProxy();

    expect(global?.GLOBAL_AGENT?.HTTP_PROXY).toBeUndefined();
  });

  test("Should setup proxy if the environment variable is set", () => {
    config.set("proxy", "http://localhost:8080");
    setupProxy();
    expect(global?.GLOBAL_AGENT?.HTTP_PROXY).toBe("http://localhost:8080");
  });
});
