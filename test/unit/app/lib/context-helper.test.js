import {
  getReviewHerdId,
  isMultipleHerdsUserJourney,
  isPigsAndPaymentsUserJourney,
  isVisitDateAfterPIHuntAndDairyGoLive,
  refreshApplications,
  skipOtherHerdsOnSbiPage,
  skipSameHerdPage,
} from "../../../../app/lib/context-helper.js";
import {
  ONLY_HERD,
  PI_HUNT_AND_DAIRY_FOLLOW_UP_RELEASE_DATE,
} from "../../../../app/constants/claim-constants.js";
import { getApplicationsBySbi } from "../../../../app/api-requests/application-api.js";
import { setSessionData } from "../../../../app/session/index.js";

jest.mock("../../../../app/api-requests/application-api.js");
jest.mock("../../../../app/session/index.js");

describe("context-helper", () => {
  test("isVisitDateAfterPIHuntAndDairyGoLive throws error when no visit date provided", () => {
    expect(() => {
      isVisitDateAfterPIHuntAndDairyGoLive(undefined);
    }).toThrow("dateOfVisit must be parsable as a date, value provided: undefined");
  });
  test("isVisitDateAfterPIHuntAndDairyGoLive throws error when visit date provided is not parsable as a date", () => {
    expect(() => {
      isVisitDateAfterPIHuntAndDairyGoLive("abc123");
    }).toThrow("dateOfVisit must be parsable as a date, value provided: abc123");
  });
  test("isVisitDateAfterPIHuntAndDairyGoLive returns false when visit date pre go live", () => {
    const dayBeforeGoLive = new Date(PI_HUNT_AND_DAIRY_FOLLOW_UP_RELEASE_DATE);
    dayBeforeGoLive.setDate(dayBeforeGoLive.getDate() - 1);
    expect(isVisitDateAfterPIHuntAndDairyGoLive(dayBeforeGoLive.toISOString())).toBe(false);
  });
  test("isVisitDateAfterPIHuntAndDairyGoLive returns true when visit date post go live and value provided is a string", () => {
    const dayOfGoLive = PI_HUNT_AND_DAIRY_FOLLOW_UP_RELEASE_DATE.toISOString();
    expect(isVisitDateAfterPIHuntAndDairyGoLive(dayOfGoLive)).toBe(true);
  });
  test("isVisitDateAfterPIHuntAndDairyGoLive returns true when visit date post go live and value provided is a date", () => {
    const dayOfGoLive = PI_HUNT_AND_DAIRY_FOLLOW_UP_RELEASE_DATE;
    expect(isVisitDateAfterPIHuntAndDairyGoLive(dayOfGoLive)).toBe(true);
  });

  test("skipSameHerdPage, skip when no claims for any species", () => {
    const previousClaims = [];

    expect(skipSameHerdPage(previousClaims, "sheep")).toBe(true);
  });
  test("skipSameHerdPage, skip when no claims for species but do have claims for other species", () => {
    const previousClaims = [
      { createdAt: "2025-04-30T00:00:00.000Z", data: { typeOfLivestock: "pigs" } },
      { createdAt: "2025-05-01T00:00:00.000Z", data: { typeOfLivestock: "beef", herdId: "1" } },
      { createdAt: "2025-05-02T00:00:00.000Z", data: { typeOfLivestock: "pigs", herdId: "2" } },
      { createdAt: "2025-05-03T00:00:00.000Z", data: { typeOfLivestock: "dairy", herdId: "3" } },
    ];

    expect(skipSameHerdPage(previousClaims, "sheep")).toBe(true);
  });
  test("skipSameHerdPage, skip when claims for species but one had herd", () => {
    const previousClaims = [
      { createdAt: "2025-05-01T00:00:00.000Z", data: { typeOfLivestock: "sheep" } },
      {
        createdAt: "2025-05-02T00:00:00.000Z",
        data: { typeOfLivestock: "sheep" },
        herd: { id: "1" },
      },
    ];

    expect(skipSameHerdPage(previousClaims, "sheep")).toBe(true);
  });
  test("skipSameHerdPage, don't skip when claims for species and none had herd", () => {
    const previousClaims = [
      { createdAt: "2025-05-01T00:00:00.000Z", data: { typeOfLivestock: "sheep" } },
      { createdAt: "2025-05-02T00:00:00.000Z", data: { typeOfLivestock: "sheep" } },
    ];

    expect(skipSameHerdPage(previousClaims, "sheep")).toBe(false);
  });

  test("skipOtherHerdsOnSbiPage, do not skip when existing herds undefined", () => {
    const randomlyGeneratedId = "8c726c7f-ceac-4253-8155-0fa5c868fbde";
    const existingHerds = undefined;

    expect(skipOtherHerdsOnSbiPage(existingHerds, randomlyGeneratedId)).toBe(false);
  });
  test("skipOtherHerdsOnSbiPage, do not skip when existing herds empty", () => {
    const randomlyGeneratedId = "8c726c7f-ceac-4253-8155-0fa5c868fbde";
    const existingHerds = [];

    expect(skipOtherHerdsOnSbiPage(existingHerds, randomlyGeneratedId)).toBe(false);
  });
  test("skipOtherHerdsOnSbiPage, skip when not using an existing herd", () => {
    const randomlyGeneratedId = "8c726c7f-ceac-4253-8155-0fa5c868fbde";
    const existingHerds = [
      { herdId: "97ae1e8e-f8cd-44e0-bd61-d3469ae322c5", herdReasons: [ONLY_HERD] },
    ];

    expect(skipOtherHerdsOnSbiPage(existingHerds, randomlyGeneratedId)).toBe(true);
  });
  test(`skipOtherHerdsOnSbiPage, skip when existing herd but reason not ${ONLY_HERD}`, () => {
    const existingHerdId = "8c726c7f-ceac-4253-8155-0fa5c868fbde";
    const existingHerds = [{ herdId: existingHerdId, herdReasons: ["foo"] }];

    expect(skipOtherHerdsOnSbiPage(existingHerds, existingHerdId)).toBe(true);
  });
  test(`skipOtherHerdsOnSbiPage, do not skip when existing herd and reason is ${ONLY_HERD}`, () => {
    const existingHerdId = "8c726c7f-ceac-4253-8155-0fa5c868fbde";
    const existingHerds = [{ id: existingHerdId, reasons: [ONLY_HERD] }];

    expect(skipOtherHerdsOnSbiPage(existingHerds, existingHerdId)).toBe(false);
  });

  test("isMultipleHerdsUserJourney, returns false when visit date before golive", () => {
    expect(isMultipleHerdsUserJourney("2025-04-30T00:00:00.000Z", [])).toBe(false);
  });
  test("isMultipleHerdsUserJourney, returns false when reject T&Cs flag", () => {
    expect(
      isMultipleHerdsUserJourney("2025-05-01T00:00:00.000Z", [
        { appliesToMh: false },
        { appliesToMh: true },
      ]),
    ).toBe(false);
  });
  test("isMultipleHerdsUserJourney, returns true when visit date on/after golive and no flags", () => {
    expect(isMultipleHerdsUserJourney("2025-05-01T00:00:00.000Z", [])).toBe(true);
  });
  test("isMultipleHerdsUserJourney, returns true when visit date on/after golive and no reject T&Cs flag", () => {
    expect(isMultipleHerdsUserJourney("2025-05-01T00:00:00.000Z", [{ appliesToMh: false }])).toBe(
      true,
    );
  });

  describe("isPigsAndPaymentsUserJourney", () => {
    it("should return true when visit date on golive", () => {
      expect(isPigsAndPaymentsUserJourney("2026-01-22T00:00:00.000Z")).toBe(true);
    });

    it("should return true when visit date after golive", () => {
      expect(isPigsAndPaymentsUserJourney("2026-01-23T00:00:00.000Z")).toBe(true);
    });

    it("should return false when visit date before golive", () => {
      expect(isPigsAndPaymentsUserJourney("2026-01-21T00:00:00.000Z")).toBe(false);
    });
  });

  describe("getReviewHerdId", () => {
    it("returns herdId when it is not equal to unnamedHerdId or tempHerdId", () => {
      const result = getReviewHerdId({
        herdId: "abc123",
        tempHerdId: "temp456",
      });
      expect(result).toBe("abc123");
    });

    it("returns undefined when herdId equals tempHerdId", () => {
      const result = getReviewHerdId({
        herdId: "temp456",
        tempHerdId: "temp456",
      });
      expect(result).toBeUndefined();
    });
  });

  describe("refreshApplications", () => {
    const mockRequest = {};
    it("returns new world application and relevant old world application", async () => {
      const newWorld = {
        type: "EE",
        reference: "IAHW-1111-2222",
        createdAt: "2025-05-01T00:00:00.000Z",
      };
      const oldWorld = {
        type: "VV",
        reference: "AHWR-1111-2222",
        data: {
          visitDate: "2025-04-15T00:00:00.000Z",
        },
      };
      getApplicationsBySbi.mockResolvedValueOnce([newWorld, oldWorld]);
      const { latestEndemicsApplication, latestVetVisitApplication } = await refreshApplications(
        "123456789",
        mockRequest,
      );

      expect(latestEndemicsApplication.reference).toBe("IAHW-1111-2222");
      expect(latestVetVisitApplication.reference).toBe("AHWR-1111-2222");
      expect(setSessionData).toHaveBeenCalledWith(
        mockRequest,
        "endemicsClaim",
        "latestEndemicsApplication",
        newWorld,
      );
      expect(setSessionData).toHaveBeenCalledWith(
        mockRequest,
        "endemicsClaim",
        "latestVetVisitApplication",
        oldWorld,
      );
    });

    it("returns new world application and ignores not relevant old world application", async () => {
      const newWorld = {
        type: "EE",
        reference: "IAHW-1111-2222",
        createdAt: "2025-05-01T00:00:00.000Z",
      };
      const oldWorld = {
        type: "VV",
        reference: "AHWR-1111-2222",
        data: {
          visitDate: "2023-04-15T00:00:00.000Z",
        },
      };
      getApplicationsBySbi.mockResolvedValueOnce([newWorld, oldWorld]);
      const { latestEndemicsApplication, latestVetVisitApplication } = await refreshApplications(
        "123456789",
        mockRequest,
      );

      expect(latestEndemicsApplication.reference).toBe("IAHW-1111-2222");
      expect(latestVetVisitApplication).toBeUndefined();
      expect(setSessionData).toHaveBeenCalledWith(
        mockRequest,
        "endemicsClaim",
        "latestEndemicsApplication",
        newWorld,
      );
      expect(setSessionData).toHaveBeenCalledWith(
        mockRequest,
        "endemicsClaim",
        "latestVetVisitApplication",
        undefined,
      );
    });

    it("returns new world application when no old world application", async () => {
      const newWorld = {
        type: "EE",
        reference: "IAHW-1111-2222",
        createdAt: "2025-05-01T00:00:00.000Z",
      };
      getApplicationsBySbi.mockResolvedValueOnce([newWorld]);
      const { latestEndemicsApplication, latestVetVisitApplication } = await refreshApplications(
        "123456789",
        mockRequest,
      );

      expect(latestEndemicsApplication.reference).toBe("IAHW-1111-2222");
      expect(latestVetVisitApplication).toBeUndefined();
      expect(setSessionData).toHaveBeenCalledWith(
        mockRequest,
        "endemicsClaim",
        "latestEndemicsApplication",
        newWorld,
      );
      expect(setSessionData).toHaveBeenCalledWith(
        mockRequest,
        "endemicsClaim",
        "latestVetVisitApplication",
        undefined,
      );
    });

    it("returns nothing when old world application only", async () => {
      const oldWorld = {
        type: "VV",
        reference: "AHWR-1111-2222",
        data: {
          visitDate: "2023-04-15T00:00:00.000Z",
        },
      };
      getApplicationsBySbi.mockResolvedValueOnce([oldWorld]);
      const { latestEndemicsApplication, latestVetVisitApplication } = await refreshApplications(
        "123456789",
        mockRequest,
      );

      expect(latestVetVisitApplication).toBeUndefined();
      expect(latestEndemicsApplication).toBeUndefined();
      expect(setSessionData).toHaveBeenCalledWith(
        mockRequest,
        "endemicsClaim",
        "latestEndemicsApplication",
        undefined,
      );
      expect(setSessionData).toHaveBeenCalledWith(
        mockRequest,
        "endemicsClaim",
        "latestVetVisitApplication",
        undefined,
      );
    });
  });
});
