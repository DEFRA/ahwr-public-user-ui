import { createServer } from "../../../../app/server.js";

const expected = {
  "x-frame-options": "deny",
  "x-content-type-options": "nosniff",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-embedder-policy": "require-corp",
  "x-robots-tag": "noindex, nofollow",
  "x-xss-protection": "1; mode=block",
  "strict-transport-security": "max-age=31536000;",
  "cache-control": "no-cache",
  "referrer-policy": "no-referrer",
  "content-security-policy":
    "default-src 'self';object-src 'none';script-src 'self' www.google-analytics.com *.googletagmanager.com ajax.googleapis.com *.googletagmanager.com/gtm.js 'unsafe-inline' 'unsafe-eval' 'unsafe-hashes';form-action 'self';base-uri 'self';connect-src 'self' *.google-analytics.com *.analytics.google.com *.googletagmanager.comstyle-src 'self' 'unsafe-inline' tagmanager.google.com *.googleapis.com;img-src 'self' *.google-analytics.com *.googletagmanager.com;",
};

test("sets predefined headers", async () => {
  const server = await createServer();

  const { headers } = await server.inject({
    url: "/",
    auth: {
      credentials: {},
      strategy: "cookie",
    },
  });

  expect(headers).toEqual(expect.objectContaining(expected));
});

test("skips headers if no response header element", async () => {
  const server = await createServer();

  const { headers } = await server.inject({
    method: "POST",
    url: "/nonsense",
    auth: {
      credentials: {},
      strategy: "cookie",
    },
  });

  expect(headers).not.toEqual(expect.objectContaining(expected));
});
