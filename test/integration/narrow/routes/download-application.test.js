import { createServer } from "../../../../app/server.js";
import { StatusCodes } from "http-status-codes";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../../../../app/session/index.js";
import { when } from "jest-when";
import { getS3Client } from "../../../../app/s3/index.js";

jest.mock("../../../../app/session/index.js");
jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("I am a presigned url"),
}));
jest.mock("../../../../app/s3/index.js");

when(getSessionData)
  .calledWith(expect.anything(), sessionEntryKeys.organisation)
  .mockReturnValue({ sbi: "106354662" });

when(getSessionData)
  .calledWith(expect.anything(), sessionEntryKeys.confirmedDetails, sessionKeys.confirmedDetails)
  .mockReturnValue(true);

when(getSessionData)
  .calledWith(
    expect.anything(),
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.latestEndemicsApplication,
  )
  .mockReturnValue({ reference: "IAHW-A89F-7776", status: "AGREED" });

describe("/download-application", () => {
  beforeEach(() => {
    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.fundingSelection,
        sessionKeys.fundingSelection.selectedFunding,
      )
      .mockReturnValue(undefined);
  });

  test("returns a URL to the application from s3 when sbi and agreement reference match request and fundingType is missing", async () => {
    getS3Client.mockReturnValueOnce({
      send: () => {},
    });
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
    expect(res.headers.location).toEqual("I am a presigned url");
  });

  test("returns a URL to the application from s3 when sbi and agreement reference match request and fundingType is poultry", async () => {
    getS3Client.mockReturnValueOnce({
      send: () => {},
    });
    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.fundingSelection,
        sessionKeys.fundingSelection.selectedFunding,
      )
      .mockReturnValue("POUL");
    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.latestPoultryApplication,
      )
      .mockReturnValue({ reference: "POUL-A89F-7776", status: "AGREED" });

    const server = await createServer();
    const sbi = "106354662";
    const reference = "POUL-A89F-7776";

    const res = await server.inject({
      url: `/download-application/${sbi}/${reference}`,
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
    expect(res.headers.location).toEqual("I am a presigned url");
  });

  test("returns a URL to the application from s3 when sbi and agreement reference match request and fundingType is livestock", async () => {
    getS3Client.mockReturnValueOnce({
      send: () => {},
    });
    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.fundingSelection,
        sessionKeys.fundingSelection.selectedFunding,
      )
      .mockReturnValue("AHWR");

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
    expect(res.headers.location).toEqual("I am a presigned url");
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

  test("throws an error if the application does not exist", async () => {
    getS3Client.mockReturnValueOnce({
      send: jest.fn().mockRejectedValueOnce(new Error("Unable to find application")),
    });
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

    expect(res.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });
});
