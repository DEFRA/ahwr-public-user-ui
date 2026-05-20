import {
  getClaimsByApplicationReference,
  submitNewClaim,
  isURNUnique,
  getClaimsCount,
} from "../../../../../app/api-requests/claim-api.js";
import { config } from "../../../../../app/config/index.js";
import { testWreckApiFunction } from "../../../../helpers/test-wreck-api.js";
import { POULTRY_SCHEME } from "ffc-ahwr-common-library";

jest.mock("@hapi/wreck");
jest.mock("../../../../../app/logging/logger.js", () => ({
  ...jest.requireActual("../../../../../app/logging/logger.js"),
  trackError: jest.fn(),
}));

describe("claim api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeLogger = () => ({ error: jest.fn() });

  test("getClaimsByApplicationReference", async () => {
    await testWreckApiFunction({
      fn: getClaimsByApplicationReference,
      method: "get",
      endpoint: `${config.applicationApiUri}/applications/REF123/claims`,
      args: ["REF123"],
      returnPayload: "ABC123",
      logger: makeLogger(),
      outboundPayload: null,
    });
  });

  test("submitNewClaim", async () => {
    await testWreckApiFunction({
      fn: submitNewClaim,
      method: "post",
      endpoint: `${config.applicationApiUri}/claims`,
      args: [{ testData: "stuff" }],
      outboundPayload: { testData: "stuff" },
      returnPayload: "ABC123",
      logger: makeLogger(),
    });
  });

  test("isURNUnique", async () => {
    await testWreckApiFunction({
      fn: isURNUnique,
      method: "post",
      endpoint: `${config.applicationApiUri}/claims/is-urn-unique`,
      args: [{ testData: "stuff" }],
      outboundPayload: { testData: "stuff" },
      returnPayload: "ABC123",
      logger: makeLogger(),
    });
  });

  test("getClaimsCount sends cph, the poultry scheme and herdId", async () => {
    const params = new URLSearchParams({
      cph: "22/333/4444",
      scheme: POULTRY_SCHEME,
      herdId: "e3d320b7-b2cf-469a-903f-ead7587d98e9",
    });
    await testWreckApiFunction({
      fn: getClaimsCount,
      method: "get",
      endpoint: `${config.applicationApiUri}/claims/count?${params.toString()}`,
      args: ["22/333/4444", "e3d320b7-b2cf-469a-903f-ead7587d98e9", POULTRY_SCHEME],
      outboundPayload: null,
      returnPayload: { count: 2 },
      logger: makeLogger(),
    });
  });

  test("getClaimsCount omits herdId when not supplied but still sends the poultry scheme", async () => {
    const params = new URLSearchParams({
      cph: "22/333/4444",
      scheme: POULTRY_SCHEME,
    });
    await testWreckApiFunction({
      fn: getClaimsCount,
      method: "get",
      endpoint: `${config.applicationApiUri}/claims/count?${params.toString()}`,
      args: ["22/333/4444", undefined, POULTRY_SCHEME],
      outboundPayload: null,
      returnPayload: { count: 0 },
      logger: makeLogger(),
    });
  });
});
