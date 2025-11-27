import { createServer } from "../../../../app/server.js";
import { StatusCodes } from "http-status-codes";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../../../../app/session/index.js";
import { when } from "jest-when";
import { config } from "../../../../app/config/index.js";

jest.mock("../../../../app/session/index.js");

when(getSessionData)
  .calledWith(expect.anything(), sessionEntryKeys.organisation)
  .mockReturnValue({ sbi: "106354662" });

when(getSessionData)
  .calledWith(
    expect.anything(),
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.latestEndemicsApplication,
  )
  .mockReturnValue({ reference: "IAHW-A89F-7776" });

describe("/download-application", () => {
  test("returns a URL to the application from s3 when sbi and agreement reference match request", async () => {
    const server = await createServer();

    const sbi = "106354662";
    const reference = "IAHW-A89F-7776";

    const res = await server.inject({
      url: `/download-application/${sbi}/${reference}`,
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
    expect(res.headers.location).toContain(sbi);
    expect(res.headers.location).toContain(reference);
    expect(res.headers.location).toContain(config.documentBucketName);
  });

  test("throws an error if the sbi in the session does not match the sbi in the request", async () => {
    const server = await createServer();

    const sbi = "99999999";
    const reference = "IAHW-A89F-7776";

    const res = await server.inject({
      url: `/download-application/${sbi}/${reference}`,
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(res.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  test("throws an error if the reference in the session does not match the reference in the request", async () => {
    const server = await createServer();

    const sbi = "106354662";
    const reference = "IAHW-FAKE-DATA";

    const res = await server.inject({
      url: `/download-application/${sbi}/${reference}`,
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(res.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });
});
