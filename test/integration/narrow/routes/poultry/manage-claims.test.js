import { setServerState } from "../../../../helpers/set-server-state.js";
import { createServer } from "../../../../../app/server.js";
import { load } from "cheerio";
import { getClaimsByApplicationReference } from "../../../../../app/api-requests/claim-api.js";
import { axe } from "../../../../helpers/axe-helper.js";
import { findLinkByText } from "../../../../helpers/find-link-by-text.js";

jest.mock("../../../../../app/api-requests/claim-api.js");
jest.mock("../../../../../app/auth/auth-code-grant/request-authorization-code-url.js", () => ({
  requestAuthorizationCodeUrl: jest.fn().mockReturnValue("auth-code-url"),
}));
jest.mock("../../../../../app/lib/context-helper.js");

const cleanText = (text) => text.replace(/\s+/g, " ").trim();

const getTableCells = ($) => {
  const rows = [];

  $("table")
    .find("tr")
    .each((_, row) => {
      const cells = [];

      $(row)
        .children("th, td")
        .each((_, cell) => {
          cells.push(cleanText($(cell).text()));
        });

      if (cells.length) {
        rows.push(cells);
      }
    });

  return rows;
};

const TEST_SBI = "123123123";

const baseOrganisation = {
  sbi: TEST_SBI,
  name: "TEST FARM",
  farmerName: "Farmer Joe",
};

const agreedPoultryApplication = {
  sbi: TEST_SBI,
  type: "EE",
  reference: "POUL-1LZ5-ELVQ",
  createdAt: "2026-01-03",
  redacted: false,
  status: "AGREED",
};

const baseState = {
  confirmedDetails: true,
  customer: {
    attachedToMultipleBusinesses: true,
  },
  poultryClaim: {
    latestPoultryApplication: agreedPoultryApplication,
  },
  endemicsClaim: {},
  organisation: baseOrganisation,
};

describe("GET /poultry/manage-claims", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();
  });

  afterAll(async () => {
    await server.stop();
  });

  const options = {
    url: "/poultry/manage-claims",
    auth: {
      credentials: {},
      strategy: "cookie",
    },
  };

  test("should redirect to check details when they have not been checked", async () => {
    const state = {
      customer: baseState.customer,
      poultryClaim: {},
      organisation: baseOrganisation,
    };

    await setServerState(server, state);

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/check-details");
  });

  test("should redirect to apply journey when no agreement", async () => {
    const state = {
      confirmedDetails: true,
      customer: baseState.customer,
      poultryClaim: {},
      organisation: baseOrganisation,
    };

    await setServerState(server, state);

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/poultry/what-you-can-claim");
  });

  test("should show no poultry claims when no claims have been made and has an agreement", async () => {
    const state = { ...baseState };

    await setServerState(server, state);

    getClaimsByApplicationReference.mockResolvedValueOnce([]);

    const res = await server.inject(options);
    const $ = load(res.payload);

    const startLink = findLinkByText($, "Start a new claim").first();
    expect(startLink.length).toBeGreaterThan(0);
    expect(startLink.attr("href")).toContain("/poultry/date-of-visit");

    expect($("body").text()).toContain("Claim for a different agreement");

    const container = $("*:contains('Species included in this agreement:')").parent();
    expect(container.text()).toContain("poultry");

    expect($("body").text()).toContain("You have not submitted any claims yet.");

    expect(await axe(res.payload)).toHaveNoViolations();
  });

  test("should show poultry claims when claims exist", async () => {
    const state = { ...baseState };

    await setServerState(server, state);

    getClaimsByApplicationReference.mockResolvedValueOnce([
      {
        reference: "PORE-D51M-QLIJ",
        data: {
          dateOfVisit: "2026-04-21T00:00:00.000Z",
          typesOfPoultry: [
            "chickens",
            "broilers",
            "laying-hens",
            "breeders",
            "ducks",
            "geese",
            "turkeys",
          ],
        },
        status: "IN_CHECK",
        herd: {
          name: "site one",
        },
      },
      {
        reference: "PORE-D51M-ABCJ",
        data: {
          dateOfVisit: "2026-06-04T00:00:00.000Z",
          typesOfPoultry: ["broilers", "laying-hens"],
        },
        status: "PAID",
        herd: {
          name: "site two",
        },
      },
    ]);

    const res = await server.inject(options);
    const $ = load(res.payload);

    const otherBiz = findLinkByText($, "Claim for a different business").first();
    expect(otherBiz.attr("href")).toContain("auth-code-url");

    const startLink = findLinkByText($, "Start a new claim").first();
    expect(startLink.length).toBeGreaterThan(0);
    expect(startLink.attr("href")).toContain("/poultry/date-of-visit");

    const link = findLinkByText($, "Download agreement summary").first();
    expect(link.attr("href")).toContain(`/download-application/${TEST_SBI}/POUL-1LZ5-ELVQ`);

    expect($("body").text()).toContain("Claim for a different agreement");

    const container = $("*:contains('Species included in this agreement:')").parent();
    expect(container.text()).toContain("poultry");

    expect(getTableCells($)).toEqual([
      ["Review date", "Site name", "Type of poultry", "Claim number", "Status"],
      [
        "21 April 2026",
        "site one",
        "Broilers, laying hens, breeders, ducks, geese, turkeys",
        "PORE-D51M-QLIJ",
        "Submitted",
      ],
      ["4 June 2026", "site two", "Broilers, laying hens", "PORE-D51M-ABCJ", "Paid"],
    ]);
    expect($("body").text()).not.toContain("Chickens");
    expect($("body").text()).not.toContain("You have not submitted any claims yet.");
    expect(await axe(res.payload)).toHaveNoViolations();
  });
});
