import { setServerState } from "../../../helpers/set-server-state.js";
import { config } from "../../../../app/config/index.js";
import { createServer } from "../../../../app/server.js";
import { getTableCells } from "../../../helpers/get-table-cells.js";
import { setupServer } from "msw/node";
import globalJsdom from "global-jsdom";
import { getByRole, queryByRole } from "@testing-library/dom";
import { http, HttpResponse } from "msw";
import { authConfig } from "../../../../app/config/auth.js";

const nunJucksInternalTimerMethods = ["nextTick"];
let cleanUpFunction;

const mswServer = setupServer();
mswServer.listen();

afterEach(() => {
  mswServer.resetHandlers();
});

afterAll(() => {
  mswServer.close();
});

function setMswHandlers(applicationReference, applications, claims) {
  const applicationsLatest = http.get(`${config.applicationApi.uri}/applications/latest`, () =>
    HttpResponse.json(applications),
  );

  const claimByReference = http.get(
    `${config.applicationApi.uri}/claim/get-by-application-reference/${applicationReference}`,
    () => HttpResponse.json(claims),
  );

  mswServer.use(applicationsLatest, claimByReference);
}

// TODO - once we have removed mocks, this test can run again
test.skip("get /vet-visits: no agreement throws an error", async () => {
  const server = await createServer();

  const sbi = "106354662";
  const state = {
    customer: {
      attachedToMultipleBusinesses: true,
    },
    endemicsClaim: {
      organisation: {
        sbi,
        name: "PARTRIDGES",
        farmerName: "Janice Harrison",
      },
    },
  };

  await setServerState(server, state);

  const applicationReference = "";
  const newWorldApplications = [];
  const claims = [];

  setMswHandlers(applicationReference, newWorldApplications, claims);

  const { payload } = await server.inject({
    url: "/vet-visits",
    auth: {
      credentials: {},
      strategy: "cookie",
    },
  });
  cleanUpFunction = globalJsdom(payload);

  expect(
    getByRole(document.body, "heading", {
      level: 1,
      name: "Sorry, there is a problem with the service",
    }),
  ).toBeDefined();
});

// TODO - once we have removed mocks, this test can run again
test.skip("get /vet-visits: new world, multiple businesses", async () => {
  cleanUpFunction();
  const server = await createServer();

  const sbi = "106354662";
  const state = {
    customer: {
      attachedToMultipleBusinesses: true,
    },
    endemicsClaim: {
      organisation: {
        sbi,
        name: "PARTRIDGES",
        farmerName: "Janice Harrison",
      },
    },
  };

  await setServerState(server, state);

  const applicationReference = "IAHW-TEST-NEW1";
  const newWorldApplications = [
    { sbi, type: "EE", reference: applicationReference, applicationRedacts: [] },
  ];

  const claims = [
    {
      applicationReference,
      reference: "REBC-A89F-7776",
      data: {
        dateOfVisit: "2024-12-29",
        typeOfLivestock: "beef",
        claimType: "R",
      },
      status: "WITHDRAWN",
    },
  ];

  setMswHandlers(applicationReference, newWorldApplications, claims);

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
    ["29 December 2024", "Unnamed herd", expect.stringContaining("REBC-A89F-7776"), "Withdrawn"],
  ]);

  expect(getByRole(document.body, "link", { name: "Download agreement summary" })).toHaveProperty(
    "href",
    `${document.location.href}download-application/${sbi}/${applicationReference}`,
  );

  expect(getByRole(document.body, "button", { name: "Start a new claim" })).toHaveProperty(
    "href",
    `claim/which-species`,
  );

  expect(
    getByRole(document.body, "link", {
      name: "Claim for a different business",
    }),
  ).toHaveProperty("href", expect.stringContaining(authConfig.defraId.hostname));
});

// TODO - once we have removed mocks, this test can run again
test.skip("get /vet-visits: new world, multiple businesses, for sheep (flock not herd)", async () => {
  cleanUpFunction();
  const server = await createServer();

  const sbi = "106354662";
  const state = {
    customer: {
      attachedToMultipleBusinesses: true,
    },
    endemicsClaim: {
      organisation: {
        sbi,
        name: "PARTRIDGES",
        farmerName: "Janice Harrison",
      },
    },
  };

  await setServerState(server, state);

  const applicationReference = "IAHW-TEST-NEW1";
  const newWorldApplications = [
    {
      sbi,
      type: "EE",
      reference: applicationReference,
      applicationRedacts: [],
    },
  ];

  const claims = [
    {
      applicationReference,
      reference: "REBC-A89F-7776",
      data: {
        dateOfVisit: "2024-12-29",
        typeOfLivestock: "sheep",
        claimType: "R",
      },
      status: "WITHDRAWN",
    },
  ];

  setMswHandlers(applicationReference, newWorldApplications, claims);

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
    ["29 December 2024", "Unnamed flock", expect.stringContaining("REBC-A89F-7776"), "Withdrawn"],
  ]);
});

// TODO - once we have removed mocks, this test can run again
test.skip("get /vet-visits: new world, claim has a herd", async () => {
  cleanUpFunction();
  const server = await createServer();

  const sbi = "106354662";
  const state = {
    customer: {
      attachedToMultipleBusinesses: true,
    },
    endemicsClaim: {
      organisation: {
        sbi,
        name: "PARTRIDGES",
        farmerName: "Janice Harrison",
      },
    },
  };

  await setServerState(server, state);

  const applicationReference = "IAHW-TEST-NEW1";
  const newWorldApplications = [
    {
      sbi,
      type: "EE",
      reference: applicationReference,
      applicationRedacts: [],
    },
  ];

  const claims = [
    {
      applicationReference,
      reference: "REBC-A89F-7776",
      data: {
        dateOfVisit: "2024-12-29",
        typeOfLivestock: "beef",
        claimType: "R",
      },
      herd: {
        herdName: "best beef herd",
      },
      status: "WITHDRAWN",
    },
  ];

  setMswHandlers(applicationReference, newWorldApplications, claims);

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
    ["29 December 2024", "best beef herd", expect.stringContaining("REBC-A89F-7776"), "Withdrawn"],
  ]);

  expect(getByRole(document.body, "link", { name: "Download agreement summary" })).toHaveProperty(
    "href",
    `${document.location.href}download-application/${sbi}/${applicationReference}`,
  );

  expect(getByRole(document.body, "button", { name: "Start a new claim" })).toHaveProperty(
    "href",
    `claim/which-species`,
  );

  expect(
    getByRole(document.body, "link", {
      name: "Claim for a different business",
    }),
  ).toHaveProperty("href", expect.stringContaining(authConfig.defraId.hostname));
});

// TODO - once we have removed mocks, this test can run again
test.skip("get /vet-visits: new world, no claims made, show banner", async () => {
  cleanUpFunction();
  const server = await createServer();
  jest.replaceProperty(config.multiSpecies, "releaseDate", "2024-12-04");

  const sbi = "123123123";
  const state = {
    customer: {
      attachedToMultipleBusinesses: true,
    },
    endemicsClaim: {
      organisation: {
        sbi,
        name: "TEST FARM",
        farmerName: "Farmer Joe",
      },
    },
  };

  await setServerState(server, state);

  const beforeMultiSpeciesReleaseDate = "2024-12-03";
  const newWorldApplications = [
    {
      sbi,
      type: "EE",
      reference: "IAHW-TEST-NEW2",
      createdAt: beforeMultiSpeciesReleaseDate,
      applicationRedacts: [],
    },
  ];

  setMswHandlers("IAHW-TEST-NEW2", newWorldApplications, []);

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
});

// TODO - once we have removed mocks, this test can run again
test.skip("get /vet-visits: old world application only", async () => {
  cleanUpFunction();
  const server = await createServer();
  const timeOfTest = new Date("2025-01-02");

  jest.useFakeTimers({ doNotFake: nunJucksInternalTimerMethods }).setSystemTime(timeOfTest);

  const state = {
    customer: {
      attachedToMultipleBusinesses: false,
    },
    endemicsClaim: {
      organisation: {
        sbi: "106354662",
        name: "PARTRIDGES",
        farmerName: "Janice Harrison",
      },
    },
  };

  await setServerState(server, state);

  const sbi = "106354662";
  const almostTenMonthsBefore = new Date("2024-03-03");

  const oldWorldApplications = [
    {
      sbi,
      type: "VV",
      reference: "AHWR-TEST-OLD1",
      data: {
        visitDate: almostTenMonthsBefore,
        whichReview: "dairy",
      },
      status: "IN_CHECK",
      applicationRedacts: [],
    },
  ];
  const applicationsLatest = http.get(`${config.applicationApi.uri}/applications/latest`, () =>
    HttpResponse.json(oldWorldApplications),
  );

  mswServer.use(applicationsLatest);

  const { payload } = await server.inject({
    url: "/vet-visits",
    auth: {
      credentials: {},
      strategy: "cookie",
    },
  });
  jest.useRealTimers();
  globalJsdom(payload);

  expect(queryByRole(document.body, "region", { name: "Important" })).toBe(null);

  expect(getTableCells(document.body)).toEqual([
    ["Visit date", "Herd name", "Type and claim number", "Status"],
    ["3 March 2024", "Unnamed herd", expect.stringContaining("AHWR-TEST-OLD1"), "Submitted"],
  ]);
});

// TODO - once we have removed mocks, this test can run again
test.skip("get /vet-visits: shows agreement redacted", async () => {
  cleanUpFunction();
  const server = await createServer();
  jest.replaceProperty(config.multiSpecies, "releaseDate", "2024-12-04");

  const sbi = "123123123";
  const state = {
    customer: {
      attachedToMultipleBusinesses: true,
    },
    endemicsClaim: {
      organisation: {
        sbi,
        name: "TEST FARM",
        farmerName: "Farmer Joe",
      },
    },
  };

  await setServerState(server, state);

  const beforeMultiSpeciesReleaseDate = "2024-12-03";
  const newWorldApplications = [
    {
      sbi,
      type: "EE",
      reference: "IAHW-TEST-NEW2",
      createdAt: beforeMultiSpeciesReleaseDate,
      applicationRedacts: [
        {
          success: "Y",
        },
      ],
    },
  ];

  setMswHandlers("IAHW-TEST-NEW2", newWorldApplications, []);

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
