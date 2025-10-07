import { StatusCodes } from "http-status-codes";
import { createServer } from "../../../../app/server.js";
import { getToken, clearAllOfSession } from "../../../../app/session/index.js";
import { clearAuthCookie } from "../../../../app/auth/cookie-auth/cookie-auth.js";
import { signOutUrl } from "../../../../app/routes/sign-out.js";
import { config } from "../../../../app/config/index.js";

jest.mock("../../../../app/session/index.js");
jest.mock("../../../../app/auth/cookie-auth/cookie-auth.js");

jest.mock("../../../../app/constants/claim-statuses.js", () => ({
  closedViewStatuses: [2, 10, 7, 9, 8],
}));

describe("GET /sign-out handler", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
  });

  test("get /sign-out", async () => {
    const accessToken = "access-token";
    getToken.mockReturnValue(accessToken);

    const res = await server.inject({
      url: "/sign-out",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(getToken).toHaveBeenCalled();
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
