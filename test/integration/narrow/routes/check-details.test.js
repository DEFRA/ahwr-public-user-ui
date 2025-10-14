import { StatusCodes } from "http-status-codes";
import { createServer } from "../../../../app/server";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../../../../app/session";
import { getCrumbs } from "../../../utils/get-crumbs";
import { when, resetAllWhenMocks } from "jest-when";

jest.mock("../../../../app/session/index.js");
jest.mock("../../../../app/auth/cookie-auth/cookie-auth.js");

describe("/check-details", () => {
  let server;
  let crumb;

  beforeAll(async () => {
    server = await createServer();
    crumb = await getCrumbs(server);
  });

  afterAll(async () => {
    await server.stop();
    jest.resetAllMocks();
  });

  afterEach(() => {
    resetAllWhenMocks();
  });

  const mockOrg = {
    cph: "33/333/3333",
    sbi: "333333333",
    name: "My Farm",
    farmerName: "Farmer Giles",
    email: "test@test.com",
    orgEmail: "org@email.com",
    isTest: true,
    address: "Long dusty road, Middle-of-knowhere, In the countryside, CC33 3CC",
  };

  test("GET /check-details throws an error if there is no organisation in the session", async () => {
    const res = await server.inject({
      url: "/check-details",
      method: "GET",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(res.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  test("GET /check-details with organisation in the session, happy path", async () => {
    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.organisation,
      )
      .mockReturnValue(mockOrg);

    const res = await server.inject({
      url: "/check-details",
      method: "GET",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(res.statusCode).toBe(StatusCodes.OK);
  });

  test("POST /check-details with no payload returns a 400", async () => {
    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.organisation,
      )
      .mockReturnValue(mockOrg);

    const res = await server.inject({
      url: "/check-details",
      method: "POST",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
      payload: { crumb },
      headers: { cookie: `crumb=${crumb}` },
    });

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  test("POST /check-details with confirmCheckDetails in payload but not a valid answer returns a 400", async () => {
    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.organisation,
      )
      .mockReturnValue(mockOrg);

    const res = await server.inject({
      url: "/check-details",
      method: "POST",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
      payload: { crumb, confirmCheckDetails: "maybe" },
      headers: { cookie: `crumb=${crumb}` },
    });

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  test("POST /check-details with confirmCheckDetails = yes in payload, and redirects to apply", async () => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.signInRedirect, sessionKeys.signInRedirect)
      .mockReturnValue(true);

    const res = await server.inject({
      url: "/check-details",
      method: "POST",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
      payload: { crumb, confirmCheckDetails: "yes" },
      headers: { cookie: `crumb=${crumb}` },
    });

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
    expect(res.headers.location).toEqual("/you-can-claim-multiple");
  });

  test("POST /check-details with valid confirmCheckDetails = yes in payload, and redirects to dashboard", async () => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.signInRedirect, sessionKeys.signInRedirect)
      .mockReturnValue(null);

    const res = await server.inject({
      url: "/check-details",
      method: "POST",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
      payload: { crumb, confirmCheckDetails: "yes" },
      headers: { cookie: `crumb=${crumb}` },
    });

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
    expect(res.headers.location).toEqual("/vet-visits");
  });

  test("POST /check-details with valid confirmCheckDetails = no in payload, and renders update details page", async () => {
    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.organisation,
      )
      .mockReturnValue(mockOrg);

    const res = await server.inject({
      url: "/check-details",
      method: "POST",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
      payload: { crumb, confirmCheckDetails: "no" },
      headers: { cookie: `crumb=${crumb}` },
    });

    expect(res.statusCode).toBe(StatusCodes.OK);
  });
});
