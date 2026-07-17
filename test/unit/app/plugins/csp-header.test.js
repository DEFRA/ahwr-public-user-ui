import { createServer } from "../../../../app/server.js";

const getHeaders = async () => {
  const server = await createServer();

  const { headers } = await server.inject({
    url: "/",
    auth: {
      credentials: {},
      strategy: "cookie",
    },
  });

  return headers;
};

const nonceFrom = (header) => /'nonce-([^']+)'/.exec(header ?? "")?.[1];

describe("content security policy header", () => {
  test("does not emit a Content-Security-Policy-Report-Only header", async () => {
    const headers = await getHeaders();

    expect(headers["content-security-policy-report-only"]).toBeUndefined();
  });

  test("emits a nonce-based Content-Security-Policy header", async () => {
    const headers = await getHeaders();
    const csp = headers["content-security-policy"];

    expect(csp).toContain("'nonce-");
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  test("generates a different nonce for each request", async () => {
    const firstHeaders = await getHeaders();
    const secondHeaders = await getHeaders();

    const first = nonceFrom(firstHeaders["content-security-policy"]);
    const second = nonceFrom(secondHeaders["content-security-policy"]);

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first).not.toBe(second);
  });
});
