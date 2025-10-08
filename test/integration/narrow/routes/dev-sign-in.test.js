import { createServer } from "../../../../app/server.js";
import { config } from "../../../../app/config/index.js";
import globalJsdom from "global-jsdom";
import { getByRole } from "@testing-library/dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { StatusCodes } from "http-status-codes";

const mswServer = setupServer();
mswServer.listen();

afterEach(() => {
  mswServer.resetHandlers();
});

afterAll(() => {
  mswServer.close();
});

jest.mock("../../../../app/session/index.js", () => ({
  ...jest.requireActual("../../../../app/session/index.js"),
  setFarmerApplyData: jest.fn(),
  setCannotSignInDetails: jest.fn(),
}));

jest.mock("../../../../app/constants/claim-statuses.js", () => ({
  closedViewStatuses: [2, 10, 7, 9, 8],
  CLAIM_STATUSES: {
    AGREED: 1,
    WITHDRAWN: 2,
    IN_CHECK: 5,
    ACCEPTED: 6,
    NOT_AGREED: 7,
    PAID: 8,
    READY_TO_PAY: 9,
    REJECTED: 10,
    ON_HOLD: 11,
    RECOMMENDED_TO_PAY: 12,
    RECOMMENDED_TO_REJECT: 13,
    AUTHORISED: 14,
    SENT_TO_FINANCE: 15,
    PAYMENT_HELD: 16,
  },
}));

jest.mock("applicationinsights", () => ({
  defaultClient: { trackEvent: jest.fn() },
}));

const auth = { credentials: {}, strategy: "cookie" };

describe("Dev sign in page test", () => {
  test("POST dev sign-in route returns redirect to apply journey if not applied yet", async () => {
    config.devLogin.enabled = true;
    const sbi = "123456789";
    const server = await createServer();

    const getLatestApplicationsBySbi = http.get(
      `${config.applicationApi.uri}/applications/latest`,
      ({ request }) => {
        const url = new URL(request.url);

        if (url.searchParams.get("sbi") !== sbi) {
          return new HttpResponse(null, { status: 404 });
        }

        return HttpResponse.json([]);
      },
    );
    mswServer.use(getLatestApplicationsBySbi);

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

    const getLatestApplicationsBySbi = http.get(
      `${config.applicationApi.uri}/applications/latest`,
      ({ request }) => {
        const url = new URL(request.url);

        if (url.searchParams.get("sbi") !== sbi) {
          return new HttpResponse(null, { status: 404 });
        }

        return HttpResponse.json([
          {
            type: "EE",
            statusId: 1,
            createdAt: new Date(),
          },
        ]);
      },
    );
    mswServer.use(getLatestApplicationsBySbi);

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

    const getLatestApplicationsBySbi = http.get(
      `${config.applicationApi.uri}/applications/latest`,
      ({ request }) => {
        const url = new URL(request.url);

        if (url.searchParams.get("sbi") !== sbi) {
          return new HttpResponse(null, { status: 404 });
        }

        return HttpResponse.json([
          {
            type: "VV",
            statusId: 9,
            createdAt: new Date(),
          },
        ]);
      },
    );
    mswServer.use(getLatestApplicationsBySbi);

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

   // TODO - once we have removed mocks, this test can run again
  test.skip("POST dev sign-in route forwards to error page when coming from apply if signed up for an open VV application", async () => {
    config.devLogin.enabled = true;
    const sbi = "123456789";
    const server = await createServer();

    const getLatestApplicationsBySbi = http.get(
      `${config.applicationApi.uri}/applications/latest`,
      ({ request }) => {
        const url = new URL(request.url);

        if (url.searchParams.get("sbi") !== sbi) {
          return new HttpResponse(null, { status: 404 });
        }

        return HttpResponse.json([
          {
            type: "VV",
            statusId: 1,
            createdAt: new Date(),
          },
        ]);
      },
    );
    mswServer.use(getLatestApplicationsBySbi);

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

   // TODO - once we have removed mocks, this test can run again
  test.skip("POST dev sign-in route forwards to error page when trying to claim for an open VV application", async () => {
    config.devLogin.enabled = true;
    const sbi = "123456789";
    const server = await createServer();

    const getLatestApplicationsBySbi = http.get(
      `${config.applicationApi.uri}/applications/latest`,
      ({ request }) => {
        const url = new URL(request.url);

        if (url.searchParams.get("sbi") !== sbi) {
          return new HttpResponse(null, { status: 404 });
        }

        return HttpResponse.json([
          {
            type: "VV",
            statusId: 1,
            createdAt: new Date(),
          },
        ]);
      },
    );
    mswServer.use(getLatestApplicationsBySbi);

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

  test("POST dev sign-in route forwards to error page when trying to claim and no application exists", async () => {
    config.devLogin.enabled = true;
    const sbi = "123456789";
    const server = await createServer();

    const getLatestApplicationsBySbi = http.get(
      `${config.applicationApi.uri}/applications/latest`,
      ({ request }) => {
        const url = new URL(request.url);

        if (url.searchParams.get("sbi") !== sbi) {
          return new HttpResponse(null, { status: 404 });
        }

        return HttpResponse.json([]);
      },
    );
    mswServer.use(getLatestApplicationsBySbi);

    const res = await server.inject({
      url: "/dev-landing-page",
      payload: {
        sbi,
      },
      method: "POST",
      auth,
    });

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);

    expect(res.headers.location).toBe("/check-details");
  });

  test("POST dev sign-in route forwards to error page when forced to show CPH error", async () => {
    config.devLogin.enabled = true;
    const sbi = "123c";
    const server = await createServer();

    const getLatestApplicationsBySbi = http.get(
      `${config.applicationApi.uri}/applications/latest`,
      ({ request }) => {
        const url = new URL(request.url);

        if (url.searchParams.get("sbi") !== sbi) {
          return new HttpResponse(null, { status: 404 });
        }

        return HttpResponse.json([]);
      },
    );
    mswServer.use(getLatestApplicationsBySbi);

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

    const getLatestApplicationsBySbi = http.get(
      `${config.applicationApi.uri}/applications/latest`,
      ({ request }) => {
        const url = new URL(request.url);

        if (url.searchParams.get("sbi") !== sbi) {
          return new HttpResponse(null, { status: 404 });
        }

        return HttpResponse.json([]);
      },
    );
    mswServer.use(getLatestApplicationsBySbi);

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

    const getLatestApplicationsBySbi = http.get(
      `${config.applicationApi.uri}/applications/latest`,
      ({ request }) => {
        const url = new URL(request.url);

        if (url.searchParams.get("sbi") !== sbi) {
          return new HttpResponse(null, { status: 404 });
        }

        return HttpResponse.json([]);
      },
    );
    mswServer.use(getLatestApplicationsBySbi);

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

  // TODO - once we have removed mocks, this test can run again
  test.skip("POST dev sign-in route forwards to cannot login error page when unknown error encountered", async () => {
    config.devLogin.enabled = true;
    const sbi = "123456789";
    const server = await createServer();

    const getLatestApplicationsBySbi = http.get(
      `${config.applicationApi.uri}/applications/latest`,
      ({ _request }) => {
        return HttpResponse.error();
      },
    );
    mswServer.use(getLatestApplicationsBySbi);

    const res = await server.inject({
      url: "/dev-landing-page",
      payload: {
        sbi,
      },
      method: "POST",
    });

    const cleanUpFunction = globalJsdom(res.payload);
    expect(res.statusCode).toBe(400);

    expect(
      getByRole(document.body, "heading", {
        level: 1,
        name: "Login failed",
      }),
    ).toBeDefined();

    cleanUpFunction();
  });
});
