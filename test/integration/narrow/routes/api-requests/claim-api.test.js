import {
  getClaimsByApplicationReference,
  submitNewClaim,
  isURNUnique,
} from "../../../../../app/api-requests/claim-api";
import { config } from "../../../../../app/config";
import { testWreckApiFunction } from "../../../../helpers/test-wreck-api";

jest.mock("@hapi/wreck");

describe("claim api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeLogger = () => ({ error: jest.fn() });

  testWreckApiFunction({
    fn: getClaimsByApplicationReference,
    method: "get",
    endpoint: `${config.applicationApiUri}/applications/REF123/claims`,
    args: ["REF123"],
    returnPayload: "ABC123",
    logger: makeLogger(),
    outboundPayload: null,
  });

  testWreckApiFunction({
    fn: submitNewClaim,
    method: "post",
    endpoint: `${config.applicationApiUri}/claims`,
    args: [{ testData: "stuff" }],
    outboundPayload: { testData: "stuff" },
    returnPayload: "ABC123",
    logger: makeLogger(),
  });

  testWreckApiFunction({
    fn: isURNUnique,
    method: "post",
    endpoint: `${config.applicationApiUri}/claims/is-urn-unique`,
    args: [{ testData: "stuff" }],
    outboundPayload: { testData: "stuff" },
    returnPayload: "ABC123",
    logger: makeLogger(),
  });
});
