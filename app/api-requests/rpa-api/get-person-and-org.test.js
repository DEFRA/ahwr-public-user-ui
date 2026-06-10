import { getPersonAndOrg } from "./get-person-and-org.js";
import { sendRPAGetRequest } from "./send-get-request.js";
import {
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
  getSessionData,
  setSessionEntry,
} from "../../session/index.js";
import { when } from "jest-when";

jest.mock("../../session", () => {
  const actual = jest.requireActual("../../session");
  return Object.keys(actual).reduce((acc, key) => {
    acc[key] = key === "sessionKeys" || key === "sessionEntryKeys" ? actual[key] : jest.fn();
    return acc;
  }, {});
});

jest.mock("./send-get-request", () => ({ sendRPAGetRequest: jest.fn() }));

const rawPersonSummary = {
  id: 12345,
  firstName: "Farmer",
  lastName: "Tom",
  email: "farmertomstestemail@test.com.test",
};

const expectedPersonSummary = {
  ...rawPersonSummary,
  name: "Farmer Tom",
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

  const setupSendRPAGetRequest = ({
    orgAuth = { data: defaultOrganisationAuthorisation },
    org = { _data: defaultOrganisation },
  } = {}) => {
    sendRPAGetRequest.mockImplementation(({ url, headers }) => {
      if (headers?.crn === crn) return Promise.resolve({ _data: rawPersonSummary });
      if (url?.includes("permissions")) return Promise.resolve(orgAuth);
      if (url?.includes("cph")) return Promise.resolve({ success: true, data: [{ cphNumber: 1 }, { cphNumber: 2 }, { cphNumber: 3 }] });
      return Promise.resolve(org);
    });
  };

  beforeEach(() => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.tokens, sessionKeys.tokens.accessToken)
      .mockReturnValue("abc123");
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.customer, sessionKeys.customer.organisationId)
      .mockReturnValue("88888");
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.customer, sessionKeys.customer.crn)
      .mockReturnValue("111111");
    setupSendRPAGetRequest();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  describe("personSummary", () => {
    test("is populated from the person API", async () => {
      const result = await getPersonAndOrg({ request, apimAccessToken, crn, logger, accessToken });
      expect(result.personSummary).toMatchObject(expectedPersonSummary);
    });
  });

  describe("personRole", () => {
    test("is derived from the organisation authorisation", async () => {
      const result = await getPersonAndOrg({ request, apimAccessToken, crn, logger, accessToken });
      expect(result.personRole).toBe("Agent");
    });
  });

  describe("cphNumbers", () => {
    test("is populated from the CPH numbers API", async () => {
      const result = await getPersonAndOrg({ request, apimAccessToken, crn, logger, accessToken });
      expect(result.cphNumbers).toEqual([1, 2, 3]);
    });
  });

  describe("orgDetails", () => {
    describe("organisationPermission", () => {
      test("is true when person has a Submit privilege", async () => {
        const result = await getPersonAndOrg({ request, apimAccessToken, crn, logger, accessToken });
        expect(result.orgDetails.organisationPermission).toBe(true);
      });

      test("is false when person has no valid permission", async () => {
        setupSendRPAGetRequest({
          orgAuth: {
            data: {
              ...defaultOrganisationAuthorisation,
              personPrivileges: [{ personId: 12345, privilegeNames: ["View only"] }],
            },
          },
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
          setupSendRPAGetRequest({
            org: {
              _data: {
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
              },
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
          setupSendRPAGetRequest({
            org: {
              _data: {
                ...defaultOrganisation,
                address: { address1: "1 Brown Lane", address2: null, postalCode: "WS11 2DS" },
              },
            },
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
    test("throws when any API call fails", async () => {
      sendRPAGetRequest.mockRejectedValue(new Error("API error"));
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
