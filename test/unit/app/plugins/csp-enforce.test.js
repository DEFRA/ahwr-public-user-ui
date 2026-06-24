import { createServer } from "../../../../app/server.js";

jest.mock("../../../../app/config", () => {
  const actual = jest.requireActual("../../../../app/config");
  return {
    ...actual,
    config: { ...actual.config, csp: { enforce: true } },
  };
});

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

describe("enforced policy (CSP_ENFORCE_POLICY enabled)", () => {
  test("does not emit a Content-Security-Policy-Report-Only header", async () => {
    const headers = await getHeaders();

    expect(headers["content-security-policy-report-only"]).toBeUndefined();
  });

  test("enforces the hardened policy as the Content-Security-Policy header", async () => {
    const enforced = (await getHeaders())["content-security-policy"];

    expect(enforced).toContain("'nonce-");
    expect(enforced).not.toContain("'unsafe-inline'");
    expect(enforced).not.toContain("'unsafe-eval'");
  });
});
