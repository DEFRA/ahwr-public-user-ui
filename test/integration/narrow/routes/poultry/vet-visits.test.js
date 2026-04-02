import { setServerState } from "../../../../helpers/set-server-state.js";
import { config } from "../../../../../app/config/index.js";
import { createServer } from "../../../../../app/server.js";
import { load } from "cheerio";
import { getClaimsByApplicationReference } from "../../../../../app/api-requests/claim-api.js";
import { axe } from "../../../../helpers/axe-helper.js";

jest.mock("../../../../../app/api-requests/claim-api.js");
jest.mock("../../../../../app/auth/auth-code-grant/request-authorization-code-url.js", () => ({
  requestAuthorizationCodeUrl: jest.fn().mockReturnValue("auth-code-url"),
}));
jest.mock("../../../../../app/lib/context-helper.js");

describe("GET /vet-visits", () => {
  let server;

  beforeAll(async () => {
    config.poultry.enabled = true;
    server = await createServer();
    await server.initialize();
  });

  afterAll(async () => {
    await server.stop();
  });

  const options = {
    url: "/poultry/vet-visits",
    auth: {
      credentials: {},
      strategy: "cookie",
    },
  };

  test("should redirect to check details when they have not been checked", async () => {
    const state = {
      customer: {
        attachedToMultipleBusinesses: false,
      },
      poultryClaim: {},
      organisation: {
        sbi: "106354662",
        name: "PARTRIDGES",
        farmerName: "Janice Harrison",
      },
    };

    await setServerState(server, state);

    const res = await server.inject(options);

    expect(res.headers.location).toBe("/check-details");
  });

  test("should redirect to apply journey when no agreement", async () => {
    const state = {
      confirmedDetails: true,
      customer: {
        attachedToMultipleBusinesses: false,
      },
      poultryClaim: {},
      organisation: {
        sbi: "106354662",
        name: "PARTRIDGES",
        farmerName: "Janice Harrison",
      },
    };

    await setServerState(server, state);

    const res = await server.inject(options);

    expect(res.headers.location).toBe("/poultry/you-can-claim-multiple");
  });

  test("should show no poultry claims when no claims have been made and existing application", async () => {
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

    const res = await server.inject(options);
    const $ = load(res.payload);

    const startLink = $('a:contains("Start a new claim")');
    expect(startLink.length).toBeGreaterThan(0);
    expect(startLink.attr("href")).toContain("/poultry/date-of-review");

    expect($("body").text()).toContain("Claim for a different agreement");

    const container = $("*:contains('Species included in this agreement:')").parent();
    expect(container.text()).toContain("poultry");

    expect(await axe(res.payload)).toHaveNoViolations();
  });
});
