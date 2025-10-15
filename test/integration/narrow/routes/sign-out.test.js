import { StatusCodes } from "http-status-codes";
import { createServer } from "../../../../app/server.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  clearAllOfSession,
} from "../../../../app/session/index.js";
import { clearAuthCookie } from "../../../../app/auth/cookie-auth/cookie-auth.js";
import { signOutUrl } from "../../../../app/routes/sign-out.js";
import { config } from "../../../../app/config/index.js";
import { when } from "jest-when";

jest.mock("../../../../app/session", () => {
  const actual = jest.requireActual("../../../../app/session");
  // Mocking everything apart from sessionKeys and sessionEntryKeys
  const mocked = Object.keys(actual).reduce((acc, key) => {
    acc[key] = key === "sessionKeys" || key === "sessionEntryKeys" ? actual[key] : jest.fn();
    return acc;
  }, {});
  return mocked;
});

jest.mock("../../../../app/auth/cookie-auth/cookie-auth.js");

const accessToken = "access-token";

when(getSessionData)
  .calledWith(expect.anything(), sessionEntryKeys.tokens, sessionKeys.tokens.accessToken)
  .mockReturnValue(accessToken);

describe("GET /sign-out handler", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
  });

  test("get /sign-out", async () => {
    const res = await server.inject({
      url: "/sign-out",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(getSessionData).toHaveBeenCalledWith(
      expect.anything(),
      sessionEntryKeys.tokens,
      sessionKeys.tokens.accessToken,
    );
    expect(clearAllOfSession).toHaveBeenCalled();
    expect(clearAuthCookie).toHaveBeenCalled();
    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);

    const url = new URL(res.headers.location);
    const { searchParams } = url;

    expect(url.href).toContain(signOutUrl);
    expect(url.pathname).toMatch(/\/oauth2\/v2\.0\/logout$/);
    expect(searchParams.get("post_logout_redirect_uri")).toBe(`${config.serviceUri}sign-in`);
    expect(searchParams.get("id_token_hint")).toBe(accessToken);
  });
});
