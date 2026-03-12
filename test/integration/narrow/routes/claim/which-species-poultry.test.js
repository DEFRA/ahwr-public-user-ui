import * as cheerio from "cheerio";
import { createServer } from "../../../../../app/server.js";
import { getCrumbs } from "../../../../utils/get-crumbs.js";
import {
  resetEndemicsClaimSession,
  refreshApplications,
} from "../../../../../app/lib/context-helper.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../../../app/session/index.js";
import { when } from "jest-when";
import { config } from "../../../../../app/config/index.js";

jest.mock("../../../../../app/session");
jest.mock("../../../../../app/lib/context-helper", () => ({
  resetEndemicsClaimSession: jest.fn(),
  refreshApplications: jest
    .fn()
    .mockResolvedValue({ latestEndemicsApplication: { reference: "POUL123" } }),
}));

config.poultry.enabled = true;
describe("Endemics which species test", () => {
  setSessionData.mockImplementation(() => {});
  const url = `/which-species-poultry`;
  const auth = {
    credentials: { reference: "1111", sbi: "111111111" },
    strategy: "cookie",
  };
  let crumb;
  let server;

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(async () => {
    crumb = await getCrumbs(server);
    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.latestEndemicsApplication,
      )
      .mockReturnValue({ status: "AGREED" });

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.confirmedDetails,
        sessionKeys.confirmedDetails,
      )
      .mockReturnValue(true);

    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({});

    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.organisation)
      .mockReturnValue({ sbi: 123456789 });
  });

  describe("GET /which-species-poultry", () => {
    test("should render page when no previous session exists", async () => {
      const options = {
        method: "GET",
        auth,
        url,
      };

      const res = await server.inject(options);
      const $ = cheerio.load(res.payload);

      expect(res.statusCode).toBe(200);
      expect($("title").text().trim()).toContain(
        "Which species are you claiming for? - Get funding to improve animal health and welfare - GOV.UK",
      );
      expect($("h1").text().trim()).toMatch("Which species are you claiming for?");
      expect($(".govuk-radios__item").length).toEqual(5);
      expect($(".govuk-back-link").attr("href")).toContain("vet-visits");

      expect(resetEndemicsClaimSession).toHaveBeenCalled();
      expect(refreshApplications).toHaveBeenCalled();
    });

    test.each([
      { typeOfLivestock: "broilers", radio: "Broilers" },
      { typeOfLivestock: "laying", radio: "Laying Hens" },
      { typeOfLivestock: "ducks", radio: "Ducks" },
      { typeOfLivestock: "geese", radio: "Geese" },
      { typeOfLivestock: "turkeys", radio: "Turkeys" },
    ])(
      "should select $radio when previous session livestock is $typeOfLivestock",
      async ({ typeOfLivestock, radio }) => {
        const options = {
          method: "GET",
          auth,
          url,
        };

        when(getSessionData)
          .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
          .mockReturnValue({
            typeOfLivestock,
            reference: "TEMP-6GSE-PIR8",
            organisation: { id: 42 },
          });

        const res = await server.inject(options);

        const $ = cheerio.load(res.payload);
        expect($('input[name="typeOfLivestock"]:checked').next("label").text().trim()).toEqual(
          radio,
        );
        expect($(".govuk-back-link").text()).toMatch("Back");
      },
    );
  });

  describe("POST claim/which-species-poultry", () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    test("should display error when livestock not selected", async () => {
      const options = {
        method: "POST",
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, typeOfLivestock: "" },
      };

      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({});

      const res = await server.inject(options);

      const $ = cheerio.load(res.payload);
      expect($("p.govuk-error-message").text()).toMatch(
        "Select which species you are claiming for",
      );
      expect(res.statusCode).toBe(400);
    });

    test("should redirect to next page when livestock selected", async () => {
      const options = {
        method: "POST",
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, typeOfLivestock: "broilers" },
      };
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
          latestEndemicsApplication: { reference: "TEMP-6GSE-PIR8" },
        });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/date-of-visit");
      expect(setSessionData).toHaveBeenCalled();
      expect(resetEndemicsClaimSession).not.toHaveBeenCalled();
    });

    test("should redirect to next page when livestock selected has changed from previous session", async () => {
      const options = {
        method: "POST",
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, typeOfLivestock: "broilers" },
      };
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
          typeOfLivestock: "laying",
          reference: "TEMP-6GSE-PIR8",
          latestEndemicsApplication: { reference: "AHWR-2470-6BA9" },
        });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/date-of-visit");
      expect(setSessionData).toHaveBeenCalled();
      expect(resetEndemicsClaimSession).toHaveBeenCalledWith(
        expect.any(Object),
        "AHWR-2470-6BA9",
        "TEMP-6GSE-PIR8",
      );
    });
  });
});
