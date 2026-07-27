import { createServer } from "../../../../app/server.js";
import { parseCspDirectives } from "../../../helpers/parse-csp-directives.js";

let server;

beforeAll(async () => {
  server = await createServer();
});

const getResponseHeaders = async () => {
  const { headers } = await server.inject({
    url: "/",
    auth: {
      credentials: {},
      strategy: "cookie",
    },
  });

  return headers;
};

const getCspDirectives = async () =>
  parseCspDirectives((await getResponseHeaders())["content-security-policy"]);

const getScriptNonce = (directives) =>
  directives["script-src"].find((source) => source.startsWith("'nonce-"));

describe("content security policy directives", () => {
  let directives;

  beforeAll(async () => {
    directives = await getCspDirectives();
  });

  test("restricts default-src to self", () => {
    expect(directives["default-src"]).toEqual(["'self'"]);
  });

  test("blocks plugin content via object-src none", () => {
    expect(directives["object-src"]).toEqual(["'none'"]);
  });

  test("prevents clickjacking via frame-ancestors none", () => {
    expect(directives["frame-ancestors"]).toEqual(["'none'"]);
  });

  test("restricts form-action to self", () => {
    expect(directives["form-action"]).toEqual(["'self'"]);
  });

  test("restricts base-uri to self", () => {
    expect(directives["base-uri"]).toEqual(["'self'"]);
  });

  test("allows self and the analytics hosts in connect-src", () => {
    expect(new Set(directives["connect-src"])).toEqual(
      new Set([
        "'self'",
        "*.google-analytics.com",
        "*.analytics.google.com",
        "*.googletagmanager.com",
      ]),
    );
  });

  test("allows self and the tag-manager hosts in style-src", () => {
    expect(new Set(directives["style-src"])).toEqual(
      new Set(["'self'", "tagmanager.google.com", "*.googleapis.com"]),
    );
  });

  test("allows self and the analytics hosts in img-src", () => {
    expect(new Set(directives["img-src"])).toEqual(
      new Set(["'self'", "*.google-analytics.com", "*.googletagmanager.com"]),
    );
  });
});

describe("script-src", () => {
  let directives;

  beforeAll(async () => {
    directives = await getCspDirectives();
  });

  test("allows self and the analytics hosts", () => {
    expect(directives["script-src"]).toEqual(
      expect.arrayContaining(["'self'", "www.google-analytics.com", "*.googletagmanager.com"]),
    );
  });

  test("carries a per-request nonce", () => {
    expect(getScriptNonce(directives)).toBeDefined();
  });

  test("omits unsafe-inline and unsafe-eval", () => {
    expect(directives["script-src"]).not.toContain("'unsafe-inline'");
    expect(directives["script-src"]).not.toContain("'unsafe-eval'");
  });
});

describe("nonce and report-only behaviour", () => {
  test("does not emit a Content-Security-Policy-Report-Only header", async () => {
    const headers = await getResponseHeaders();

    expect(headers["content-security-policy-report-only"]).toBeUndefined();
  });

  test("generates a different nonce for each request", async () => {
    const firstNonce = getScriptNonce(await getCspDirectives());
    const secondNonce = getScriptNonce(await getCspDirectives());

    expect(firstNonce).toBeDefined();
    expect(secondNonce).toBeDefined();
    expect(firstNonce).not.toBe(secondNonce);
  });
});
