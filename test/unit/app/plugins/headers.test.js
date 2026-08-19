import { createServer } from "../../../../app/server.js";
import { config } from "../../../../app/config/index.js";

let server;

beforeAll(async () => {
  server = await createServer();
});

const getHeaders = async (url = "/") => {
  const { headers } = await server.inject({
    url,
    auth: {
      credentials: {},
      strategy: "cookie",
    },
  });

  return headers;
};

describe("non-CSP security headers", () => {
  test.each([
    ["x-frame-options", "deny"],
    ["x-content-type-options", "nosniff"],
    ["access-control-allow-origin", config.get("serviceUri")],
    ["cross-origin-opener-policy", "same-origin"],
    ["cross-origin-embedder-policy", "require-corp"],
    ["x-robots-tag", "noindex, nofollow"],
    ["strict-transport-security", "max-age=31536000;"],
    ["cache-control", "no-store"],
    ["referrer-policy", "no-referrer"],
  ])("sets %s to the expected value", async (header, value) => {
    const headers = await getHeaders();

    expect(headers[header]).toBe(value);
  });

  test("omits the deprecated X-XSS-Protection header", async () => {
    const headers = await getHeaders();

    expect(headers["x-xss-protection"]).toBeUndefined();
  });

  test("omits the obsolete Permissions-Policy header", async () => {
    const headers = await getHeaders();

    expect(headers["permissions-policy"]).toBeUndefined();
  });

  test("skips the non-CSP headers when the response has no header element", async () => {
    const { headers } = await server.inject({
      method: "POST",
      url: "/nonsense",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(headers["x-frame-options"]).toBeUndefined();
  });
});
