import * as cheerio from "cheerio";
import { getCrumbs } from "../../../../../utils/get-crumbs.js";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../../../../app/session/index.js";
import { createServer } from "../../../../../../app/server.js";
import { StatusCodes } from "http-status-codes";
import { getApplicationsBySbi } from "../../../../../../app/api-requests/application-api.js";
import { livestockApplyRoutes } from "../../../../../../app/constants/routes.js";
import { when } from "jest-when";
import { config } from "../../../../../../app/config/index.js";
import { userType } from "../../../../../../app/constants/constants.js";
import { axe } from "../../../../../helpers/axe-helper.js";
import {
  testBrowserPageTitle,
  testPageHeading,
} from "../../../../../helpers/page-title-and-heading.js";

jest.mock("../../../../../../app/config/index.js", () => ({
  config: {
    ...jest.requireActual("../../../../../../app/config/index.js").config,
    customerSurvey: {
      uri: "https://this-is-a-test-uri",
    },
  },
}));

jest.mock("../../../../../../app/api-requests/application-api.js");
jest.mock("../../../../../../app/session/index.js");

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
  .calledWith(expect.anything(), sessionEntryKeys.organisation)
  .mockReturnValue(organisation);

when(getSessionData)
  .calledWith(expect.anything(), sessionEntryKeys.confirmedDetails, sessionKeys.confirmedDetails)
  .mockReturnValue(true);

describe("you-can-claim-multiple page", () => {
  const optionsBase = {
    auth: {
      strategy: "cookie",
      credentials: { reference: "1111", sbi: "111111111" },
    },
    url: livestockApplyRoutes.youCanClaimMultiple,
  };

  let server;

  beforeAll(async () => {
    server = await createServer();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe("GET operation handler", () => {
    const getResponse = () => server.inject({ ...optionsBase, method: "GET" });

    testBrowserPageTitle({
      title: "What you can claim for a livestock agreement",
      getResponse,
    });
    testPageHeading({
      heading: "What you can claim for as part of this agreement",
      getResponse,
    });

    test("returns 200 and content is correct", async () => {
      const res = await getResponse();

      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.statusCode).toBe(StatusCodes.OK);
      expect(res.payload).toContain("/check-details"); // back-link
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.farmerApplyData,
        sessionKeys.farmerApplyData.reference,
        expect.any(String),
      );
    });

    describe("herd claim limit content", () => {
      const getLimitText = async () => {
        const res = await getResponse();
        const $ = cheerio.load(res.payload);
        return $("p.govuk-body")
          .filter((_, el) => $(el).text().includes("You can do a maximum of"))
          .text()
          .replace(/\s+/g, " ")
          .trim();
      };

      afterEach(() => {
        config.set("herdClaimLimit.enabled", false);
        config.set("herdClaimLimit.livestock", 3);
      });

      test("shows the default limit of 3 when the herd claim limit is disabled", async () => {
        config.set("herdClaimLimit.enabled", false);
        config.set("herdClaimLimit.livestock", 4);

        expect(await getLimitText()).toContain(
          "You can do a maximum of 3 reviews and 3 follow-ups",
        );
      });

      test("shows the configured limit of 4 when the herd claim limit is enabled", async () => {
        config.set("herdClaimLimit.enabled", true);
        config.set("herdClaimLimit.livestock", 4);

        expect(await getLimitText()).toContain(
          "You can do a maximum of 4 reviews and 4 follow-ups",
        );
      });

      test("shows the limit of 3 when the herd claim limit is enabled and set to 3", async () => {
        config.set("herdClaimLimit.enabled", true);
        config.set("herdClaimLimit.livestock", 3);

        expect(await getLimitText()).toContain(
          "You can do a maximum of 3 reviews and 3 follow-ups",
        );
      });
    });
  });

  describe("POST operation handler", () => {
    let postOptionsBase;

    beforeEach(async () => {
      const crumb = await getCrumbs(server);
      postOptionsBase = {
        ...optionsBase,
        method: "POST",
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb },
      };
    });

    test("returns 302 and navigates to correct next page when user agrees", async () => {
      const options = {
        ...postOptionsBase,
        payload: {
          ...postOptionsBase.payload,
          agreementStatus: "agree",
        },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.farmerApplyData,
        sessionKeys.farmerApplyData.agreeMultipleSpecies,
        "yes",
      );
      expect(res.headers.location).toEqual(livestockApplyRoutes.numbers);
    });

    test("returns 200 and navigates to the offer rejected page when user disagrees", async () => {
      const options = {
        ...postOptionsBase,
        payload: {
          ...postOptionsBase.payload,
          agreementStatus: "rejected",
        },
      };

      const res = await server.inject(options);

      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.statusCode).toBe(StatusCodes.OK);
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.farmerApplyData,
        sessionKeys.farmerApplyData.agreeMultipleSpecies,
        "no",
      );
      expect(res.payload).toContain("You cannot continue with your application");
    });
  });
});
