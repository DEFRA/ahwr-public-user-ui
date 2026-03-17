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
    test("no check no agreement", async () => {
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

    test("check no agreement", async () => {
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
      expect(res.headers.location).toBe("/you-can-claim-multiple");
    });

    test("check and agreement", async () => {
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
  });

  test("get /: no auth", async () => {
    const res = await server.inject({
      url: "/",
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toMatch("/sign-in");
  });
});
