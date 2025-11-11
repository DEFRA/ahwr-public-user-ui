import * as cheerio from "cheerio";
import { createServer } from "../../../../../app/server.js";
import { getCrumbs } from "../../../../utils/get-crumbs.js";
import { getSessionData, setSessionData } from "../../../../../app/session/index.js";
import { isVisitDateAfterPIHuntAndDairyGoLive } from "../../../../../app/lib/context-helper.js";

// jest.mock('../../../../../app/event/raise-invalid-data-event')
jest.mock("../../../../../app/session/index.js");
jest.mock("../../../../../app/lib/context-helper.js");

const url = `/biosecurity`;
const auth = {
  credentials: { reference: "1111", sbi: "111111111" },
  strategy: "cookie",
};
let crumb;

describe("Biosecurity test when Optional PI Hunt is OFF", () => {
  let server;

  beforeEach(async () => {
    crumb = await getCrumbs(server);
  });

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();
    // raiseInvalidDataEvent.mockImplementation(() => { })
    setSessionData.mockImplementation(() => {});
    isVisitDateAfterPIHuntAndDairyGoLive.mockImplementation(() => {
      return false;
    });
  });
  afterAll(async () => {
    jest.resetAllMocks();
    await server.stop();
  });

  describe(`GET ${url} route`, () => {
    test("redirect if not logged in / authorized", async () => {
      const options = {
        method: "GET",
        url,
      };

      getSessionData.mockReturnValue({ typeOfLivestock: "pigs" });

      const response = await server.inject(options);

      expect(response.statusCode).toBe(302);
      expect(response.headers.location.toString()).toEqual(`/sign-in`);
    });
    test("Returns 200", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      getSessionData.mockReturnValue({ typeOfLivestock: "pigs", reference: "TEMP-6GSE-PIR8" });

      const response = await server.inject(options);

      expect(response.statusCode).toBe(200);
    });
    test("Returns 200 when the review test result for beef is negative", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      getSessionData.mockReturnValue({
        typeOfLivestock: "beef",
        reviewTestResults: "negative",
        reference: "TEMP-6GSE-PIR8",
      });

      const response = await server.inject(options);

      expect(response.statusCode).toBe(200);
    });
    test("display question text", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const response = await server.inject(options);

      const $ = cheerio.load(response.payload);
      expect($("title").text()).toMatch(
        "Did the vet do a biosecurity assessment? - Get funding to improve animal health and welfare",
      );
      expect($("h1").text()).toMatch("Did the vet do a biosecurity assessment?");
    });
    test("select 'yes' when biosecurity is 'yes'", async () => {
      const options = {
        method: "GET",
        auth,
        url,
      };

      getSessionData.mockReturnValue({
        typeOfLivestock: "pigs",
        biosecurity: "yes",
        reference: "TEMP-6GSE-PIR8",
      });

      const response = await server.inject(options);
      const $ = cheerio.load(response.payload);
      const biosecurity = "yes";

      expect($('input[name="biosecurity"]:checked').val()).toEqual(biosecurity);
      expect($(".govuk-back-link").text()).toMatch("Back");
    });

    test("back link for pigs when genetic sequencing value set", async () => {
      const options = {
        method: "GET",
        auth,
        url,
      };

      getSessionData.mockReturnValue({
        typeOfLivestock: "pigs",
        biosecurity: "yes",
        reference: "TEMP-6GSE-PIR8",
        pigsGeneticSequencing: "mlv",
      });

      const response = await server.inject(options);
      const $ = cheerio.load(response.payload);

      expect($(".govuk-back-link").attr().href).toMatch("/pigs-genetic-sequencing");
    });

    test("back link for pigs when pcr test value set", async () => {
      const options = {
        method: "GET",
        auth,
        url,
      };

      getSessionData.mockReturnValue({
        typeOfLivestock: "pigs",
        biosecurity: "yes",
        reference: "TEMP-6GSE-PIR8",
        pigsFollowUpTest: "pcr",
      });

      const response = await server.inject(options);
      const $ = cheerio.load(response.payload);

      expect($(".govuk-back-link").attr().href).toMatch("/pigs-pcr-result");
    });
  });
  describe(`POST ${url}`, () => {
    test("show inline Error if continue is pressed and biosecurity answer not selected", async () => {
      const options = {
        method: "POST",
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, biosecurity: "", assessmentPercentage: "" },
      };

      getSessionData.mockReturnValue({ typeOfLivestock: "pigs" });

      const response = await server.inject(options);
      const $ = cheerio.load(response.payload);
      const errorMessage = "Select yes if the vet did a biosecurity assessment";

      expect($("li > a").text()).toMatch(errorMessage);
    });
    test("show inline error if continue is pressed and no answer is selected for assessmentPercentage", async () => {
      const options = {
        method: "POST",
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, biosecurity: "yes", assessmentPercentage: "" },
      };

      getSessionData.mockReturnValue({ typeOfLivestock: "pigs" });

      const response = await server.inject(options);
      const $ = cheerio.load(response.payload);
      const errorMessage = "Enter the assessment percentage";

      expect(response.statusCode).toBe(400);
      expect($("li > a").text().trim()).toContain(errorMessage);
    });
    test("continue to next page when biosecurity and assessment are provided for Pigs journey", async () => {
      const options = {
        method: "POST",
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, biosecurity: "yes", assessmentPercentage: "1" },
      };

      getSessionData.mockReturnValue({ typeOfLivestock: "pigs" });

      const response = await server.inject(options);

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toEqual(`/check-answers`);
      expect(setSessionData).toHaveBeenCalled();
    });
    test('continue to next page when biosecurity is "yes" for other journeys besides pig', async () => {
      const options = {
        method: "POST",
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, biosecurity: "yes" },
      };

      getSessionData.mockReturnValue({ typeOfLivestock: "beef" });

      const response = await server.inject(options);

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toEqual(`/check-answers`);
      expect(setSessionData).toHaveBeenCalled();
    });
    test('continue to Exception page when biosecurity  is "no" for any journey', async () => {
      const options = {
        method: "POST",
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, biosecurity: "no" },
      };

      getSessionData.mockReturnValue({ typeOfLivestock: "pigs" });

      const response = await server.inject(options);
      const $ = cheerio.load(response.payload);

      expect(response.statusCode).toBe(400);
      expect($("h1").text()).toMatch("You cannot continue with your claim");
      // expect(raiseInvalidDataEvent).toHaveBeenCalled()
    });
    test("continue without providing biosecurity", async () => {
      const options = {
        method: "POST",
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb },
      };

      getSessionData.mockReturnValue({ typeOfLivestock: "pigs" });

      const response = await server.inject(options);
      const $ = cheerio.load(response.payload);

      expect(response.statusCode).toBe(400);
      expect($("li > a").text()).toContain("Select yes if the vet did a biosecurity assessment");
    });
    test("continue with providing biosecurity and assessmentPercentage", async () => {
      const options = {
        method: "POST",
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, biosecurity: "yes", assessmentPercentage: "80" },
      };

      getSessionData.mockReturnValue({ typeOfLivestock: "pigs" });

      const response = await server.inject(options);

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toEqual(`/check-answers`);
      expect(setSessionData).toHaveBeenCalled();
    });
    test.each([
      {
        biosecurity: "yes",
        assessmentPercentage: "",
        errorMessage: "Enter the assessment percentage",
      },
      {
        biosecurity: "yes",
        assessmentPercentage: "0",
        errorMessage: "The assessment percentage must be a number between 1 and 100",
      },
      {
        biosecurity: "yes",
        assessmentPercentage: "101",
        errorMessage: "The assessment percentage must be a number between 1 and 100",
      },
      {
        biosecurity: "yes",
        assessmentPercentage: "abc",
        errorMessage: "The assessment percentage can only include numbers",
      },
    ])(
      'continue to Exception page when biosecurity  is "no" for any journey',
      async ({ biosecurity, assessmentPercentage, errorMessage }) => {
        const options = {
          method: "POST",
          auth,
          url,
          headers: { cookie: `crumb=${crumb}` },
          payload: { crumb, biosecurity, assessmentPercentage },
        };
        getSessionData.mockReturnValue({ biosecurity: "no" });

        const response = await server.inject(options);
        const $ = cheerio.load(response.payload);

        expect(response.statusCode).toBe(400);

        expect($("li > a").text()).toContain(errorMessage);
      },
    );
  });
});

describe("Biosecurity test when Optional PI Hunt is ON", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();
    isVisitDateAfterPIHuntAndDairyGoLive.mockImplementation(() => {
      return true;
    });
  });

  afterAll(async () => {
    await server.stop();
    jest.resetAllMocks();
  });

  beforeEach(async () => {
    crumb = await getCrumbs(server);
  });

  describe(`GET ${url} route`, () => {
    test.each([
      {
        typeOfLivestock: "beef",
        piHunt: "no",
        piHuntRecommended: "no",
        piHuntAllAnimals: "no",
        reviewTestResults: "negative",
        backLink: "/pi-hunt",
      },
      {
        typeOfLivestock: "beef",
        piHunt: "yes",
        piHuntRecommended: "no",
        piHuntAllAnimals: "no",
        reviewTestResults: "negative",
        backLink: "/pi-hunt-recommended",
      },
      {
        typeOfLivestock: "beef",
        piHunt: "yes",
        piHuntRecommended: "yes",
        piHuntAllAnimals: "no",
        reviewTestResults: "negative",
        backLink: "/pi-hunt-all-animals",
      },
      {
        typeOfLivestock: "beef",
        piHunt: "yes",
        piHuntRecommended: "yes",
        piHuntAllAnimals: "yes",
        reviewTestResults: "negative",
        backLink: "/test-results",
      },
      {
        typeOfLivestock: "beef",
        piHunt: "yes",
        piHuntRecommended: "yes",
        piHuntAllAnimals: "yes",
        reviewTestResults: "positive",
        backLink: "/test-results",
      },
    ])(
      "return 200",
      async ({
        typeOfLivestock,
        piHunt,
        piHuntRecommended,
        piHuntAllAnimals,
        reviewTestResults,
        backLink,
      }) => {
        getSessionData.mockReturnValue({
          typeOfLivestock,
          piHunt,
          piHuntRecommended,
          reviewTestResults,
          piHuntAllAnimals,
          reference: "TEMP-6GSE-PIR8",
        });
        const options = {
          method: "GET",
          url,
          auth,
        };

        const response = await server.inject(options);
        const $ = cheerio.load(response.payload);

        expect(response.statusCode).toBe(200);
        expect($(".govuk-back-link").attr("href")).toContain(backLink);
      },
    );
  });
});
