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

describe("Dev sign in page test", () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  test("POST dev sign-in route returns redirect to apply journey if not applied yet", async () => {
    config.devLogin.enabled = true;
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
    config.devLogin.enabled = true;
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
    config.devLogin.enabled = true;
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
    config.devLogin.enabled = true;
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

  test("POST dev sign-in route forwards to error page when forced to show CPH error", async () => {
    config.devLogin.enabled = true;
    const sbi = "123c";
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

  test("POST dev sign-in route forwards to error page when forced to show Invalid permissions error", async () => {
    config.devLogin.enabled = true;
    const sbi = "123i";
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

  test("POST dev sign-in route forwards to error page when forced to show locked business error", async () => {
    config.devLogin.enabled = true;
    const sbi = "123l";
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

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
    expect(res.headers.location).toEqual("/cannot-sign-in");
  });
});
