import { getContentSecurityPolicy } from "../../../../app/plugins/header.js";

const policy = (nonce) =>
  "default-src 'self';" +
  "object-src 'none';" +
  `script-src 'self' www.google-analytics.com *.googletagmanager.com 'nonce-${nonce}';` +
  "form-action 'self';" +
  "base-uri 'self';" +
  "connect-src 'self' *.google-analytics.com *.analytics.google.com *.googletagmanager.com;" +
  "style-src 'self' tagmanager.google.com *.googleapis.com;" +
  "img-src 'self' *.google-analytics.com *.googletagmanager.com;" +
  "frame-ancestors 'none';";

describe("content security policy builder", () => {
  test("builds the policy for a given nonce", () => {
    expect(getContentSecurityPolicy("test-nonce")).toBe(policy("test-nonce"));
  });

  test("allows only self, the analytics hosts and the request nonce in script-src", () => {
    expect(getContentSecurityPolicy("test-nonce")).toContain(
      "script-src 'self' www.google-analytics.com *.googletagmanager.com 'nonce-test-nonce';",
    );
  });

  test("omits unsafe-inline and unsafe-eval", () => {
    const built = getContentSecurityPolicy("test-nonce");

    expect(built).not.toContain("'unsafe-inline'");
    expect(built).not.toContain("'unsafe-eval'");
  });
});
