import {
  createApplication,
  getApplicationsBySbi,
  getHerds,
  getSites,
} from "../../../../../app/api-requests/application-api.js";
import { config } from "../../../../../app/config/index.js";
import { testWreckApiFunction } from "../../../../helpers/test-wreck-api.js";

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

  test("getSites", async () => {
    await testWreckApiFunction({
      fn: getSites,
      method: "get",
      endpoint: `${config.applicationApiUri}/applications/POUL-POULTRY-1234/herds?species=poultry`,
      args: ["POUL-POULTRY-1234"],
      outboundPayload: null,
      returnPayload: { herds: [{ id: "1", name: "Site 1" }] },
      logger: makeLogger(),
    });
  });
});
