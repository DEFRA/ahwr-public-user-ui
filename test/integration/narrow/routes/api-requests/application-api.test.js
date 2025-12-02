import {
  createApplication,
  getApplicationsBySbi,
  getHerds,
} from "../../../../../app/api-requests/application-api";
import { config } from "../../../../../app/config";
import { testWreckApiFunction } from "../../../../helpers/test-wreck-api";

jest.mock("@hapi/wreck");

describe("application api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeLogger = () => ({ error: jest.fn() });

  testWreckApiFunction({
    fn: getApplicationsBySbi,
    method: "get",
    endpoint: `${config.applicationApiUri}/applications?sbi=SBI123`,
    args: ["SBI123"],
    returnPayload: "ABC123",
    logger: makeLogger(),
    outboundPayload: null,
  });

  testWreckApiFunction({
    fn: createApplication,
    method: "post",
    endpoint: `${config.applicationApiUri}/applications`,
    args: [{ testData: "stuff" }],
    outboundPayload: { testData: "stuff" },
    returnPayload: "ABC123",
    logger: makeLogger(),
  });

  testWreckApiFunction({
    fn: getHerds,
    method: "get",
    endpoint: `${config.applicationApiUri}/applications/IAHW-ABVR-1234/herds?species=beef`,
    args: ["IAHW-ABVR-1234", "beef"],
    outboundPayload: null,
    returnPayload: "ABC123",
    logger: makeLogger(),
  });
});
