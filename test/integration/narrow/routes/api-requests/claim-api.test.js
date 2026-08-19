import Wreck from "@hapi/wreck";
import {
  getClaimsByApplicationReference,
  submitNewClaim,
  isURNUnique,
  getClaimsCount,
} from "../../../../../app/api-requests/claim-api.js";
import { config } from "../../../../../app/config/index.js";
import { trackError } from "../../../../../app/logging/logger.js";
import { POULTRY_SCHEME } from "ffc-ahwr-common-library";

jest.mock("@hapi/wreck");
jest.mock("../../../../../app/logging/logger.js", () => ({
  ...jest.requireActual("../../../../../app/logging/logger.js"),
  trackError: jest.fn(),
}));

const headers = { "x-api-key": config.get("apiKeys.publicUiBackendApiKey") };

describe("claim api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeLogger = () => ({ error: jest.fn() });

  describe("getClaimsByApplicationReference", () => {
    const endpoint = `${config.get("applicationApiUri")}/applications/REF123/claims`;
    const args = ["REF123"];
    const returnPayload = "ABC123";

    test("success", async () => {
      const logger = makeLogger();
      Wreck.get.mockResolvedValueOnce({ payload: returnPayload });

      const result = await getClaimsByApplicationReference(...args, logger);

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

      await expect(getClaimsByApplicationReference(...args, logger)).rejects.toThrow("Whoops");

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

  describe("submitNewClaim", () => {
    const endpoint = `${config.get("applicationApiUri")}/claims`;
    const args = [{ testData: "stuff" }];
    const outboundPayload = { testData: "stuff" };
    const returnPayload = "ABC123";

    test("success", async () => {
      const logger = makeLogger();
      Wreck.post.mockResolvedValueOnce({ payload: returnPayload });

      const result = await submitNewClaim(...args, logger);

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

      await expect(submitNewClaim(...args, logger)).rejects.toThrow("Whoops");

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

  describe("isURNUnique", () => {
    const endpoint = `${config.get("applicationApiUri")}/claims/is-urn-unique`;
    const args = [{ testData: "stuff" }];
    const outboundPayload = { testData: "stuff" };
    const returnPayload = "ABC123";

    test("success", async () => {
      const logger = makeLogger();
      Wreck.post.mockResolvedValueOnce({ payload: returnPayload });

      const result = await isURNUnique(...args, logger);

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

      await expect(isURNUnique(...args, logger)).rejects.toThrow("Whoops");

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

  describe("getClaimsCount sends cph, the poultry scheme and herdId", () => {
    const params = new URLSearchParams({
      cph: "22/333/4444",
      scheme: POULTRY_SCHEME,
      herdId: "e3d320b7-b2cf-469a-903f-ead7587d98e9",
    });
    const endpoint = `${config.get("applicationApiUri")}/claims/count?${params.toString()}`;
    const args = ["22/333/4444", "e3d320b7-b2cf-469a-903f-ead7587d98e9", POULTRY_SCHEME];
    const returnPayload = { count: 2 };

    test("success", async () => {
      const logger = makeLogger();
      Wreck.get.mockResolvedValueOnce({ payload: returnPayload });

      const result = await getClaimsCount(...args, logger);

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

      await expect(getClaimsCount(...args, logger)).rejects.toThrow("Whoops");

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

  describe("getClaimsCount omits herdId when not supplied but still sends the poultry scheme", () => {
    const params = new URLSearchParams({
      cph: "22/333/4444",
      scheme: POULTRY_SCHEME,
    });
    const endpoint = `${config.get("applicationApiUri")}/claims/count?${params.toString()}`;
    const args = ["22/333/4444", undefined, POULTRY_SCHEME];
    const returnPayload = { count: 0 };

    test("success", async () => {
      const logger = makeLogger();
      Wreck.get.mockResolvedValueOnce({ payload: returnPayload });

      const result = await getClaimsCount(...args, logger);

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

      await expect(getClaimsCount(...args, logger)).rejects.toThrow("Whoops");

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
