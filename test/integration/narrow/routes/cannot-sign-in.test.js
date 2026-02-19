import { StatusCodes } from "http-status-codes";
import { createServer } from "../../../../app/server.js";
import { clearAllOfSession, getSessionData } from "../../../../app/session/index.js";
import { getSignOutUrl } from "../../../../app/routes/sign-out.js";
import { clearAuthCookie } from "../../../../app/auth/cookie-auth/cookie-auth.js";
import { setSessionForErrorPage } from "../../../../app/routes/utils/check-login-valid.js";
import { requestAuthorizationCodeUrl } from "../../../../app/auth/auth-code-grant/request-authorization-code-url.js";

jest.mock("../../../../app/session", () => {
  const actual = jest.requireActual("../../../../app/session");
  // Mocking everything apart from sessionKeys and sessionEntryKeys
  return Object.keys(actual).reduce((acc, key) => {
    acc[key] = key === "sessionKeys" || key === "sessionEntryKeys" ? actual[key] : jest.fn();
    return acc;
  }, {});
});

jest.mock("../../../../app/auth/cookie-auth/cookie-auth.js");
jest.mock("../../../../app/routes/sign-out.js");
jest.mock("../../../../app/routes/utils/check-login-valid.js");
jest.mock("../../../../app/auth/auth-code-grant/request-authorization-code-url.js");

describe("GET /cannot-sign-in handler", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
  });

  test("it throws an error if the details needed are not in the session", async () => {
    getSessionData.mockReturnValueOnce(undefined);
    const res = await server.inject({
      url: "/cannot-sign-in",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(res.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
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
    const hasMultipleBusinesses = false;

    getSessionData.mockReturnValueOnce({ error, hasMultipleBusinesses, organisation });

    const res = await server.inject({
      url: "/cannot-sign-in",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(res.statusCode).toBe(StatusCodes.OK);
    expect(getSessionData).toHaveBeenCalled();
    expect(getSignOutUrl).toHaveBeenCalled();
    expect(clearAuthCookie).toHaveBeenCalled();
    expect(clearAllOfSession).toHaveBeenCalled();
    expect(requestAuthorizationCodeUrl).not.toHaveBeenCalled();
    expect(setSessionForErrorPage).toHaveBeenCalledWith({request: expect.anything(), error, hasMultipleBusinesses, organisation});
  });

  test("it returns a 200 and generates a backLink if multipleBusinesses is applicable", async () => {
    const organisation = {
      address:
        "1 Brown Lane,Smithering,West Sussex,England,UK,Thompsons,Sisterdene,1-30,Grey Building,Brown Lane,Grenwald,West Sussex,WS11 2DS,GBR",
      email: "unit@test.email.com.test",
      name: "Unit test org",
      sbi: 999000,
    };
    const error = "ExpiredOldWorldApplication";
    const hasMultipleBusinesses = true;

    getSessionData.mockReturnValueOnce({ error, hasMultipleBusinesses, organisation });

    const res = await server.inject({
      url: "/cannot-sign-in",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(res.statusCode).toBe(StatusCodes.OK);
    expect(getSessionData).toHaveBeenCalled();
    expect(getSignOutUrl).toHaveBeenCalled();
    expect(clearAuthCookie).toHaveBeenCalled();
    expect(clearAllOfSession).toHaveBeenCalled();
    expect(requestAuthorizationCodeUrl).toHaveBeenCalled();
    expect(setSessionForErrorPage).toHaveBeenCalledWith({request: expect.anything(), error, hasMultipleBusinesses, organisation});
  });
});
