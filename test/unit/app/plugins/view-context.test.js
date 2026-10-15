import { viewContextPlugin } from "../../../../app/plugins/view-context.js";
import { config } from "../../../../app/config/index.js";

jest.mock("../../../../app/lib/context-helper.js");
jest.mock("../../../../app/lib/agreement-helper.js");

describe("View Context Plugin", () => {
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
    viewContextPlugin.plugin.register(mockServer);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("response filtering", () => {
    it("sets context when response is a view and template does not start with error-pages/", () => {
      const mockRequest = {
        path: "/test",
        plugins: { blankie: { nonces: { script: "test-nonce" } } },
        auth: { isAuthenticated: true },
        response: {
          variety: "view",
          source: {
            template: "livestock/claim/check-answers",
            context: {},
          },
        },
      };

      const result = onPreResponseHandler(mockRequest, mockH);

      expect(result).toBe(mockH.continue);
      expect(mockRequest.response.source.context.serviceName).toBeDefined();
    });

    it("exposes the Blankie script nonce to the view context", () => {
      const mockRequest = {
        path: "/test",
        plugins: { blankie: { nonces: { script: "test-nonce" } } },
        auth: { isAuthenticated: true },
        response: {
          variety: "view",
          source: {
            template: "livestock/claim/check-answers",
            context: {},
          },
        },
      };

      onPreResponseHandler(mockRequest, mockH);

      expect(mockRequest.response.source.context.cspNonce).toBe("test-nonce");
    });

    it("does not set context when template starts with error-pages/", () => {
      const mockRequest = {
        path: "/test",
        auth: { isAuthenticated: true },
        response: {
          variety: "view",
          source: {
            template: "error-pages/500",
            context: {},
          },
        },
      };

      const result = onPreResponseHandler(mockRequest, mockH);

      expect(result).toBe(mockH.continue);
      expect(mockRequest.response.source.context.serviceName).toBeUndefined();
    });

    it("does not set context when response is not a view", () => {
      const mockRequest = {
        path: "/test",
        auth: { isAuthenticated: true },
        response: {
          variety: "plain",
          source: {},
        },
      };

      const result = onPreResponseHandler(mockRequest, mockH);

      expect(result).toBe(mockH.continue);
      expect(mockRequest.response.source.context).toBeUndefined();
    });
  });
  describe("livestock herd claim limit", () => {
    const buildRequest = () => ({
      path: "/test",
      plugins: { blankie: { nonces: { script: "test-nonce" } } },
      auth: { isAuthenticated: true },
      response: {
        variety: "view",
        source: {
          template: "livestock/apply/timings",
          context: {},
        },
      },
    });

    afterEach(() => {
      config.set("herdClaimLimit.enabled", false);
      config.set("herdClaimLimit.livestock", 3);
    });

    it("uses the default limit when the feature is disabled", () => {
      config.set("herdClaimLimit.enabled", false);
      config.set("herdClaimLimit.livestock", 5);
      const mockRequest = buildRequest();

      onPreResponseHandler(mockRequest, mockH);

      expect(mockRequest.response.source.context).toMatchObject({
        livestockHerdClaimLimit: 3,
        livestockHerdClaimLimitIncreased: false,
      });
    });

    it("uses the configured limit and flags it as increased when enabled and above the default", () => {
      config.set("herdClaimLimit.enabled", true);
      config.set("herdClaimLimit.livestock", 4);
      const mockRequest = buildRequest();

      onPreResponseHandler(mockRequest, mockH);

      expect(mockRequest.response.source.context).toMatchObject({
        livestockHerdClaimLimit: 4,
        livestockHerdClaimLimitIncreased: true,
      });
    });

    it("does not flag the limit as increased when enabled and equal to the default", () => {
      config.set("herdClaimLimit.enabled", true);
      config.set("herdClaimLimit.livestock", 3);
      const mockRequest = buildRequest();

      onPreResponseHandler(mockRequest, mockH);

      expect(mockRequest.response.source.context).toMatchObject({
        livestockHerdClaimLimit: 3,
        livestockHerdClaimLimitIncreased: false,
      });
    });
  });
});
