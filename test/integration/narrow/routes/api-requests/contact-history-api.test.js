import Wreck from "@hapi/wreck";
import { config } from "../../../../../app/config/index.js";
import { updateContactHistory } from "../../../../../app/api-requests/contact-history-api.js";
import { trackError } from "../../../../../app/logging/logger.js";

jest.mock("@hapi/wreck");
jest.mock("../../../../../app/logging/logger.js", () => ({
  ...jest.requireActual("../../../../../app/logging/logger.js"),
  trackError: jest.fn(),
}));

const headers = { "x-api-key": config.apiKeys.publicUiBackendApiKey };

describe("contact history api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeLogger = () => ({ error: jest.fn() });

  describe("updateContactHistory", () => {
    const endpoint = `${config.applicationApiUri}/applications/contact-history`;
    const args = [
      { name: "Mr Agent", email: "agent1@theagency.com" },
      { email: "biz@business.com", sbi: "123456789", address: "Somewhere, over the rainbow" },
      "crn12345",
      "Agent",
    ];
    const outboundPayload = {
      address: "Somewhere, over the rainbow",
      crn: "crn12345",
      email: "agent1@theagency.com",
      farmerName: "Mr Agent",
      orgEmail: "biz@business.com",
      personRole: "Agent",
      sbi: "123456789",
      user: "admin",
    };
    const returnPayload = "ABC123";

    test("success", async () => {
      const logger = makeLogger();
      Wreck.put.mockResolvedValueOnce({ payload: returnPayload });

      const result = await updateContactHistory(...args, logger);

      expect(result).toBe(returnPayload);
      expect(Wreck.put).toHaveBeenCalledWith(endpoint, {
        json: true,
        headers,
        payload: outboundPayload,
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    test("error", async () => {
      const logger = makeLogger();
      const expectedError = new Error("Whoops");
      Wreck.put.mockImplementation(() => {
        throw expectedError;
      });

      await expect(updateContactHistory(...args, logger)).rejects.toThrow("Whoops");

      expect(Wreck.put).toHaveBeenCalledWith(endpoint, {
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
});
