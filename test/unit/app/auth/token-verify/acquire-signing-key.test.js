import wreck from "@hapi/wreck";
import { acquireSigningKey } from "../../../../../app/auth/token-verify/acquire-signing-key.js";
import { trackError, getLogger } from "../../../../../app/logging/logger.js";

jest.mock("@hapi/wreck", () => ({
  get: jest.fn(),
}));

const mockLogger = { error: jest.fn() };

jest.mock("../../../../../app/logging/logger.js", () => ({
  getLogger: jest.fn(() => mockLogger),
  trackError: jest.fn(),
  API_CALL_FAILED_CATEGORY: "api-call-failed",
}));

jest.mock("../../../../../app/config/auth.js", () => ({
  authConfig: {
    ruralPaymentsAgency: {
      hostname: "https://example.com",
    },
    defraId: {
      hostname: "https://example.com",
      policy: "policy123",
    },
  },
}));

describe("acquireSigningKey error scenario", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw errors and call trackError", async () => {
    const response = {
      res: {
        statusCode: 500,
        statusMessage: "Internal Server Error",
      },
      payload: null,
    };
    wreck.get.mockRejectedValueOnce(response);

    await expect(async () => {
      await acquireSigningKey();
    }).rejects.toEqual(response);

    expect(trackError).toHaveBeenCalledWith(
      getLogger(),
      response,
      "api-call-failed",
      "Failed to acquire signing key",
      {
        kind: "https://example.com/discovery/v2.0/keys?p=policy123",
      },
    );
  });
});

// Assuming @hapi/wreck and config are already mocked from the previous example
describe("acquireSigningKey success scenario", () => {
  it("should return the first signing key on successful acquisition", async () => {
    // Mock signing key data as expected from the successful response
    const mockSigningKeys = {
      keys: [
        { kid: "key1", use: "sig" /* other key properties */ },
        // Additional keys can be listed here if needed
      ],
    };

    // Setup Wreck to simulate a successful response
    wreck.get.mockResolvedValue({
      res: {
        statusCode: 200,
        statusMessage: "OK",
      },
      payload: mockSigningKeys,
    });

    const result = await acquireSigningKey();

    expect(result).toEqual(mockSigningKeys.keys[0]);
  });
});
