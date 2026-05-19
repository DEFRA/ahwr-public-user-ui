import * as cheerio from "cheerio";
import { ok } from "../../../../../utils/phase-banner-expect.js";
import { getCrumbs } from "../../../../../utils/get-crumbs.js";
import { userType } from "../../../../../../app/constants/constants.js";
import {
  clearApplyRedirect,
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../../../../app/session/index.js";
import { createServer } from "../../../../../../app/server.js";
import { StatusCodes } from "http-status-codes";
import {
  createApplication,
  getApplicationsBySbi,
} from "../../../../../../app/api-requests/application-api.js";
import { when } from "jest-when";
import { trackEvent } from "../../../../../../app/logging/logger.js";
import { refreshApplications } from "../../../../../../app/lib/context-helper.js";
import { axe } from "../../../../../helpers/axe-helper.js";
import { dashboardRoutes } from "../../../../../../app/constants/routes.js";

jest.mock("../../../../../../app/lib/context-helper");
jest.mock("../../../../../../app/session/index");
jest.mock("../../../../../../app/api-requests/application-api");
jest.mock("../../../../../../app/logging/logger.js", () => ({
  ...jest.requireActual("../../../../../../app/logging/logger.js"),
  trackEvent: jest.fn(),
}));
jest.mock("../../../../../../app/config/index.js", () => ({
  config: {
    ...jest.requireActual("../../../../../../app/config/index.js").config,
    poultry: {
      enabled: "true",
      termsAndConditionsUri: "https://example.gov.uk/poultry-terms",
      vetSummaryTemplateUri: "https://example.gov.uk/poultry-vet-summary",
    },
  },
}));

describe("Declaration test", () => {
  const organisation = {
    id: "organisation",
    name: "org-name",
    address: "1 fake street, fakerton, FA1 2DA",
    sbi: "0123456789",
    userType: userType.NEW_USER,
  };
  const auth = {
    credentials: { reference: "1111", sbi: "111111111" },
    strategy: "cookie",
  };

  const poultryApplyData = { reference: "TEMP-PJ7E-WSI8" };

  let server;

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.poultryApplication)
      .mockReturnValue(undefined);
    getApplicationsBySbi.mockReturnValue([]);
  });

  when(getSessionData)
    .calledWith(expect.anything(), sessionEntryKeys.organisation)
    .mockReturnValue(organisation);

  when(getSessionData)
    .calledWith(expect.anything(), sessionEntryKeys.poultryApplyData)
    .mockReturnValue(poultryApplyData);

  when(getSessionData)
    .calledWith(expect.anything(), sessionEntryKeys.confirmedDetails, sessionKeys.confirmedDetails)
    .mockReturnValue(true);

  createApplication.mockResolvedValue({ applicationReference: "POUL-PJ7E-WSI8" });

  describe("GET /declaration route", () => {
    test("when not logged in redirects to dashboard /sign-in", async () => {
      const options = {
        method: "GET",
        url: "/poultry/declaration",
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
      expect(res.headers.location.toString()).toEqual("/sign-in");
    });

    test("returns 200 when organisation found in session", async () => {
      const options = {
        method: "GET",
        url: "/poultry/declaration",
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.OK);
      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);
      ok($);

      expect($("title").text()).toMatch(
        "Review your agreement offer - Get funding to improve animal health and welfare",
      );
      expect($("h1.govuk-heading-l").text().trim()).toBe("Review your agreement offer");

      const intro = $("p")
        .filter((i, el) =>
          $(el).text().trim().startsWith("This is an offer of Poultry Biosecurity Review funding"),
        )
        .first();
      expect(intro.text().trim()).toBe(
        "This is an offer of Poultry Biosecurity Review funding for this business:",
      );

      expect($("#organisation-name").text()).toEqual(organisation.name);
      expect($("#organisation-sbi").text()).toEqual(organisation.sbi);

      const eitherHeading = $("h2:contains('You can either:')").first();
      expect(eitherHeading.length).toBe(1);
      const eitherBullets = eitherHeading
        .nextAll("ul")
        .first()
        .find("li")
        .map((i, el) => $(el).text().trim())
        .get();
      expect(eitherBullets).toEqual(["accept this offer", "reject this offer"]);

      const mustHeading = $("h2:contains('For each review you must:')").first();
      expect(mustHeading.length).toBe(1);
      const mustBullets = mustHeading
        .nextAll("ul")
        .first()
        .find("li")
        .map((i, el) => $(el).text().trim().replace(/\s+/g, " "))
        .get();
      expect(mustBullets).toEqual([
        "allow a vet to asses the biosecurity of the site being reviewed",
        "share details about the vet with the Rural Payments Agency (RPA)",
        "ensure the vet completes a poultry biosecurity review vet summary template (opens in new tab) as part of the review",
      ]);

      const askedHeading = $("h2:contains('If asked, you must provide the RPA with:')").first();
      expect(askedHeading.length).toBe(1);
      const askedBullets = askedHeading
        .nextAll("ul")
        .first()
        .find("li")
        .map((i, el) => $(el).text().trim())
        .get();
      expect(askedBullets).toEqual([
        "evidence that your review took place",
        "details of your poultry site",
      ]);

      const vetSummaryPara = $("p")
        .filter((i, el) => $(el).text().trim() === "This information will be on your vet summary.")
        .first();
      expect(vetSummaryPara.length).toBe(1);

      expect($("h2:contains('Declaration')").length).toBe(1);
      const confirmPara = $("p")
        .filter((i, el) => $(el).text().trim().startsWith("Confirm that you have read"))
        .first();
      expect(confirmPara.text().trim().replace(/\s+/g, " ")).toBe(
        "Confirm that you have read the agreement terms and conditions (opens in new tab).",
      );

      const vetLink = $("#vetSummaryTemplateUri");
      expect(vetLink.length).toBe(1);
      expect(vetLink.attr("href")).toBe("https://example.gov.uk/poultry-vet-summary");
      expect(vetLink.attr("target")).toBe("_blank");
      expect(vetLink.attr("rel")).toMatch(/noopener/);
      expect(vetLink.attr("rel")).toMatch(/noreferrer/);
      expect(vetLink.text().trim()).toBe(
        "poultry biosecurity review vet summary template (opens in new tab)",
      );

      const termsLink = $("#termsAndConditionsUri");
      expect(termsLink.length).toBe(1);
      expect(termsLink.attr("href")).toBe("https://example.gov.uk/poultry-terms");
      expect(termsLink.attr("target")).toBe("_blank");
      expect(termsLink.attr("rel")).toMatch(/noopener/);
      expect(termsLink.attr("rel")).toMatch(/noreferrer/);
      expect(termsLink.text().trim()).toBe("the agreement terms and conditions (opens in new tab)");

      expect(res.payload).not.toContain(
        "If the RPA requests evidence that your biosecurity review took place",
      );
      expect(res.payload).not.toContain("If you accept this offer you confirm that:");
      expect(res.payload).not.toContain(
        "The agreement terms and conditions include, but are not limited to:",
      );
      expect(res.payload).not.toContain("you must have the minimum number of poultry needed");
      expect(res.payload).not.toContain(
        "you must follow the rules for timing of biosecurity reviews",
      );

      expect($("button[value='accepted']").text().trim()).toBe("Accept offer");
      expect($("button[value='rejected']").text().trim()).toBe("Reject offer");
    });

    test("redirects to dashboard when application exists", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryApplication)
        .mockReturnValue({ reference: "POUL-PJ7E-WSI8", status: "AGREED" });

      const options = {
        method: "GET",
        url: "/poultry/declaration",
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
      expect(res.headers.location).toEqual(dashboardRoutes.poultryManageYourClaims);
    });
  });

  describe("POST /declaration route", () => {
    test("returns 200, caches data and sends message for valid request", async () => {
      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.fundingSelection,
          sessionKeys.fundingSelection.selectedFunding,
        )
        .mockReturnValue("POUL");
      const applications = [{ organisation, reference: "TEMP-PJ7E-WSI8" }];
      getApplicationsBySbi.mockReturnValue(applications);
      const crumb = await getCrumbs(server);
      const options = {
        method: "POST",
        url: "/poultry/declaration",
        payload: { crumb, terms: "agree", offerStatus: "accepted" },
        auth,
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.OK);
      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("Application complete");
      expect($("title").text()).toMatch(
        "Application complete - Get funding to improve animal health and welfare",
      );
      ok($);
      expect(clearApplyRedirect).toHaveBeenCalled();
      expect(refreshApplications).toHaveBeenCalledWith(organisation.sbi, expect.anything());
      expect(createApplication).toHaveBeenCalledWith(
        { organisation, ...poultryApplyData, type: "POUL" },
        expect.anything(),
      );
      expect(trackEvent).toHaveBeenCalledWith(
        expect.anything(),
        "submit-application",
        "status: accepted sbi:0123456789",
        {
          reference:
            "applicationReference: POUL-PJ7E-WSI8, tempApplicationReference: TEMP-PJ7E-WSI8",
        },
      );
    });

    test("returns 200, shows offer rejection content on rejection", async () => {
      const crumb = await getCrumbs(server);
      const options = {
        method: "POST",
        url: "/poultry/declaration",
        payload: { crumb, terms: "agree", offerStatus: "rejected" },
        auth,
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.OK);
      expect(await axe(res.payload)).toHaveNoViolations();
      // Asserting a new reference has been set in the session
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryApplyData,
        sessionKeys.poultryApplyData.reference,
        expect.any(String),
      );
      const $ = cheerio.load(res.payload);
      expect($("title").text()).toMatch(
        "Agreement offer rejected - Get funding to improve animal health and welfare",
      );
      expect($("h1").text()).toMatch("Agreement offer rejected");
      expect(res.payload).toContain(
        "You've rejected the agreement offer and your application has been cancelled.",
      );
      expect(res.payload).toContain("You'll need to start a new application if you:");

      const bulletItems = $("ul.govuk-list--bullet").first().find("li");
      const actualItems = bulletItems.map((i, el) => $(el).text().trim()).get();
      expect(actualItems).toEqual([
        "rejected the agreement by mistake",
        "change your mind and want to apply again",
      ]);

      const callChargesLink = $("a:contains('Find out about call charges')");
      expect(callChargesLink.length).toBe(1);
      expect(callChargesLink.text().trim()).toBe("Find out about call charges (opens in new tab)");

      expect($(".govuk-back-link").length).toBe(0);

      ok($);
      expect(createApplication).toHaveBeenCalledWith(
        { organisation, ...poultryApplyData, type: "POUL" },
        expect.anything(),
      );
      expect(refreshApplications).not.toHaveBeenCalled();
      expect(trackEvent).toHaveBeenCalledWith(
        expect.anything(),
        "submit-application",
        "status: rejected sbi:0123456789",
        {
          reference:
            "applicationReference: POUL-PJ7E-WSI8, tempApplicationReference: TEMP-PJ7E-WSI8",
        },
      );
    });

    test("returns 400 when request is not valid", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.organisation)
        .mockReturnValue(organisation);
      const crumb = await getCrumbs(server);
      const options = {
        method: "POST",
        url: "/poultry/declaration",
        payload: { crumb, offerStatus: "accepted" },
        auth,
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);
      expect($("h1.govuk-heading-l").text()).toEqual("Review your agreement offer");
      expect($("title").text()).toMatch(
        "Review your agreement offer - Get funding to improve animal health and welfare",
      );
      expect($("#organisation-name").text()).toEqual(organisation.name);
      expect($("#organisation-address").text()).toContain("1 fake street");
      expect($("#organisation-sbi").text()).toEqual(organisation.sbi);
      expect($("#terms-error").text()).toMatch(
        "Confirm you have read and agree to the terms and conditions",
      );

      const vetLink = $("#vetSummaryTemplateUri");
      expect(vetLink.attr("href")).toBe("https://example.gov.uk/poultry-vet-summary");
      expect(vetLink.attr("target")).toBe("_blank");
      const termsLink = $("#termsAndConditionsUri");
      expect(termsLink.attr("href")).toBe("https://example.gov.uk/poultry-terms");
      expect(termsLink.attr("target")).toBe("_blank");
      expect($("button[value='accepted']").text().trim()).toBe("Accept offer");
      expect($("button[value='rejected']").text().trim()).toBe("Reject offer");

      expect(createApplication).not.toHaveBeenCalled();
      expect(refreshApplications).not.toHaveBeenCalled();
      expect(trackEvent).not.toHaveBeenCalled();
    });

    test("when not logged in redirects to dashboard /sign-in", async () => {
      const crumb = await getCrumbs(server);
      const options = {
        method: "POST",
        url: "/poultry/declaration",
        payload: { crumb },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
      expect(res.headers.location.toString()).toEqual("/sign-in");
      expect(createApplication).not.toHaveBeenCalled();
    });
  });
});
