import { getPersonAndOrg } from "./get-person-and-org.js";
import { getPersonSummary } from "./person.js";
import {
  getOrganisationAuthorisation,
  getOrganisation,
  getOrganisationRole,
} from "./organisation.js";
import {
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
  getSessionData,
  setSessionEntry,
} from "../../session/index.js";
import { getCphNumbers } from "./cph-numbers.js";
import { when } from "jest-when";

jest.mock("../../session", () => {
  const actual = jest.requireActual("../../session");
  return Object.keys(actual).reduce((acc, key) => {
    acc[key] = key === "sessionKeys" || key === "sessionEntryKeys" ? actual[key] : jest.fn();
    return acc;
  }, {});
});

jest.mock("./person", () => ({ getPersonSummary: jest.fn() }));
jest.mock("./cph-numbers", () => ({ getCphNumbers: jest.fn() }));
jest.mock("./organisation", () => {
  const actual = jest.requireActual("./organisation");
  return {
    ...actual,
    getOrganisationAuthorisation: jest.fn(),
    getOrganisation: jest.fn(),
    getOrganisationRole: jest.fn(),
  };
});

const defaultPersonSummary = {
  id: 12345,
  name: "Farmer Tom",
  email: "farmertomstestemail@test.com.test",
};

const defaultOrganisationAuthorisation = {
  personPrivileges: [{ personId: 12345, privilegeNames: ["Submit - bps"] }],
  personRoles: [
    { personId: 12345, role: "Agent" },
    { personId: 54321, role: "Farmer" },
  ],
};

const defaultOrganisation = {
  address: {
    uprn: "10001234567",
    address1: "1 Brown Lane",
    address2: "Smithering",
    address3: "West Sussex",
    address4: "England",
    address5: "UK",
    pafOrganisationName: "Thompsons",
    flatName: "Sisterdene",
    buildingNumberRange: "1-30",
    buildingName: "Grey Building",
    street: "Brown Lane",
    dependentLocality: "Westfield",
    doubleDependentLocality: "North Westfield",
    city: "Grenwald",
    county: "West Sussex",
    postalCode: "WS11 2DS",
    country: "GBR",
  },
  sbi: 999000,
  name: "Unit test org",
  email: "unit@test.email.com.test",
};

const formattedAddress =
  "Thompsons,Sisterdene,Grey Building,1-30,Brown Lane,Westfield,North Westfield,West Sussex,Grenwald,WS11 2DS,GBR";

describe("getPersonAndOrg", () => {
  const request = { stuff: true };
  const apimAccessToken = "Apim1234";
  const crn = 123456789;
  const logger = { info: jest.fn(), error: jest.fn() };
  const accessToken = { currentRelationshipId: "22222" };

  beforeEach(() => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.tokens, sessionKeys.tokens.accessToken)
      .mockReturnValue("abc123");
    getPersonSummary.mockResolvedValue(defaultPersonSummary);
    getOrganisationAuthorisation.mockResolvedValue(defaultOrganisationAuthorisation);
    getOrganisation.mockResolvedValue(defaultOrganisation);
    getOrganisationRole.mockReturnValue("Agent");
    getCphNumbers.mockResolvedValue([1, 2, 3]);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  describe("personSummary", () => {
    test("is populated from getPersonSummary", async () => {
      const result = await getPersonAndOrg({ request, apimAccessToken, crn, logger, accessToken });
      expect(result.personSummary).toEqual(defaultPersonSummary);
    });

    test("calls getPersonSummary with the correct arguments", async () => {
      await getPersonAndOrg({ request, apimAccessToken, crn, logger, accessToken });
      expect(getPersonSummary).toHaveBeenCalledWith({
        apimAccessToken,
        crn,
        logger,
        defraIdAccessToken: "abc123",
      });
    });
  });

  describe("personRole", () => {
    test("is derived from the organisation authorisation", async () => {
      const result = await getPersonAndOrg({ request, apimAccessToken, crn, logger, accessToken });
      expect(result.personRole).toBe("Agent");
    });
  });

  describe("cphNumbers", () => {
    test("is populated from getCphNumbers", async () => {
      const result = await getPersonAndOrg({ request, apimAccessToken, crn, logger, accessToken });
      expect(result.cphNumbers).toEqual([1, 2, 3]);
    });

    test("calls getCphNumbers with the correct arguments", async () => {
      await getPersonAndOrg({ request, apimAccessToken, crn, logger, accessToken });
      expect(getCphNumbers).toHaveBeenCalledWith({
        apimAccessToken,
        defraIdAccessToken: "abc123",
        request,
      });
    });
  });

  describe("orgDetails", () => {
    describe("organisationPermission", () => {
      test("is true when person has a Submit privilege", async () => {
        const result = await getPersonAndOrg({ request, apimAccessToken, crn, logger, accessToken });
        expect(result.orgDetails.organisationPermission).toBe(true);
      });

      test("is false when person has no valid permission", async () => {
        getOrganisationAuthorisation.mockResolvedValueOnce({
          ...defaultOrganisationAuthorisation,
          personPrivileges: [{ personId: 12345, privilegeNames: ["View only"] }],
        });
        const result = await getPersonAndOrg({ request, apimAccessToken, crn, logger, accessToken });
        expect(result.orgDetails.organisationPermission).toBe(false);
      });
    });

    describe("organisation", () => {
      test("includes sbi, name, and email from the organisation API", async () => {
        const result = await getPersonAndOrg({ request, apimAccessToken, crn, logger, accessToken });
        expect(result.orgDetails.organisation).toMatchObject({
          sbi: 999000,
          name: "Unit test org",
          email: "unit@test.email.com.test",
        });
      });

      test("calls getOrganisation and getOrganisationAuthorisation with the correct arguments", async () => {
        await getPersonAndOrg({ request, apimAccessToken, crn, logger, accessToken });
        expect(getOrganisation).toHaveBeenCalledWith({
          apimAccessToken,
          defraIdAccessToken: "abc123",
          organisationId: accessToken.currentRelationshipId,
        });
        expect(getOrganisationAuthorisation).toHaveBeenCalledWith({
          apimAccessToken,
          defraIdAccessToken: "abc123",
          organisationId: accessToken.currentRelationshipId,
        });
      });

      describe("address", () => {
        test("uses paf fields when uprn is present", async () => {
          const result = await getPersonAndOrg({
            request,
            apimAccessToken,
            crn,
            logger,
            accessToken,
          });
          expect(result.orgDetails.organisation.address).toBe(formattedAddress);
        });

        test("uses address1-5 fields when uprn is absent", async () => {
          getOrganisation.mockResolvedValueOnce({
            ...defaultOrganisation,
            address: {
              address1: "1 Brown Lane",
              address2: "Smithering",
              address3: "West Sussex",
              address4: "England",
              address5: "UK",
              city: "Grenwald",
              postalCode: "WS11 2DS",
              country: "GBR",
            },
          });
          const result = await getPersonAndOrg({
            request,
            apimAccessToken,
            crn,
            logger,
            accessToken,
          });
          expect(result.orgDetails.organisation.address).toBe(
            "1 Brown Lane,Smithering,West Sussex,England,UK,Grenwald,WS11 2DS,GBR",
          );
        });

        test("excludes falsy address fields", async () => {
          getOrganisation.mockResolvedValueOnce({
            ...defaultOrganisation,
            address: { address1: "1 Brown Lane", address2: null, postalCode: "WS11 2DS" },
          });
          const result = await getPersonAndOrg({
            request,
            apimAccessToken,
            crn,
            logger,
            accessToken,
          });
          expect(result.orgDetails.organisation.address).toBe("1 Brown Lane,WS11 2DS");
        });
      });
    });
  });

  describe("when an API call fails", () => {
    test("throws when getPersonSummary rejects", async () => {
      getPersonSummary.mockRejectedValueOnce(new Error("Person summary error"));
      await expect(
        getPersonAndOrg({ request, apimAccessToken, crn, logger, accessToken }),
      ).rejects.toThrow("Failed to retrieve person or organisation details");
    });

    test("throws when getOrganisationAuthorisation rejects", async () => {
      getOrganisationAuthorisation.mockRejectedValueOnce(new Error("Organisation auth error"));
      await expect(
        getPersonAndOrg({ request, apimAccessToken, crn, logger, accessToken }),
      ).rejects.toThrow("Failed to retrieve person or organisation details");
    });

    test("throws when getOrganisation rejects", async () => {
      getOrganisation.mockRejectedValueOnce(new Error("Organisation error"));
      await expect(
        getPersonAndOrg({ request, apimAccessToken, crn, logger, accessToken }),
      ).rejects.toThrow("Failed to retrieve person or organisation details");
    });

    test("throws when getCphNumbers rejects", async () => {
      getCphNumbers.mockRejectedValueOnce(new Error("CPH numbers error"));
      await expect(
        getPersonAndOrg({ request, apimAccessToken, crn, logger, accessToken }),
      ).rejects.toThrow("Failed to retrieve person or organisation details");
    });
  });

  describe("session side effects", () => {
    test("stores the customer id via setSessionData", async () => {
      await getPersonAndOrg({ request, apimAccessToken, crn, logger, accessToken });
      expect(setSessionData).toHaveBeenCalledWith(
        request,
        sessionEntryKeys.customer,
        sessionKeys.customer.id,
        12345,
      );
    });

    test("stores the organisation data via setSessionEntry", async () => {
      await getPersonAndOrg({ request, apimAccessToken, crn, logger, accessToken });
      expect(setSessionEntry).toHaveBeenCalledWith(request, sessionEntryKeys.organisation, {
        address: formattedAddress,
        crn: 123456789,
        email: "farmertomstestemail@test.com.test",
        farmerName: "Farmer Tom",
        name: "Unit test org",
        orgEmail: "unit@test.email.com.test",
        sbi: "999000",
      });
    });
  });
});
