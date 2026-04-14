import Wreck from "@hapi/wreck";
import { sendRPAGetRequest } from "../../../../../app/api-requests/rpa-api/send-get-request.js";
import { trackError, getLogger } from "../../../../../app/logging/logger.js";

jest.mock("@hapi/wreck");

const mockLogger = { error: jest.fn() };

jest.mock("../../../../../app/logging/logger.js", () => ({
  getLogger: jest.fn(() => mockLogger),
  trackError: jest.fn(),
  API_CALL_FAILED_CATEGORY: "api-call-failed",
}));

jest.mock("../../../../../app/config/auth.js", () => ({
  authConfig: {
    ruralPaymentsAgency: {
      hostname: "https://rpa.example.com",
    },
    apim: {
      ocpSubscriptionKey: "test-subscription-key",
    },
  },
}));

jest.mock("../../../../../app/config/index.js", () => ({
  config: {
    wreckHttp: {
      timeoutMilliseconds: 10000,
    },
  },
}));

jest.mock("../../../../../app/constants/constants.js", () => ({
  apiHeaders: {
    xForwardedAuthorization: "X-Forwarded-Authorization",
    ocpSubscriptionKey: "Ocp-Apim-Subscription-Key",
  },
}));

describe("sendRPAGetRequest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultArgs = {
    url: "/api/person/summary",
    defraIdAccessToken: "test-token",
    headers: { "x-custom": "header" },
  };

  it("returns payload on success", async () => {
    const mockPayload = { name: "Test Person" };
    Wreck.get.mockResolvedValueOnce({ payload: mockPayload });

    const result = await sendRPAGetRequest(defaultArgs);

    expect(result).toEqual(mockPayload);
    expect(Wreck.get).toHaveBeenCalledWith("https://rpa.example.com/api/person/summary", {
      headers: {
        "x-custom": "header",
        "X-Forwarded-Authorization": "test-token",
        "Ocp-Apim-Subscription-Key": "test-subscription-key",
      },
      json: true,
      rejectUnauthorized: false,
      timeout: 10000,
    });
    expect(trackError).not.toHaveBeenCalled();
  });

  it("calls trackError and re-throws on error", async () => {
    const expectedError = new Error("read ECONNRESET");
    Wreck.get.mockRejectedValueOnce(expectedError);

    await expect(sendRPAGetRequest(defaultArgs)).rejects.toThrow("read ECONNRESET");

    expect(trackError).toHaveBeenCalledWith(
      getLogger(),
      expectedError,
      "api-call-failed",
      "RPA API GET request failed",
      {
        kind: "https://rpa.example.com/api/person/summary",
      },
    );
  });
});
