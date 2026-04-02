import * as cheerio from "cheerio";
import { setServerState } from "../../../helpers/set-server-state.js";
import { config } from "../../../../app/config/index.js";
import { createServer } from "../../../../app/server.js";
import { getClaimsByApplicationReference } from "../../../../app/api-requests/claim-api.js";
import { refreshApplications } from "../../../../app/lib/context-helper.js";
import { axe } from "../../../helpers/axe-helper.js";

const nunJucksInternalTimerMethods = ["nextTick"];

jest.mock("../../../../app/api-requests/claim-api.js");
jest.mock("../../../../app/auth/auth-code-grant/request-authorization-code-url.js", () => ({
  requestAuthorizationCodeUrl: jest.fn().mockReturnValue("auth-code-url"),
}));
jest.mock("../../../../app/lib/context-helper.js");

jest
  .mocked(refreshApplications)
  .mockResolvedValue({ latestEndemicsApplication: {}, latestVetVisitApplication: {} });

const findByText = ($, text) => $("*").filter((_, el) => $(el).text().trim() === text);

const findLinkByText = ($, text) => $("a").filter((_, el) => $(el).text().trim() === text);

const findButtonLikeByText = ($, text) =>
  $("a,button").filter((_, el) => $(el).text().trim() === text);

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

  beforeEach(async () => {
    server = await createServer();
    config.poultry.enabled = false;
  });

  test("details not checked redirects to get them checked", async () => {
    const sbi = "106354662";
    const state = {
      customer: {
        attachedToMultipleBusinesses: false,
      },
      endemicsClaim: {},
      organisation: {
        sbi,
        name: "PARTRIDGES",
        farmerName: "Janice Harrison",
      },
    };

    await setServerState(server, state);

    const { headers } = await server.inject({
      url: "/vet-visits",
      auth: { credentials: {}, strategy: "cookie" },
    });

    expect(headers.location).toBe("/check-details");
  });

  test("no agreement redirects to new one", async () => {
    const sbi = "106354662";
    const state = {
      confirmedDetails: true,
      customer: {
        attachedToMultipleBusinesses: false,
      },
      endemicsClaim: {},
      organisation: {
        sbi,
        name: "PARTRIDGES",
        farmerName: "Janice Harrison",
      },
    };

    await setServerState(server, state);

    const { headers } = await server.inject({
      url: "/vet-visits",
      auth: { credentials: {}, strategy: "cookie" },
    });

    expect(headers.location).toBe("/you-can-claim-multiple");
  });

  describe("Cattle/Pig/Sheep", () => {
    beforeEach(() => {
      config.poultry.enabled = false;
    });

    test("new world, multiple businesses", async () => {
      const applicationReference = "IAHW-TEST-NEW1";
      const sbi = "106354662";

      await setServerState(server, {
        confirmedDetails: true,
        customer: { attachedToMultipleBusinesses: true },
        endemicsClaim: {
          latestEndemicsApplication: {
            sbi,
            type: "EE",
            reference: applicationReference,
            redacted: false,
            status: "AGREED",
          },
        },
        organisation: { sbi, name: "PARTRIDGES", farmerName: "Janice Harrison" },
      });

      getClaimsByApplicationReference.mockResolvedValueOnce([
        {
          applicationReference,
          reference: "REBC-A89F-7776",
          data: {
            dateOfVisit: "2024-12-29",
            typeOfLivestock: "beef",
            claimType: "REVIEW",
          },
          status: "WITHDRAWN",
        },
      ]);

      const { payload } = await server.inject({
        url: "/vet-visits",
        auth: { credentials: {}, strategy: "cookie" },
      });

      const $ = cheerio.load(payload);

      expect(findByText($, "Important").length).toBe(0);

      expect(getTableCells($)).toEqual([
        ["Visit date", "Herd name", "Type and claim number", "Status"],
        [
          "29 December 2024",
          "Unnamed herd",
          expect.stringContaining("REBC-A89F-7776"),
          "Withdrawn",
        ],
      ]);

      const link = findLinkByText($, "Download agreement summary").first();
      expect(link.attr("href")).toContain(`download-application/${sbi}/${applicationReference}`);

      const startBtn = findButtonLikeByText($, "Start a new claim").first();
      expect(startBtn.attr("href")).toContain("/which-species");

      const otherBiz = findLinkByText($, "Claim for a different business").first();
      expect(otherBiz.attr("href")).toContain("auth-code-url");

      expect($("body").text().includes("Claim for a different agreement")).toBe(false);
      expect($("body").text().includes("Species included in this agreement")).toBe(false);
    });

    test("new world, sheep uses flock wording", async () => {
      const applicationReference = "IAHW-TEST-NEW1";
      const sbi = "106354662";

      await setServerState(server, {
        confirmedDetails: true,
        customer: { attachedToMultipleBusinesses: true },
        endemicsClaim: {
          latestEndemicsApplication: {
            sbi,
            type: "EE",
            reference: applicationReference,
            redacted: false,
            status: "AGREED",
          },
        },
        organisation: { sbi, name: "PARTRIDGES", farmerName: "Janice Harrison" },
      });

      getClaimsByApplicationReference.mockResolvedValueOnce([
        {
          applicationReference,
          reference: "REBC-A89F-7776",
          data: {
            dateOfVisit: "2024-12-29",
            typeOfLivestock: "sheep",
            claimType: "REVIEW",
          },
          status: "WITHDRAWN",
        },
      ]);

      const $ = cheerio.load(
        (
          await server.inject({
            url: "/vet-visits",
            auth: { credentials: {}, strategy: "cookie" },
          })
        ).payload,
      );

      expect(getTableCells($)).toEqual([
        ["Visit date", "Flock name", "Type and claim number", "Status"],
        [
          "29 December 2024",
          "Unnamed flock",
          expect.stringContaining("REBC-A89F-7776"),
          "Withdrawn",
        ],
      ]);
    });

    test("claim has herd name", async () => {
      const applicationReference = "IAHW-TEST-NEW1";
      const sbi = "106354662";

      await setServerState(server, {
        confirmedDetails: true,
        customer: { attachedToMultipleBusinesses: true },
        endemicsClaim: {
          latestEndemicsApplication: {
            sbi,
            type: "EE",
            reference: applicationReference,
            redacted: false,
            status: "AGREED",
          },
        },
        organisation: { sbi, name: "PARTRIDGES", farmerName: "Janice Harrison" },
      });

      getClaimsByApplicationReference.mockResolvedValueOnce([
        {
          applicationReference,
          reference: "REBC-A89F-7776",
          data: {
            dateOfVisit: "2024-12-29",
            typeOfLivestock: "beef",
            claimType: "REVIEW",
          },
          herd: { name: "best beef herd" },
          status: "WITHDRAWN",
        },
      ]);

      const $ = cheerio.load(
        (
          await server.inject({
            url: "/vet-visits",
            auth: { credentials: {}, strategy: "cookie" },
          })
        ).payload,
      );

      expect(getTableCells($)[1][1]).toBe("best beef herd");
    });

    test("no claims shows banner", async () => {
      jest.replaceProperty(config.multiSpecies, "releaseDate", "2024-12-04");

      const sbi = "123123123";

      await setServerState(server, {
        confirmedDetails: true,
        customer: { attachedToMultipleBusinesses: true },
        endemicsClaim: {
          latestEndemicsApplication: {
            sbi,
            type: "EE",
            reference: "IAHW-TEST-NEW2",
            createdAt: "2024-12-03",
            redacted: false,
            status: "AGREED",
          },
        },
        organisation: { sbi, name: "TEST FARM", farmerName: "Farmer Joe" },
      });

      getClaimsByApplicationReference.mockResolvedValueOnce([]);

      const $ = cheerio.load(
        (
          await server.inject({
            url: "/vet-visits",
            auth: { credentials: {}, strategy: "cookie" },
          })
        ).payload,
      );

      expect($("body").text()).toContain(
        "You can now claim for more than one herd or flock of any species.",
      );
    });

    test("old world redirects", async () => {
      jest
        .useFakeTimers({ doNotFake: nunJucksInternalTimerMethods })
        .setSystemTime(new Date("2025-01-02"));

      await setServerState(server, {
        confirmedDetails: true,
        customer: { attachedToMultipleBusinesses: false },
        endemicsClaim: {
          latestVetVisitApplication: {
            sbi: "106354662",
            type: "VV",
            reference: "AHWR-TEST-OLD1",
            status: "IN_CHECK",
            redacted: false,
          },
        },
        organisation: {
          sbi: "106354662",
          name: "PARTRIDGES",
          farmerName: "Janice Harrison",
        },
      });

      const { headers } = await server.inject({
        url: "/vet-visits",
        auth: { credentials: {}, strategy: "cookie" },
      });

      jest.useRealTimers();

      expect(headers.location).toBe("/you-can-claim-multiple");
    });

    test("redacted agreement", async () => {
      const sbi = "123123123";

      await setServerState(server, {
        confirmedDetails: true,
        customer: { attachedToMultipleBusinesses: true },
        endemicsClaim: {
          latestEndemicsApplication: {
            sbi,
            reference: "IAHW-TEST-NEW2",
            redacted: true,
            status: "AGREED",
          },
        },
        organisation: { sbi, name: "TEST FARM", farmerName: "Farmer Joe" },
      });

      const $ = cheerio.load(
        (
          await server.inject({
            url: "/vet-visits",
            auth: { credentials: {}, strategy: "cookie" },
          })
        ).payload,
      );

      expect($("h1").text().trim()).toBe(
        "Your Improve Animal Health and Welfare (IAHW) agreement has been removed",
      );

      expect(findLinkByText($, "Apply for a new agreement").attr("href")).toBe(
        "/you-can-claim-multiple",
      );
    });

    test("poultry enabled content", async () => {
      config.poultry.enabled = true;

      const sbi = "106354662";

      await setServerState(server, {
        confirmedDetails: true,
        customer: { attachedToMultipleBusinesses: true },
        endemicsClaim: {
          latestEndemicsApplication: {
            sbi,
            reference: "IAHW-TEST-NEW1",
            redacted: false,
            status: "AGREED",
          },
        },
        organisation: { sbi, name: "PARTRIDGES", farmerName: "Janice Harrison" },
      });

      getClaimsByApplicationReference.mockResolvedValueOnce([]);

      const { payload } = await server.inject({
        url: "/vet-visits",
        auth: { credentials: {}, strategy: "cookie" },
      });

      const $ = cheerio.load(payload);

      expect($("body").text()).toContain("Claim for a different agreement");
      expect($("body").text().toLowerCase()).toContain("cattle, pigs and sheep");

      expect(await axe(payload)).toHaveNoViolations();
    });
  });
});
