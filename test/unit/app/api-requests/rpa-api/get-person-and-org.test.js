import { getPersonAndOrg } from "../../../../../app/api-requests/rpa-api/get-person-and-org";
import { getPersonSummary } from "../../../../../app/api-requests/rpa-api/person";
import {
  getOrganisationAuthorisation,
  getOrganisation,
} from "../../../../../app/api-requests/rpa-api/organisation";
import {
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
  getSessionData,
} from "../../../../../app/session";
import { getCphNumbers } from "../../../../../app/api-requests/rpa-api/cph-numbers";
import { when } from "jest-when";

when(getSessionData)
  .calledWith(expect.anything(), sessionEntryKeys.tokens, sessionKeys.tokens.accessToken)
  .mockReturnValue("abc123");

jest.mock("../../../../../app/session", () => {
  const actual = jest.requireActual("../../../../../app/session");
  // Mocking everything apart from sessionKeys and sessionEntryKeys
  const mocked = Object.keys(actual).reduce((acc, key) => {
    acc[key] = key === "sessionKeys" || key === "sessionEntryKeys" ? actual[key] : jest.fn();
    return acc;
  }, {});
  return mocked;
});

jest.mock("../../../../../app/api-requests/rpa-api/person", () => ({
  getPersonSummary: jest.fn().mockResolvedValue({
    id: 12345,
    name: "Farmer Tom",
    email: "farmertomstestemail@test.com.test",
  }),
}));

jest.mock("../../../../../app/api-requests/rpa-api/cph-numbers", () => ({
  getCphNumbers: jest.fn().mockResolvedValue([1, 2, 3]),
}));

jest.mock("../../../../../app/api-requests/rpa-api/organisation", () => {
  const actual = jest.requireActual("../../../../../app/api-requests/rpa-api/organisation");

  return {
    ...actual,
    getOrganisationAuthorisation: jest.fn().mockResolvedValue({
      personPrivileges: [{ personId: 12345, privilegeNames: ["Submit - bps"] }],
    }),
    getOrganisation: jest.fn().mockResolvedValue({
      address: {
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
        city: "Grenwald",
        county: "West Sussex",
        postalCode: "WS11 2DS",
        country: "GBR",
      },
      sbi: 999000,
      name: "Unit test org",
      email: "unit@test.email.com.test",
    }),
  };
});

describe("getPersonAndOrg", () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  test("it builds the returned person and org from the 3 API calls", async () => {
    const request = { stuff: true };
    const apimAccessToken = "Apim1234";
    const crn = 123456789;
    const logger = jest.fn();
    const accessToken = { currentRelationshipId: "22222" };

    const result = await getPersonAndOrg({
      request,
      apimAccessToken,
      crn,
      logger,
      accessToken,
    });

    expect(result).toEqual({
      orgDetails: {
        organisation: {
          address:
            "1 Brown Lane,Smithering,West Sussex,England,UK,Thompsons,Sisterdene,1-30,Grey Building,Brown Lane,Grenwald,West Sussex,WS11 2DS,GBR",
          email: "unit@test.email.com.test",
          name: "Unit test org",
          sbi: 999000,
        },
        organisationPermission: true,
      },
      personSummary: {
        id: 12345,
        name: "Farmer Tom",
        email: "farmertomstestemail@test.com.test",
      },
      cphNumbers: [1, 2, 3],
    });
    expect(getPersonSummary).toHaveBeenCalledWith({
      apimAccessToken,
      crn,
      logger,
      defraIdAccessToken: "abc123",
    });
    expect(getOrganisationAuthorisation).toHaveBeenCalledWith({
      apimAccessToken,
      defraIdAccessToken: "abc123",
      organisationId: accessToken.currentRelationshipId,
    });
    expect(getOrganisation).toHaveBeenCalledWith({
      apimAccessToken,
      defraIdAccessToken: "abc123",
      organisationId: accessToken.currentRelationshipId,
    });
    expect(setSessionData).toHaveBeenCalledWith(
      request,
      sessionEntryKeys.customer,
      sessionKeys.customer.id,
      12345,
    );
    expect(setSessionData).toHaveBeenCalledWith(
      request,
      sessionEntryKeys.endemicsClaim,
      sessionKeys.endemicsClaim.organisation,
      {
        address:
          "1 Brown Lane,Smithering,West Sussex,England,UK,Thompsons,Sisterdene,1-30,Grey Building,Brown Lane,Grenwald,West Sussex,WS11 2DS,GBR",
        crn: 123456789,
        email: "farmertomstestemail@test.com.test",
        farmerName: "Farmer Tom",
        name: "Unit test org",
        orgEmail: "unit@test.email.com.test",
        sbi: "999000",
      },
    );
    expect(setSessionData).toHaveBeenCalledWith(
      request,
      sessionEntryKeys.farmerApplyData,
      sessionKeys.farmerApplyData.organisation,
      {
        address:
          "1 Brown Lane,Smithering,West Sussex,England,UK,Thompsons,Sisterdene,1-30,Grey Building,Brown Lane,Grenwald,West Sussex,WS11 2DS,GBR",
        crn: 123456789,
        email: "farmertomstestemail@test.com.test",
        farmerName: "Farmer Tom",
        name: "Unit test org",
        orgEmail: "unit@test.email.com.test",
        sbi: "999000",
      },
    );
    expect(getCphNumbers).toHaveBeenCalledWith({
      apimAccessToken,
      defraIdAccessToken: "abc123",
      request,
    });
  });

  test("An error from any remote call causes an aggregate error to be thrown - org Auth failed", async () => {
    const request = { stuff: true };
    const apimAccessToken = "Apim1234";
    const crn = 123456789;
    const logger = jest.fn();
    const accessToken = { currentRelationshipId: "22222" };

    getOrganisationAuthorisation.mockRejectedValueOnce(new Error("Organisation auth error"));

    await expect(
      getPersonAndOrg({
        request,
        apimAccessToken,
        crn,
        logger,
        accessToken,
      }),
    ).rejects.toThrow("Failed to retrieve person or organisation details");
  });

  test("An error from any remote call causes an aggregate error to be thrown - personSummary failed", async () => {
    const request = { stuff: true };
    const apimAccessToken = "Apim1234";
    const crn = 123456789;
    const logger = jest.fn();
    const accessToken = { currentRelationshipId: "22222" };

    getPersonSummary.mockRejectedValueOnce(new Error("Person summary error"));

    await expect(
      getPersonAndOrg({
        request,
        apimAccessToken,
        crn,
        logger,
        accessToken,
      }),
    ).rejects.toThrow("Failed to retrieve person or organisation details");
  });

  test("An error from any remote call causes an aggregate error to be thrown - organisation failed", async () => {
    const request = { stuff: true };
    const apimAccessToken = "Apim1234";
    const crn = 123456789;
    const logger = jest.fn();
    const accessToken = { currentRelationshipId: "22222" };

    getOrganisation.mockRejectedValueOnce(new Error("Organisation summary error"));

    await expect(
      getPersonAndOrg({
        request,
        apimAccessToken,
        crn,
        logger,
        accessToken,
      }),
    ).rejects.toThrow("Failed to retrieve person or organisation details");
  });
});
