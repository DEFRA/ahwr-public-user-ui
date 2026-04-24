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

const findLinkByText = ($, text) => $("a").filter((_, el) => $(el).text().trim() === text);

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

  test("should show no poultry claims when no claims have been made and has an agreement", async () => {
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
    expect(startLink.attr("href")).toContain("/poultry/date-of-visit");

    expect($("body").text()).toContain("Claim for a different agreement");

    const container = $("*:contains('Species included in this agreement:')").parent();
    expect(container.text()).toContain("poultry");

    expect($("body").text()).toContain(
      "Your claims will appear here once you have submitted them.",
    );

    expect(await axe(res.payload)).toHaveNoViolations();
  });

  test("should show poultry claims when claims exist", async () => {
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
          reference: "POUL-1LZ5-ELVQ",
          createdAt: "2026-01-03",
          redacted: false,
          status: "AGREED",
        },
      },
      endemicsClaim: {},
      organisation: {
        sbi,
        name: "TEST FARM",
        farmerName: "Farmer Joe",
      },
    };

    await setServerState(server, state);

    getClaimsByApplicationReference.mockResolvedValueOnce([
      {
        reference: "PORE-D51M-QLIJ",
        applicationReference: "POUL-1LZ5-ELVQ",
        createdAt: "2026-04-21T13:51:10.697Z",
        type: "REVIEW",
        data: {
          dateOfVisit: "2026-04-21T00:00:00.000Z",
          typesOfPoultry: ["broilers", "laying-hens", "breeders", "ducks", "geese", "turkeys"],
          minimumNumberOfBirds: "yes",
          vetsName: "Vet 1",
          vetRCVSNumber: "1234567",
          biosecurity: "yes",
          biosecurityUsefulness: "very-useful",
          changesInBiosecurity: "bird-handling",
          costOfChanges: "3000-4500",
          interview: "yes",
          amount: 430,
          claimType: "REVIEW",
        },
        status: "IN_CHECK",
        herd: {
          id: "4ce60ae0-1cec-44de-a260-280bddc8ea7c",
          cph: "22/123/4231",
          name: "site one",
          version: 1,
        },
      },
      {
        reference: "PORE-D51M-ABCJ",
        applicationReference: "POUL-2LZ5-ABVC",
        createdAt: "2026-06-05T13:51:10.697Z",
        type: "REVIEW",
        data: {
          dateOfVisit: "2026-06-04T00:00:00.000Z",
          typesOfPoultry: ["broilers", "laying-hens"],
          minimumNumberOfBirds: "yes",
          vetsName: "Vet 1",
          vetRCVSNumber: "1234567",
          biosecurity: "yes",
          biosecurityUsefulness: "very-useful",
          changesInBiosecurity: "bird-handling",
          costOfChanges: "3000-4500",
          interview: "yes",
          amount: 430,
          claimType: "REVIEW",
        },
        status: "PAID",
        herd: {
          id: "4ce60ae0-1cec-44de-a260-280bddc8ea7c",
          cph: "22/123/4231",
          name: "site two",
          version: 1,
        },
      },
    ]);

    const res = await server.inject(options);
    const $ = load(res.payload);

    const otherBiz = findLinkByText($, "Claim for a different business").first();
    expect(otherBiz.attr("href")).toContain("auth-code-url");

    const startLink = $('a:contains("Start a new claim")');
    expect(startLink.length).toBeGreaterThan(0);
    expect(startLink.attr("href")).toContain("/poultry/date-of-visit");

    const link = findLinkByText($, "Download agreement summary").first();
    expect(link.attr("href")).toContain(`/download-application/${sbi}/POUL-1LZ5-ELVQ`);

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
    expect($("body").text()).not.toContain(
      "Your claims will appear here once you have submitted them.",
    );
    expect(await axe(res.payload)).toHaveNoViolations();
  });
});
