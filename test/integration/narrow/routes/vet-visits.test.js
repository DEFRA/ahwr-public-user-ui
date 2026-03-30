/**
 * @jest-environment node
 */
import { setServerState } from "../../../helpers/set-server-state.js";
import { config } from "../../../../app/config/index.js";
import { createServer } from "../../../../app/server.js";
import { getTableCells } from "../../../helpers/get-table-cells.js";
import globalJsdom from "global-jsdom";
import { getByRole, getByText, queryByRole, queryByText, within } from "@testing-library/dom";
import { getClaimsByApplicationReference } from "../../../../app/api-requests/claim-api.js";
import { refreshApplications } from "../../../../app/lib/context-helper.js";

const nunJucksInternalTimerMethods = ["nextTick"];

jest.mock("../../../../app/api-requests/claim-api.js");
jest.mock("../../../../app/auth/auth-code-grant/request-authorization-code-url.js", () => ({
  requestAuthorizationCodeUrl: jest.fn().mockReturnValue("auth-code-url"),
}));
jest.mock("../../../../app/lib/context-helper.js");

jest
  .mocked(refreshApplications)
  .mockResolvedValue({ latestEndemicsApplication: {}, latestVetVisitApplication: {} });

describe("GET /vet-visits", () => {
  let cleanUpFunction = () => {};
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
      auth: {
        credentials: {},
        strategy: "cookie",
      },
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
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(headers.location).toBe("/you-can-claim-multiple");
  });

  describe("Poultry", () => {
    beforeAll(() => {});

    beforeEach(() => {
      cleanUpFunction();
      config.poultry.enabled = true;
    });

    test("poultry agreement, no claims made", async () => {
      const sbi = "123123123";
      const state = {
        confirmedDetails: true,
        customer: {
          attachedToMultipleBusinesses: true,
        },
        endemicsClaim: {
          latestEndemicsApplication: {
            sbi,
            type: "EE",
            reference: "POUL-TEST-NEW2",
            createdAt: "2026-01-03",
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

      const { payload } = await server.inject({
        url: "/vet-visits",
        auth: {
          credentials: {},
          strategy: "cookie",
        },
      });
      cleanUpFunction = globalJsdom(payload);

      expect(getByRole(document.body, "button", { name: "Start a new claim" })).toHaveProperty(
        "href",
        expect.stringContaining("/which-species-of-poultry"),
      );
      expect(getByText(document.body, "Claim for a different agreement")).toBeTruthy();
      const container = getByText(
        document.body,
        "Species included in this agreement:",
      ).parentElement;
      expect(within(container).getByText("poultry")).toBeTruthy();
    });
  });

  describe("Cattle/Pig/Sheep", () => {
    beforeEach(() => {
      cleanUpFunction();
      config.poultry.enabled = false;
    });

    test("new world, multiple businesses", async () => {
      const applicationReference = "IAHW-TEST-NEW1";
      const sbi = "106354662";
      const state = {
        confirmedDetails: true,
        customer: {
          attachedToMultipleBusinesses: true,
        },
        endemicsClaim: {
          latestEndemicsApplication: {
            sbi,
            type: "EE",
            reference: applicationReference,
            redacted: false,
            status: "AGREED",
          },
          latestVetVisitApplication: undefined,
        },
        organisation: {
          sbi,
          name: "PARTRIDGES",
          farmerName: "Janice Harrison",
        },
      };

      await setServerState(server, state);

      const claims = [
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
      ];

      getClaimsByApplicationReference.mockResolvedValueOnce(claims);

      const { payload } = await server.inject({
        url: "/vet-visits",
        auth: {
          credentials: {},
          strategy: "cookie",
        },
      });
      cleanUpFunction = globalJsdom(payload);

      expect(queryByRole(document.body, "region", { name: "Important" })).toBe(null);

      expect(getTableCells(document.body)).toEqual([
        ["Visit date", "Herd name", "Type and claim number", "Status"],
        [
          "29 December 2024",
          "Unnamed herd",
          expect.stringContaining("REBC-A89F-7776"),
          "Withdrawn",
        ],
      ]);

      expect(
        getByRole(document.body, "link", { name: "Download agreement summary" }),
      ).toHaveProperty(
        "href",
        `${document.location.href}download-application/${sbi}/${applicationReference}`,
      );

      expect(getByRole(document.body, "button", { name: "Start a new claim" })).toHaveProperty(
        "href",
        expect.stringContaining("/which-species"),
      );

      expect(
        getByRole(document.body, "link", {
          name: "Claim for a different business",
        }),
      ).toHaveProperty("href", expect.stringContaining("auth-code-url"));
      expect(queryByText(document.body, "Claim for a different agreement")).toBeFalsy();
      expect(queryByText(document.body, "Species included in this agreement: ")).toBeFalsy();
    });

    test("new world, multiple businesses, for sheep (flock not herd)", async () => {
      const applicationReference = "IAHW-TEST-NEW1";
      const sbi = "106354662";
      const state = {
        confirmedDetails: true,
        customer: {
          attachedToMultipleBusinesses: true,
        },
        endemicsClaim: {
          latestEndemicsApplication: {
            sbi,
            type: "EE",
            reference: applicationReference,
            redacted: false,
            status: "AGREED",
          },
          latestVetVisitApplication: undefined,
        },
        organisation: {
          sbi,
          name: "PARTRIDGES",
          farmerName: "Janice Harrison",
        },
      };

      await setServerState(server, state);

      const claims = [
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
      ];

      getClaimsByApplicationReference.mockResolvedValueOnce(claims);

      const { payload } = await server.inject({
        url: "/vet-visits",
        auth: {
          credentials: {},
          strategy: "cookie",
        },
      });
      cleanUpFunction = globalJsdom(payload);

      expect(getTableCells(document.body)).toEqual([
        ["Visit date", "Flock name", "Type and claim number", "Status"],
        [
          "29 December 2024",
          "Unnamed flock",
          expect.stringContaining("REBC-A89F-7776"),
          "Withdrawn",
        ],
      ]);
    });

    test("new world, claim has a herd", async () => {
      const applicationReference = "IAHW-TEST-NEW1";
      const sbi = "106354662";
      const state = {
        confirmedDetails: true,
        customer: {
          attachedToMultipleBusinesses: true,
        },
        endemicsClaim: {
          latestEndemicsApplication: {
            sbi,
            type: "EE",
            reference: applicationReference,
            redacted: false,
            status: "AGREED",
          },
          latestVetVisitApplication: undefined,
        },
        organisation: {
          sbi,
          name: "PARTRIDGES",
          farmerName: "Janice Harrison",
        },
      };

      await setServerState(server, state);

      const claims = [
        {
          applicationReference,
          reference: "REBC-A89F-7776",
          data: {
            dateOfVisit: "2024-12-29",
            typeOfLivestock: "beef",
            claimType: "REVIEW",
          },
          herd: {
            name: "best beef herd",
          },
          status: "WITHDRAWN",
        },
      ];

      getClaimsByApplicationReference.mockResolvedValueOnce(claims);

      const { payload } = await server.inject({
        url: "/vet-visits",
        auth: {
          credentials: {},
          strategy: "cookie",
        },
      });
      cleanUpFunction = globalJsdom(payload);

      expect(queryByRole(document.body, "region", { name: "Important" })).toBe(null);

      expect(getTableCells(document.body)).toEqual([
        ["Visit date", "Herd name", "Type and claim number", "Status"],
        [
          "29 December 2024",
          "best beef herd",
          expect.stringContaining("REBC-A89F-7776"),
          "Withdrawn",
        ],
      ]);

      expect(
        getByRole(document.body, "link", { name: "Download agreement summary" }),
      ).toHaveProperty(
        "href",
        `${document.location.href}download-application/${sbi}/${applicationReference}`,
      );

      expect(getByRole(document.body, "button", { name: "Start a new claim" })).toHaveProperty(
        "href",
        expect.stringContaining("/which-species"),
      );

      expect(
        getByRole(document.body, "link", {
          name: "Claim for a different business",
        }),
      ).toHaveProperty("href", expect.stringContaining("auth-code-url"));
    });

    test("new world, no claims made, show banner", async () => {
      jest.replaceProperty(config.multiSpecies, "releaseDate", "2024-12-04");

      const beforeMultiSpeciesReleaseDate = "2024-12-03";
      const sbi = "123123123";
      const state = {
        confirmedDetails: true,
        customer: {
          attachedToMultipleBusinesses: true,
        },
        endemicsClaim: {
          latestEndemicsApplication: {
            sbi,
            type: "EE",
            reference: "IAHW-TEST-NEW2",
            createdAt: beforeMultiSpeciesReleaseDate,
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

      const { payload } = await server.inject({
        url: "/vet-visits",
        auth: {
          credentials: {},
          strategy: "cookie",
        },
      });
      cleanUpFunction = globalJsdom(payload);

      const banner = getByRole(document.body, "region", { name: "Important" });
      expect(getByRole(banner, "paragraph").textContent.trim()).toBe(
        "You can now claim for more than one herd or flock of any species.",
      );

      expect(getByRole(document.body, "button", { name: "Start a new claim" })).toHaveProperty(
        "href",
        expect.stringContaining("/which-species"),
      );
    });

    test("old world application only - redirects to create agreement", async () => {
      const timeOfTest = new Date("2025-01-02");

      jest.useFakeTimers({ doNotFake: nunJucksInternalTimerMethods }).setSystemTime(timeOfTest);

      const sbi = "106354662";
      const almostTenMonthsBefore = new Date("2024-03-03");

      const state = {
        confirmedDetails: true,
        customer: {
          attachedToMultipleBusinesses: false,
        },
        endemicsClaim: {
          latestEndemicsApplication: undefined,
          latestVetVisitApplication: {
            sbi,
            type: "VV",
            reference: "AHWR-TEST-OLD1",
            data: {
              visitDate: almostTenMonthsBefore,
              whichReview: "dairy",
            },
            status: "IN_CHECK",
            redacted: false,
          },
        },
        organisation: {
          sbi: "106354662",
          name: "PARTRIDGES",
          farmerName: "Janice Harrison",
        },
      };

      config.poultry.enabled = false;

      await setServerState(server, state);

      const { headers, payload } = await server.inject({
        url: "/vet-visits",
        auth: {
          credentials: {},
          strategy: "cookie",
        },
      });
      jest.useRealTimers();
      globalJsdom(payload);

      expect(headers.location).toBe("/you-can-claim-multiple");
    });

    test("shows agreement redacted", async () => {
      jest.replaceProperty(config.multiSpecies, "releaseDate", "2024-12-04");

      const beforeMultiSpeciesReleaseDate = "2024-12-03";
      const sbi = "123123123";
      const state = {
        confirmedDetails: true,
        customer: {
          attachedToMultipleBusinesses: true,
        },
        endemicsClaim: {
          latestEndemicsApplication: {
            sbi,
            type: "EE",
            reference: "IAHW-TEST-NEW2",
            createdAt: beforeMultiSpeciesReleaseDate,
            redacted: true,
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

      const { payload } = await server.inject({
        url: "/vet-visits",
        auth: {
          credentials: {},
          strategy: "cookie",
        },
      });
      cleanUpFunction = globalJsdom(payload);

      const heading = getByRole(document.body, "heading", { level: 1 });
      expect(heading).not.toBeNull();
      expect(heading.textContent.trim()).toBe(
        "Your Improve Animal Health and Welfare (IAHW) agreement has been removed",
      );

      const applyLink = getByRole(document.body, "link", { name: "Apply for a new agreement" });
      expect(applyLink).not.toBeNull();
      expect(applyLink.getAttribute("href")).toBe("/you-can-claim-multiple");
    });

    test("poultry enabled and livestock agreement with no claims", async () => {
      config.poultry.enabled = true;

      const applicationReference = "IAHW-TEST-NEW1";
      const sbi = "106354662";
      const state = {
        confirmedDetails: true,
        customer: {
          attachedToMultipleBusinesses: true,
        },
        endemicsClaim: {
          latestEndemicsApplication: {
            sbi,
            type: "EE",
            reference: applicationReference,
            redacted: false,
            status: "AGREED",
          },
          latestVetVisitApplication: undefined,
        },
        organisation: {
          sbi,
          name: "PARTRIDGES",
          farmerName: "Janice Harrison",
        },
      };

      await setServerState(server, state);

      const claims = [
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
      ];
      getClaimsByApplicationReference.mockResolvedValueOnce(claims);

      const { payload } = await server.inject({
        url: "/vet-visits",
        auth: {
          credentials: {},
          strategy: "cookie",
        },
      });
      cleanUpFunction = globalJsdom(payload);

      expect(queryByText(document.body, "Claim for a different agreement")).toBeTruthy();
      const container = getByText(
        document.body,
        /species included in this agreement/i,
      ).parentElement;
      expect(within(container).getByText(/cattle, pigs and sheep/i)).toBeTruthy();
    });
  });
});
