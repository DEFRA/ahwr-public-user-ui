import { StatusCodes } from "http-status-codes";
import { createServer } from "../../../../app/server.js";
import {
  getToken,
  getCannotSignInDetails,
  clearAllOfSession,
} from "../../../../app/session/index.js";
import { getSignOutUrl } from "../../../../app/routes/sign-out.js";
import { clearAuthCookie } from "../../../../app/auth/cookie-auth/cookie-auth.js";
import { claimServiceUri } from "../../../../app/config/routes.js";

jest.mock("../../../../app/session/index.js");
jest.mock("../../../../app/auth/cookie-auth/cookie-auth.js");
jest.mock("../../../../app/routes/sign-out.js");

jest.mock("../../../../app/constants/claim-statuses.js", () => ({
  closedViewStatuses: [2, 10, 7, 9, 8],
}));

describe("GET /cannot-sign-in handler", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
  });

  test("it returns a 302 to the claim front page if the details needed are not in the session", async () => {
    const res = await server.inject({
      url: "/cannot-sign-in",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
    expect(res.headers.location).toBe(claimServiceUri);
  });

  test("it returns a 200 if the details needed exist in the session", async () => {
    const organisation = {
      address:
        "1 Brown Lane,Smithering,West Sussex,England,UK,Thompsons,Sisterdene,1-30,Grey Building,Brown Lane,Grenwald,West Sussex,WS11 2DS,GBR",
      email: "unit@test.email.com.test",
      name: "Unit test org",
      sbi: 999000,
    };
    const error = "ExpiredOldWorldApplication";
    const hasMultipleBusinesses = "false";
    const backLink = "something";

    getCannotSignInDetails
      .mockReturnValueOnce(error)
      .mockReturnValueOnce(backLink)
      .mockReturnValueOnce(hasMultipleBusinesses)
      .mockReturnValueOnce(organisation);

    const res = await server.inject({
      url: "/cannot-sign-in",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(res.statusCode).toBe(StatusCodes.OK);
    expect(getToken).toHaveBeenCalled();
    expect(getSignOutUrl).toHaveBeenCalled();
    expect(clearAuthCookie).toHaveBeenCalled();
    expect(clearAllOfSession).toHaveBeenCalled();
  });
});
