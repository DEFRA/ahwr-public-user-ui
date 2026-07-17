import { createServer } from "../../../../app/server.js";

const contentSecurityPolicy = (nonce) =>
  "default-src 'self';object-src 'none';" +
  `script-src 'self' www.google-analytics.com *.googletagmanager.com 'nonce-${nonce}';` +
  "form-action 'self';base-uri 'self';connect-src 'self' *.google-analytics.com *.analytics.google.com *.googletagmanager.com;" +
  "style-src 'self' tagmanager.google.com *.googleapis.com;" +
  "img-src 'self' *.google-analytics.com *.googletagmanager.com;frame-ancestors 'none';";

const getHeaders = async (url = "/") => {
  const server = await createServer();

  const { headers } = await server.inject({
    url,
    auth: {
      credentials: {},
      strategy: "cookie",
    },
  });

  return headers;
};

test("sets the content security policy as expected", async () => {
  const headers = await getHeaders();
  const csp = headers["content-security-policy"];
  const nonce = /'nonce-([^']+)'/.exec(csp ?? "")?.[1];

  expect(nonce).toBeDefined();
  expect(csp).toBe(contentSecurityPolicy(nonce));
});

test("skips headers when the response has no header element", async () => {
  const server = await createServer();

  const { headers } = await server.inject({
    method: "POST",
    url: "/nonsense",
    auth: {
      credentials: {},
      strategy: "cookie",
    },
  });

  expect(headers["content-security-policy"]).toBeUndefined();
});

test("omits the deprecated X-XSS-Protection header", async () => {
  const headers = await getHeaders();

  expect(headers["x-xss-protection"]).toBeUndefined();
});

test("omits the obsolete Permissions-Policy header", async () => {
  const headers = await getHeaders();

  expect(headers["permissions-policy"]).toBeUndefined();
});

test("retains X-Frame-Options deny alongside frame-ancestors", async () => {
  const headers = await getHeaders();

  expect(headers["x-frame-options"]).toBe("deny");
});
