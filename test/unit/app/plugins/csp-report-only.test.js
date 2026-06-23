import { getReportOnlyPolicy } from "../../../../app/plugins/header.js";
import { createServer } from "../../../../app/server.js";

const reportOnlyPolicy = (nonce) =>
  "default-src 'self';" +
  "object-src 'none';" +
  `script-src 'self' www.google-analytics.com *.googletagmanager.com 'nonce-${nonce}';` +
  "form-action 'self';" +
  "base-uri 'self';" +
  "connect-src 'self' *.google-analytics.com *.analytics.google.com *.googletagmanager.com;" +
  "style-src 'self' tagmanager.google.com *.googleapis.com;" +
  "img-src 'self' *.google-analytics.com *.googletagmanager.com;" +
  "frame-ancestors 'none';";

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

describe("report-only policy builder", () => {
  test("builds the hardened candidate policy for a given nonce", () => {
    expect(getReportOnlyPolicy("test-nonce")).toBe(reportOnlyPolicy("test-nonce"));
  });

  test("allows only self, the analytics hosts and the request nonce in script-src", () => {
    expect(getReportOnlyPolicy("test-nonce")).toContain(
      "script-src 'self' www.google-analytics.com *.googletagmanager.com 'nonce-test-nonce';",
    );
  });

  test("omits unsafe-inline and unsafe-eval", () => {
    const policy = getReportOnlyPolicy("test-nonce");

    expect(policy).not.toContain("'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
  });
});

describe("report-only header (enabled by default)", () => {
  test("emits a Content-Security-Policy-Report-Only header unless explicitly disabled", async () => {
    const headers = await getHeaders();

    expect(headers["content-security-policy-report-only"]).toBeDefined();
  });

  test("the candidate header carries a nonce", async () => {
    const candidate = (await getHeaders())["content-security-policy-report-only"];

    expect(candidate).toContain("'nonce-");
  });

  test("still emits the enforced Content-Security-Policy unchanged", async () => {
    const enforced = (await getHeaders())["content-security-policy"];

    expect(enforced).toContain("'unsafe-inline'");
    expect(enforced).not.toContain("'nonce-");
  });

  test("generates a different nonce for each request", async () => {
    const first = nonceFrom((await getHeaders())["content-security-policy-report-only"]);
    const second = nonceFrom((await getHeaders())["content-security-policy-report-only"]);

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first).not.toBe(second);
  });
});
