import * as cheerio from "cheerio";
import { createServer } from "../../../../../../app/server.js";
import { getCrumbs } from "../../../../../utils/get-crumbs.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../../../../app/session/index.js";
import { getApplicationsBySbi } from "../../../../../../app/api-requests/application-api.js";
import { poultryApplyRoutes } from "../../../../../../app/constants/routes.js";
import { userType } from "../../../../../../app/constants/constants.js";
import { when } from "jest-when";
import { axe } from "../../../../../helpers/axe-helper.js";

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
  .calledWith(expect.anything(), sessionEntryKeys.organisation)
  .mockReturnValue(organisation);

when(getSessionData)
  .calledWith(expect.anything(), sessionEntryKeys.confirmedDetails, sessionKeys.confirmedDetails)
  .mockReturnValue(true);

jest.mock("../../../../../../app/session/index.js");
jest.mock("../../../../../../app/api-requests/application-api");
jest.mock("../../../../../../app/config/index.js", () => ({
  config: {
    ...jest.requireActual("../../../../../../app/config/index.js").config,
    poultry: {
      enabled: "true",
    },
  },
}));

describe("Declaration test", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
  });

  afterEach(async () => {
    jest.resetAllMocks();
  });

  describe("GET /poultry/timings route", () => {
    test("returns 200 when application found", async () => {
      getApplicationsBySbi.mockResolvedValueOnce([]);

      const options = {
        method: "GET",
        url: poultryApplyRoutes.timings,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("Timing of poultry biosecurity reviews");
      expect($("title").text()).toMatch(
        "Timing of poultry biosecurity reviews - Get funding to improve animal health and welfare",
      );
      expect($("main h2").length).toBe(1);

      const firstListItems = $("ul.govuk-list--bullet").first().find("li");

      const expectedItems = [
        "have an poultry biosecurity review agreement in place before you do your first biosecurity review",
        "have no more than 3 biosecurity assessment on any number of units by 31 Match 2029",
      ];

      const actualItems = firstListItems.map((i, el) => $(el).text().trim()).get();

      expect(actualItems).toEqual(expectedItems);
    });
  });

  describe("POST /poultry/timings route", () => {
    let crumb;

    beforeEach(async () => {
      crumb = await getCrumbs(server);
    });

    test("returns 302 to next page when agree answer given", async () => {
      const res = await server.inject({
        url: poultryApplyRoutes.timings,
        auth,
        method: "POST",
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, agreementStatus: "agree" },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual(poultryApplyRoutes.declaration);
    });

    test("returns 200 to agreement rejected page when rejected answer given", async () => {
      const res = await server.inject({
        url: poultryApplyRoutes.timings,
        auth,
        method: "POST",
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, agreementStatus: "rejected" },
      });
      expect(res.statusCode).toBe(200);
      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.payload).toContain("You cannot continue with your application");
    });
  });
});
