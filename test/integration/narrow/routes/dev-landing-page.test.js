import { createServer } from "../../../../app/server.js";
import { config } from "../../../../app/config/index.js";
import { StatusCodes } from "http-status-codes";
import { refreshApplications } from "../../../../app/lib/context-helper.js";

jest.mock("../../../../app/session/index.js", () => ({
  ...jest.requireActual("../../../../app/session/index.js"),
  setSessionData: jest.fn(),
  setSessionEntry: jest.fn(),
}));

jest.mock("../../../../app/lib/context-helper.js");

const auth = { credentials: {}, strategy: "cookie" };

describe("Dev landing page test", () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  test("POST dev sign-in route returns redirect to apply journey if not applied yet", async () => {
    config.set("devLogin.enabled", true);
    const sbi = "123456789";
    const server = await createServer();

    refreshApplications.mockResolvedValueOnce({
      latestEndemicsApplication: undefined,
      latestVetVisitApplication: undefined,
    });

    const res = await server.inject({
      url: "/dev-landing-page",
      payload: {
        sbi,
      },
      method: "POST",
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/check-details");
  });

  test("POST dev sign-in route returns redirect to dashboard if already signed up for an EE application", async () => {
    config.set("devLogin.enabled", true);
    const sbi = "123456789";
    const server = await createServer();

    refreshApplications.mockResolvedValueOnce({
      latestEndemicsApplication: {
        type: "EE",
        status: "AGREED",
        createdAt: new Date(),
      },
      latestVetVisitApplication: undefined,
    });

    const res = await server.inject({
      url: "/dev-landing-page",
      payload: {
        sbi,
      },
      method: "POST",
      auth,
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(`/check-details`);
  });

  test("POST dev sign-in route returns redirect to apply journey if signed up for a closed VV application", async () => {
    config.set("devLogin.enabled", true);
    const sbi = "123456789";
    const server = await createServer();

    refreshApplications.mockResolvedValueOnce({
      latestEndemicsApplication: undefined,
      latestVetVisitApplication: {
        type: "VV",
        status: "WITHDRAWN",
        createdAt: new Date(),
      },
    });

    const res = await server.inject({
      url: "/dev-landing-page",
      payload: {
        sbi,
      },
      method: "POST",
      auth,
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/check-details");
  });

  test("POST dev sign-in route forwards to cannot sign in page for a non-closed VV agreement", async () => {
    config.set("devLogin.enabled", true);
    const sbi = "123456789";
    const server = await createServer();

    refreshApplications.mockResolvedValueOnce({
      latestEndemicsApplication: undefined,
      latestVetVisitApplication: {
        type: "VV",
        status: "AGREED",
        createdAt: new Date(),
      },
    });

    const res = await server.inject({
      url: "/dev-landing-page",
      payload: {
        sbi,
      },
      method: "POST",
      auth,
    });

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
    expect(res.headers.location).toEqual("/cannot-sign-in");
  });

  test.each([
    { scenario: "the business is locked", sbi: "123l" },
    { scenario: "the person has invalid permissions", sbi: "123i" },
    { scenario: "there is no eligible CPH", sbi: "123c" },
    { scenario: "the sbi does not start with 1", sbi: "223456789l" },
  ])("POST dev landing page forwards to cannot sign in when $scenario", async ({ sbi }) => {
    config.set("devLogin.enabled", true);
    const server = await createServer();

    refreshApplications.mockResolvedValueOnce({
      latestEndemicsApplication: undefined,
      latestVetVisitApplication: undefined,
    });

    const res = await server.inject({
      url: "/dev-landing-page",
      payload: {
        sbi,
      },
      method: "POST",
      auth,
    });

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
    expect(res.headers.location).toEqual("/cannot-sign-in");
  });

  test("GET dev landing page renders the sign-in view", async () => {
    config.set("devLogin.enabled", true);
    const server = await createServer();

    const res = await server.inject({
      url: "/dev-landing-page",
      method: "GET",
    });

    expect(res.statusCode).toBe(StatusCodes.OK);
  });

  test("POST dev landing page shows verify-login-failed for an unexpected error", async () => {
    config.set("devLogin.enabled", true);
    const sbi = "123456789";
    const server = await createServer();

    refreshApplications.mockRejectedValueOnce(new Error("something went wrong"));

    const res = await server.inject({
      url: "/dev-landing-page",
      payload: {
        sbi,
      },
      method: "POST",
      auth,
    });

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(res.payload).toContain("something went wrong");
  });

  test("POST dev landing page handles a missing sbi via the default", async () => {
    config.set("devLogin.enabled", true);
    const server = await createServer();

    refreshApplications.mockResolvedValueOnce({
      latestEndemicsApplication: undefined,
      latestVetVisitApplication: undefined,
    });

    const res = await server.inject({
      url: "/dev-landing-page",
      payload: {},
      method: "POST",
      auth,
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/check-details");
  });

  test("POST dev landing page shows the payload message when the error carries one", async () => {
    config.set("devLogin.enabled", true);
    const sbi = "123456789";
    const server = await createServer();

    const error = new Error("fallback message");
    error.data = { payload: { message: "specific payload message" } };
    refreshApplications.mockRejectedValueOnce(error);

    const res = await server.inject({
      url: "/dev-landing-page",
      payload: {
        sbi,
      },
      method: "POST",
      auth,
    });

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(res.payload).toContain("specific payload message");
  });
});
