import { config } from "../../../../app/config";
import { when } from "jest-when";
import { createServer } from "../../../../app/server.js";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../../../../app/session/index.js";

jest.mock("../../../../app/session");

describe("root / path", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
  });

  describe("get /", () => {
    afterEach(() => {
      jest.resetAllMocks();
    });
    test("no check no agreements", async () => {
      const res = await server.inject({
        url: "/",
        auth: {
          credentials: {},
          strategy: "cookie",
        },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe("/check-details");
    });

    test("check no agreement no poultry flag", async () => {
      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.confirmedDetails,
          sessionKeys.confirmedDetails,
        )
        .mockReturnValue(true);

      config.poultry.enabled = false;
      const res = await server.inject({
        url: "/",
        auth: {
          credentials: {},
          strategy: "cookie",
        },
      });

      expect(res.statusCode).toBe(302);
      // Take into account that with no agreement, after this redirection
      // in the running app there will be an additional redirection
      expect(res.headers.location).toBe("/vet-visits");
    });

    test("check no agreements with poultry flag", async () => {
      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.confirmedDetails,
          sessionKeys.confirmedDetails,
        )
        .mockReturnValue(true);

      config.poultry.enabled = true;
      const res = await server.inject({
        url: "/",
        auth: {
          credentials: {},
          strategy: "cookie",
        },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe("/select-funding");
    });

    test("check and livestock agreement no poultry flag", async () => {
      config.poultry.enabled = false;

      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.latestEndemicsApplication,
        )
        .mockReturnValue({ status: "AGREED" });

      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.confirmedDetails,
          sessionKeys.confirmedDetails,
        )
        .mockReturnValue(true);
      const res = await server.inject({
        url: "/",
        auth: {
          credentials: {},
          strategy: "cookie",
        },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe("/vet-visits");
    });

    test("check and livestock agreement with poultry flag", async () => {
      config.poultry.enabled = true;

      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.latestEndemicsApplication,
        )
        .mockReturnValue({ status: "AGREED" });

      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.confirmedDetails,
          sessionKeys.confirmedDetails,
        )
        .mockReturnValue(true);
      const res = await server.inject({
        url: "/",
        auth: {
          credentials: {},
          strategy: "cookie",
        },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe("/select-funding");
    });

    test("check and poultry agreement with poultry flag", async () => {
      config.poultry.enabled = true;

      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.poultryClaim,
          sessionKeys.poultryClaim.latestPoultryApplication,
        )
        .mockReturnValue({ status: "AGREED" });

      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.confirmedDetails,
          sessionKeys.confirmedDetails,
        )
        .mockReturnValue(true);
      const res = await server.inject({
        url: "/",
        auth: {
          credentials: {},
          strategy: "cookie",
        },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe("/select-funding");
    });
  });

  test("get /: no auth", async () => {
    const res = await server.inject({
      url: "/",
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toMatch("/sign-in");
  });
});
