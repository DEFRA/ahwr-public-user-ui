import { devRedirectPlugin } from "../../../../app/plugins/dev-redirect.js";

const CSP_HEADER = "content-security-policy";

describe("dev-redirect plugin", () => {
  let onPreResponseHandler;
  const mockH = { continue: Symbol("continue") };

  beforeAll(() => {
    const mockServer = {
      ext: (event, handler) => {
        if (event === "onPreResponse") {
          onPreResponseHandler = handler;
        }
      },
    };
    devRedirectPlugin.plugin.register(mockServer);
  });

  test("relaxes form-action on the /check-details view response", () => {
    const request = {
      path: "/check-details",
      response: {
        isBoom: false,
        headers: {
          [CSP_HEADER]: "default-src 'self';form-action 'self';frame-ancestors 'none'",
        },
      },
    };

    const result = onPreResponseHandler(request, mockH);

    expect(result).toBe(mockH.continue);
    expect(request.response.headers[CSP_HEADER]).toBe(
      "default-src 'self';form-action *;frame-ancestors 'none'",
    );
  });

  test("relaxes form-action on a Boom response via output.headers", () => {
    const request = {
      path: "/check-details",
      response: {
        isBoom: true,
        output: {
          headers: { [CSP_HEADER]: "form-action 'self'" },
        },
      },
    };

    onPreResponseHandler(request, mockH);

    expect(request.response.output.headers[CSP_HEADER]).toBe("form-action *");
  });

  test("does nothing when a view response has no CSP header", () => {
    const request = {
      path: "/check-details",
      response: { isBoom: false, headers: {} },
    };

    const result = onPreResponseHandler(request, mockH);

    expect(result).toBe(mockH.continue);
    expect(request.response.headers[CSP_HEADER]).toBeUndefined();
  });

  test("does nothing when a Boom response has no CSP header", () => {
    const request = {
      path: "/check-details",
      response: { isBoom: true, output: { headers: {} } },
    };

    const result = onPreResponseHandler(request, mockH);

    expect(result).toBe(mockH.continue);
    expect(request.response.output.headers[CSP_HEADER]).toBeUndefined();
  });

  test("ignores paths other than /check-details", () => {
    const request = {
      path: "/some-other-page",
      response: {
        isBoom: false,
        headers: { [CSP_HEADER]: "form-action 'self'" },
      },
    };

    onPreResponseHandler(request, mockH);

    expect(request.response.headers[CSP_HEADER]).toBe("form-action 'self'");
  });
});
