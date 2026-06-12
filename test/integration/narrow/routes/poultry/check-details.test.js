import { StatusCodes } from "http-status-codes";
import { createServer } from "../../../../../app/server.js";
import {
  setSessionEntry,
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../../../app/session/index.js";
import { getCrumbs } from "../../../../utils/get-crumbs.js";
import { when, resetAllWhenMocks } from "jest-when";

jest.mock("../../../../../app/session/index.js");
jest.mock("../../../../../app/auth/cookie-auth/cookie-auth.js");

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

  describe("GET /check-details", () => {
    test("throws an error when organisation is not in the session", async () => {
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

    test("renders page when organisation in the session", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.organisation)
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
      expect(res.payload).toContain("Business details");
      expect(res.payload).toContain("Personal details");
      expect(res.payload).toContain("If these details are incorrect");
    });

    test("does not show Manage your claims link when status is AGREED", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.organisation)
        .mockReturnValue(mockOrg);

      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.latestEndemicsApplication,
        )
        .mockReturnValue({ status: "AGREED" });

      const res = await server.inject({
        url: "/check-details",
        method: "GET",
        auth: {
          credentials: {},
          strategy: "cookie",
        },
      });

      expect(res.statusCode).toBe(StatusCodes.OK);
      expect(res.payload).not.toContain("Manage your claims");
    });
  });

  describe("POST /check-details", () => {
    test("returns 400 when no payload", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.organisation)
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

    test("returns 400 when confirmCheckDetails is not valid ", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.organisation)
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

    test("redirects to select funding when confirmCheckDetails is yes", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.signInRedirect)
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
      expect(res.headers.location).toEqual("/select-funding");
      expect(setSessionEntry).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.confirmedDetails,
        true,
        { shouldEmitEvent: false },
      );
    });

    test("renders update details page when confirmCheckDetails is no", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.organisation)
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
});
