import { config } from "../../../../../app/config/index.js";
import { updateContactHistory } from "../../../../../app/api-requests/contact-history-api.js";
import { testWreckApiFunction } from "../../../../helpers/test-wreck-api.js";

jest.mock("@hapi/wreck");

describe("contact history api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeLogger = () => ({ error: jest.fn() });

  test("updateContactHistory", () => {
    testWreckApiFunction({
      fn: updateContactHistory,
      method: "put",
      endpoint: `${config.applicationApiUri}/applications/contact-history`,
      args: [
        { name: "Mr Agent", email: "agent1@theagency.com" },
        { email: "biz@business.com", sbi: "123456789", address: "Somewhere, over the rainbow" },
        "crn12345",
        "Agent",
      ],
      outboundPayload: {
        address: "Somewhere, over the rainbow",
        crn: "crn12345",
        email: "agent1@theagency.com",
        farmerName: "Mr Agent",
        orgEmail: "biz@business.com",
        personRole: "Agent",
        sbi: "123456789",
        user: "admin",
      },
      returnPayload: "ABC123",
      errorLogItems: { endpoint: `${config.applicationApiUri}/applications/contact-history` },
      logger: makeLogger(),
    });
  });
});
