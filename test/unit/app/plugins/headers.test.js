import { createServer } from "../../../../app/server.js";

const contentSecurityPolicy =
  "default-src 'self';object-src 'none';script-src 'self' www.google-analytics.com *.googletagmanager.com ajax.googleapis.com *.googletagmanager.com/gtm.js 'unsafe-inline' 'unsafe-eval';form-action 'self';base-uri 'self';connect-src 'self' *.google-analytics.com *.analytics.google.com *.googletagmanager.com;style-src 'self' 'unsafe-inline' tagmanager.google.com *.googleapis.com;img-src 'self' *.google-analytics.com *.googletagmanager.com;frame-ancestors 'none';";

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

  expect(headers["content-security-policy"]).toBe(contentSecurityPolicy);
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

test("retains X-Frame-Options deny alongside frame-ancestors", async () => {
  const headers = await getHeaders();

  expect(headers["x-frame-options"]).toBe("deny");
});
