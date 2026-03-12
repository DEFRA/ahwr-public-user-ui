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
import {
  applyRoutes,
  dashboardRoutes,
  poultryApplyRoutes,
} from "../../../../../../app/constants/routes.js";
import { getApplicationsBySbi } from "../../../../../../app/api-requests/application-api.js";
import { userType } from "../../../../../../app/constants/constants.js";
import { when } from "jest-when";

jest.mock("../../../../../../app/api-requests/application-api");
jest.mock("../../../../../../app/session/index.js");
jest.mock("../../../../../../app/config/index.js", () => ({
  config: {
    ...jest.requireActual("../../../../../../app/config/index.js").config,
    poultry: {
      enabled: "true",
    },
  },
}));

describe("select-funding", () => {
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

  const optionsBase = {
    auth: {
      strategy: "cookie",
      credentials: { reference: "1111", sbi: "111111111" },
    },
    url: dashboardRoutes.selectFunding,
  };

  let server;

  beforeAll(async () => {
    server = await createServer();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe("GET /select-funding", () => {
    test("returns 200 and content is correct", async () => {
      const res = await server.inject({ ...optionsBase, method: "GET" });

      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("Select funding");
    });
  });

  describe("POST /select-funding", () => {
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

    test("returns 302 and redirects to livestock apply when user selects livestock", async () => {
      const options = {
        ...postOptionsBase,
        payload: {
          ...postOptionsBase.payload,
          type: "IAHW",
        },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryApplyData,
        sessionKeys.poultryApplyData.type,
        "IAHW",
      );
      expect(res.headers.location).toEqual(applyRoutes.youCanClaimMultiple);
    });

    test("returns 302 and redirects to poultry apply when user selects poultry", async () => {
      const options = {
        ...postOptionsBase,
        payload: {
          ...postOptionsBase.payload,
          type: "POUL",
        },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryApplyData,
        sessionKeys.poultryApplyData.type,
        "POUL",
      );
      expect(res.headers.location).toEqual(poultryApplyRoutes.youCanClaimMultiple);
    });
  });
});
