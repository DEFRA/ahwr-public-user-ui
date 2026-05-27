import Hapi from "@hapi/hapi";
import hapiCookiePlugin from "@hapi/cookie";
import { authPlugin } from "./auth-plugin.js";

jest.mock("../config", () => ({
  config: {
    cookie: {
      isSameSite: "Lax",
      isSecure: true,
      cookieNameAuth: "test_auth",
      password: "password-must-be-at-least-32-characters-long",
      ttl: 3600000,
    },
    cookiePolicy: {
      path: "/",
    },
  },
}));

const mockLogger = {
  info: jest.fn(),
};

jest.mock("../logging/logger.js", () => ({
  getLogger: () => mockLogger,
}));

const mockGetSessionData = jest.fn();

jest.mock("../session/index.js", () => ({
  getSessionData: (...args) => mockGetSessionData(...args),
  sessionEntryKeys: {
    organisation: "organisation",
  },
}));

describe("Auth plugin", () => {
  let server;

  beforeEach(async () => {
    jest.clearAllMocks();
    server = Hapi.server();
    await server.register(hapiCookiePlugin);
    await server.register(authPlugin);
  });

  afterEach(async () => {
    await server.stop();
  });

  describe("default auth", () => {
    test("should set default auth mode to required", () => {
      expect(server.auth.settings.default.mode).toBe("required");
    });
  });

  describe("unauthenticated requests", () => {
    beforeEach(() => {
      server.route({
        method: "GET",
        path: "/protected",
        handler: () => "protected content",
      });
    });

    test("should redirect to /sign-in when no auth cookie present", async () => {
      mockGetSessionData.mockReturnValue(null);

      const response = await server.inject({
        method: "GET",
        url: "/protected",
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe("/sign-in");
    });
  });

  describe("authenticated requests", () => {
    beforeEach(() => {
      server.route({
        method: "GET",
        path: "/protected",
        handler: () => "protected content",
      });

      server.route({
        method: "GET",
        path: "/login",
        options: { auth: false },
        handler: (request, h) => {
          request.cookieAuth.set({ id: "test-session" });
          return "logged in";
        },
      });
    });

    test("should allow access when organisation exists in session", async () => {
      mockGetSessionData.mockReturnValue({ name: "Test Farm" });

      const loginResponse = await server.inject({
        method: "GET",
        url: "/login",
      });

      const cookie = loginResponse.headers["set-cookie"][0].split(";")[0];

      const response = await server.inject({
        method: "GET",
        url: "/protected",
        headers: { cookie },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result).toBe("protected content");
    });

    test("should redirect to /sign-in when organisation is missing from session", async () => {
      mockGetSessionData.mockReturnValue(null);

      const loginResponse = await server.inject({
        method: "GET",
        url: "/login",
      });

      const cookie = loginResponse.headers["set-cookie"][0].split(";")[0];

      const response = await server.inject({
        method: "GET",
        url: "/protected",
        headers: { cookie },
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe("/sign-in");
    });

    test("should log when validation fails due to missing organisation", async () => {
      mockGetSessionData.mockReturnValue(null);

      const loginResponse = await server.inject({
        method: "GET",
        url: "/login",
      });

      const cookie = loginResponse.headers["set-cookie"][0].split(";")[0];

      await server.inject({
        method: "GET",
        url: "/protected",
        headers: { cookie },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        { path: "/protected" },
        "Auth cookie validation failed: no organisation in session",
      );
    });

    test("should not log when validation succeeds", async () => {
      mockGetSessionData.mockReturnValue({ name: "Test Farm" });

      const loginResponse = await server.inject({
        method: "GET",
        url: "/login",
      });

      const cookie = loginResponse.headers["set-cookie"][0].split(";")[0];

      await server.inject({
        method: "GET",
        url: "/protected",
        headers: { cookie },
      });

      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe("routes with auth disabled", () => {
    test("should allow access without authentication", async () => {
      server.route({
        method: "GET",
        path: "/public",
        options: { auth: false },
        handler: () => "public content",
      });

      const response = await server.inject({
        method: "GET",
        url: "/public",
      });

      expect(response.statusCode).toBe(200);
      expect(response.result).toBe("public content");
    });
  });
});
