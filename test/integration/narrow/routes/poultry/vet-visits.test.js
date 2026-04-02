/**
 * @jest-environment node
 */
import { setServerState } from "../../../../helpers/set-server-state.js";
import { config } from "../../../../../app/config/index.js";
import { createServer } from "../../../../../app/server.js";
import globalJsdom from "global-jsdom";
import { getByRole, getByText, within } from "@testing-library/dom";
import { getClaimsByApplicationReference } from "../../../../../app/api-requests/claim-api.js";

jest.mock("../../../../../app/api-requests/claim-api.js");
jest.mock("../../../../../app/auth/auth-code-grant/request-authorization-code-url.js", () => ({
  requestAuthorizationCodeUrl: jest.fn().mockReturnValue("auth-code-url"),
}));
jest.mock("../../../../../app/lib/context-helper.js");
config.poultry.enabled = true;

describe("GET /vet-visits", () => {
  let cleanUpFunction = () => {};
  let server;

  beforeAll(async () => {
    config.poultry.enabled = true;
    server = await createServer();
    config.poultry.enabled = true;

    await server.initialize();
  });

  beforeEach(async () => {
    cleanUpFunction();
    config.poultry.enabled = true;

    // server = await createServer();
    // config.poultry.enabled = true;
  });

  afterAll(async () => {
    await server.stop();
    jest.resetAllMocks();
  });

  const options = {
    url: "/poultry/vet-visits",
    auth: {
      credentials: {},
      strategy: "cookie",
    },
  };

  test("details not checked redirects to get them checked", async () => {
    const sbi = "106354662";
    const state = {
      customer: {
        attachedToMultipleBusinesses: false,
      },
      poultryClaim: {},
      organisation: {
        sbi,
        name: "PARTRIDGES",
        farmerName: "Janice Harrison",
      },
    };

    await setServerState(server, state);

    const { headers } = await server.inject(options);

    expect(headers.location).toBe("/check-details");
  });

  test("no agreement redirects to new one", async () => {
    const sbi = "106354662";
    const state = {
      confirmedDetails: true,
      customer: {
        attachedToMultipleBusinesses: false,
      },
      poultryClaim: {},
      organisation: {
        sbi,
        name: "PARTRIDGES",
        farmerName: "Janice Harrison",
      },
    };

    await setServerState(server, state);

    const { headers } = await server.inject(options);

    expect(headers.location).toBe("/you-can-claim-multiple");
  });

  test("poultry agreement, no claims made", async () => {
    const sbi = "123123123";
    const state = {
      confirmedDetails: true,
      customer: {
        attachedToMultipleBusinesses: true,
      },
      poultryClaim: {
        latestPoultryApplication: {
          sbi,
          type: "EE",
          reference: "POUL-TEST-NEW2",
          createdAt: "2026-01-03",
          redacted: false,
          status: "AGREED",
        },
      },
      endemicsClaim: {
        latestEndemicsApplication: {
          sbi,
          type: "EE",
          reference: "IAHW-TEST-NEW2",
          redacted: false,
          status: "AGREED",
        },
        latestVetVisitApplication: undefined,
      },
      organisation: {
        sbi,
        name: "TEST FARM",
        farmerName: "Farmer Joe",
      },
    };
    await setServerState(server, state);

    getClaimsByApplicationReference.mockResolvedValueOnce([]);

    const response = await server.inject(options);
    const { payload } = response;
    cleanUpFunction = globalJsdom(payload);

    console.log(response);

    expect(getByRole(document.body, "button", { name: "Start a new claim" })).toHaveProperty(
      "href",
      expect.stringContaining("/which-species-of-poultry"),
    );
    expect(getByText(document.body, "Claim for a different agreement")).toBeTruthy();
    const container = getByText(document.body, "Species included in this agreement:").parentElement;
    expect(within(container).getByText("poultry")).toBeTruthy();
  });
});
