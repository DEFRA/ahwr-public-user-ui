import wreck from "@hapi/wreck";
import { acquireSigningKey } from "../../../../../app/auth/token-verify/acquire-signing-key.js";

jest.mock("@hapi/wreck", () => ({
  get: jest.fn(),
}));

jest.mock("../../../../../app/config", () => ({
  ...jest.requireActual("../../../../../app/config"),
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
  it("should return throw errors", async () => {
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
