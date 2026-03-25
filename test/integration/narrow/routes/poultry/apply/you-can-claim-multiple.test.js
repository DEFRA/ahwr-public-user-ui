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
import { poultryApplyRoutes } from "../../../../../../app/constants/routes.js";
import { when } from "jest-when";
import { userType } from "../../../../../../app/constants/constants.js";
import { axe } from "../../../../../helpers/axe-helper.js";

jest.mock("../../../../../../app/config/index.js", () => ({
  config: {
    ...jest.requireActual("../../../../../../app/config/index.js").config,
    customerSurvey: {
      uri: "http://this-is-a-test-uri",
    },
    poultry: {
      enabled: "true",
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
    url: poultryApplyRoutes.youCanClaimMultiple,
  };

  let server;

  beforeAll(async () => {
    server = await createServer();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe("GET operation handler", () => {
    test("returns 200 and content is correct", async () => {
      const res = await server.inject({ ...optionsBase, method: "GET" });

      expect(res.statusCode).toBe(StatusCodes.OK);
      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.payload).toContain("/select-funding"); // back-link
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryApplyData,
        sessionKeys.poultryApplyData.reference,
        expect.any(String),
      );
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
        sessionEntryKeys.poultryApplyData,
        sessionKeys.poultryApplyData.agreeMultipleSpecies,
        "yes",
      );
      expect(res.headers.location).toEqual(poultryApplyRoutes.numbers);
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

      expect(res.statusCode).toBe(StatusCodes.OK);
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryApplyData,
        sessionKeys.poultryApplyData.agreeMultipleSpecies,
        "no",
      );
      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.payload).toContain("You cannot continue with your application");
    });
  });
});
