import { viewContextPlugin } from "../../../../app/plugins/view-context.js";

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
        auth: { isAuthenticated: true },
        response: {
          variety: "view",
          source: {
            template: "claim/check-answers",
            context: {},
          },
        },
      };

      const result = onPreResponseHandler(mockRequest, mockH);

      expect(result).toBe(mockH.continue);
      expect(mockRequest.response.source.context.serviceName).toBeDefined();
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
});
