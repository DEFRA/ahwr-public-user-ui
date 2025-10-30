import * as cheerio from "cheerio";
import { createServer } from "../../../../../app/server.js";
import { getCrumbs } from "../../../../utils/get-crumbs.js";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../../../../../app/session/index.js";
import { getApplicationsBySbi } from "../../../../../app/api-requests/application-api";
import { applyRoutes } from "../../../../../app/constants/routes.js";
import { userType } from "../../../../../app/constants/constants.js";
import { when } from "jest-when";

const auth = {
  credentials: { reference: "1111", sbi: "111111111" },
  strategy: "cookie",
};

const organisation = {
  id: "organisation",
  name: "org-name",
  address: "1 fake street, fakerton, FA1 2DA",
  sbi: "0123456789",
  userType: userType.NEW_USER,
};
const applications = [{ organisation, reference: "TEMP-PJ7E-WSI8" }];
getApplicationsBySbi.mockReturnValue(applications);

when(getSessionData)
  .calledWith(expect.anything(), sessionEntryKeys.application)
  .mockReturnValue({ reference: "IAHW-1234-ABCD" });

when(getSessionData)
  .calledWith(
    expect.anything(),
    sessionEntryKeys.farmerApplyData,
    sessionKeys.farmerApplyData.organisation,
  )
  .mockReturnValue(organisation);

jest.mock("../../../../../app/session/index.js");
jest.mock("../../../../../app/api-requests/application-api");

describe("Declaration test", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
  });

  afterEach(async () => {
    jest.resetAllMocks();
  });

  describe("GET /timings route", () => {
    test("returns 200 when application found", async () => {
      getApplicationsBySbi.mockResolvedValueOnce([]);

      const options = {
        method: "GET",
        url: applyRoutes.timings,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("Timing of reviews and follow-ups");
      expect($("title").text()).toMatch(
        "Timing of reviews and follow-ups - Get funding to improve animal health and welfare",
      );
      expect($("main h2").length).toBe(2);

      const firstListItems = $("ul.govuk-list--bullet").first().find("li");

      const expectedItems = [
        "have an Improve Animal Health and Welfare (IAHW) agreement in place before you do your first review, including any sampling or testing",
        "ensure reviews on herds or flocks of a particular species, are at least 10 months apart",
        "have no more than 3 reviews on any number of herds or flocks per species by 19 June 2027",
      ];

      const actualItems = firstListItems.map((i, el) => $(el).text().trim()).get();

      expect(actualItems).toEqual(expectedItems);
    });
  });

  describe("POST /timings route", () => {
    let crumb;

    beforeEach(async () => {
      crumb = await getCrumbs(server);
    });

    test("returns 302 to next page when agree answer given", async () => {
      const res = await server.inject({
        url: applyRoutes.timings,
        auth,
        method: "POST",
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, agreementStatus: "agree" },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual(applyRoutes.declaration);
    });

    test("returns 200 to agreement rejected page when rejected answer given", async () => {
      const res = await server.inject({
        url: applyRoutes.timings,
        auth,
        method: "POST",
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, agreementStatus: "rejected" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.payload).toContain("You cannot continue with your application");
    });
  });
});
