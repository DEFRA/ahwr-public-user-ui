import {
  createApplication,
  getApplicationsBySbi,
  getHerds,
} from "../../../../../app/api-requests/application-api";
import { config } from "../../../../../app/config";
import { testWreckApiFunction } from "../../../../helpers/test-wreck-api";

jest.mock("@hapi/wreck");
jest.mock("../../../../../app/logging/logger.js", () => ({
  ...jest.requireActual("../../../../../app/logging/logger.js"),
  trackError: jest.fn(),
}));

describe("application api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeLogger = () => ({ error: jest.fn() });

  test("getApplicationsBySbi", async () => {
    await testWreckApiFunction({
      fn: getApplicationsBySbi,
      method: "get",
      endpoint: `${config.applicationApiUri}/applications?sbi=SBI123`,
      args: ["SBI123"],
      returnPayload: "ABC123",
      logger: makeLogger(),
      outboundPayload: null,
    });
  });

  test("createApplication", async () => {
    await testWreckApiFunction({
      fn: createApplication,
      method: "post",
      endpoint: `${config.applicationApiUri}/applications`,
      args: [{ testData: "stuff" }],
      outboundPayload: { testData: "stuff" },
      returnPayload: "ABC123",
      logger: makeLogger(),
    });
  });

  test("getHerds", async () => {
    await testWreckApiFunction({
      fn: getHerds,
      method: "get",
      endpoint: `${config.applicationApiUri}/applications/IAHW-ABVR-1234/herds?species=beef`,
      args: ["IAHW-ABVR-1234", "beef"],
      outboundPayload: null,
      returnPayload: "ABC123",
      logger: makeLogger(),
    });
  });
});
