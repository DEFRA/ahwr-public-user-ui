import Wreck from "@hapi/wreck";
import {
  createApplication,
  getApplicationsBySbi,
  getHerds,
  getSites,
} from "../../../../../app/api-requests/application-api.js";
import { config } from "../../../../../app/config/index.js";
import { trackError } from "../../../../../app/logging/logger.js";

jest.mock("@hapi/wreck");
jest.mock("../../../../../app/logging/logger.js", () => ({
  ...jest.requireActual("../../../../../app/logging/logger.js"),
  trackError: jest.fn(),
}));

const headers = { "x-api-key": config.apiKeys.publicUiBackendApiKey };

describe("application api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeLogger = () => ({ error: jest.fn() });

  describe("getApplicationsBySbi", () => {
    const endpoint = `${config.applicationApiUri}/applications?sbi=SBI123`;
    const args = ["SBI123"];
    const returnPayload = "ABC123";

    test("success", async () => {
      const logger = makeLogger();
      Wreck.get.mockResolvedValueOnce({ payload: returnPayload });

      const result = await getApplicationsBySbi(...args, logger);

      expect(result).toBe(returnPayload);
      expect(Wreck.get).toHaveBeenCalledWith(endpoint, { json: true, headers });
      expect(logger.error).not.toHaveBeenCalled();
    });

    test("error", async () => {
      const logger = makeLogger();
      const expectedError = new Error("Whoops");
      Wreck.get.mockImplementation(() => {
        throw expectedError;
      });

      await expect(getApplicationsBySbi(...args, logger)).rejects.toThrow("Whoops");

      expect(Wreck.get).toHaveBeenCalledWith(endpoint, { json: true, headers });
      expect(trackError).toHaveBeenCalledWith(
        logger,
        expectedError,
        "api-call-failed",
        expect.any(String),
        {
          kind: endpoint,
        },
      );
    });
  });

  describe("createApplication", () => {
    const endpoint = `${config.applicationApiUri}/applications`;
    const args = [{ testData: "stuff" }];
    const outboundPayload = { testData: "stuff" };
    const returnPayload = "ABC123";

    test("success", async () => {
      const logger = makeLogger();
      Wreck.post.mockResolvedValueOnce({ payload: returnPayload });

      const result = await createApplication(...args, logger);

      expect(result).toBe(returnPayload);
      expect(Wreck.post).toHaveBeenCalledWith(endpoint, {
        json: true,
        headers,
        payload: outboundPayload,
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    test("error", async () => {
      const logger = makeLogger();
      const expectedError = new Error("Whoops");
      Wreck.post.mockImplementation(() => {
        throw expectedError;
      });

      await expect(createApplication(...args, logger)).rejects.toThrow("Whoops");

      expect(Wreck.post).toHaveBeenCalledWith(endpoint, {
        json: true,
        headers,
        payload: outboundPayload,
      });
      expect(trackError).toHaveBeenCalledWith(
        logger,
        expectedError,
        "api-call-failed",
        expect.any(String),
        {
          kind: endpoint,
        },
      );
    });
  });

  describe("getHerds", () => {
    const endpoint = `${config.applicationApiUri}/applications/IAHW-ABVR-1234/herds?species=beef`;
    const args = ["IAHW-ABVR-1234", "beef"];
    const returnPayload = "ABC123";

    test("success", async () => {
      const logger = makeLogger();
      Wreck.get.mockResolvedValueOnce({ payload: returnPayload });

      const result = await getHerds(...args, logger);

      expect(result).toBe(returnPayload);
      expect(Wreck.get).toHaveBeenCalledWith(endpoint, { json: true, headers });
      expect(logger.error).not.toHaveBeenCalled();
    });

    test("error", async () => {
      const logger = makeLogger();
      const expectedError = new Error("Whoops");
      Wreck.get.mockImplementation(() => {
        throw expectedError;
      });

      await expect(getHerds(...args, logger)).rejects.toThrow("Whoops");

      expect(Wreck.get).toHaveBeenCalledWith(endpoint, { json: true, headers });
      expect(trackError).toHaveBeenCalledWith(
        logger,
        expectedError,
        "api-call-failed",
        expect.any(String),
        {
          kind: endpoint,
        },
      );
    });
  });

  describe("getSites", () => {
    const endpoint = `${config.applicationApiUri}/applications/IAHW-POULTRY-1234/herds?species=poultry`;
    const args = ["IAHW-POULTRY-1234"];
    const returnPayload = { herds: [{ id: "1", name: "Site 1" }] };

    test("success", async () => {
      const logger = makeLogger();
      Wreck.get.mockResolvedValueOnce({ payload: returnPayload });

      const result = await getSites(...args, logger);

      expect(result).toBe(returnPayload);
      expect(Wreck.get).toHaveBeenCalledWith(endpoint, { json: true, headers });
      expect(logger.error).not.toHaveBeenCalled();
    });

    test("error", async () => {
      const logger = makeLogger();
      const expectedError = new Error("Whoops");
      Wreck.get.mockImplementation(() => {
        throw expectedError;
      });

      await expect(getSites(...args, logger)).rejects.toThrow("Whoops");

      expect(Wreck.get).toHaveBeenCalledWith(endpoint, { json: true, headers });
      expect(trackError).toHaveBeenCalledWith(
        logger,
        expectedError,
        "api-call-failed",
        expect.any(String),
        {
          kind: endpoint,
        },
      );
    });
  });
});
