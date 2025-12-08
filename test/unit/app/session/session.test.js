import {
  clearAllOfSession,
  clearApplyRedirect,
  sessionEntryKeys,
  removeSessionDataForSelectHerdChange,
} from "../../../../app/session/index.js";

const yarMock = {
  id: 1,
  get: jest.fn((entryKey) => {
    if (entryKey === "entryKey") {
      return { key1: 123, key2: 123 };
    }
  }),
  set: jest.fn(),
  clear: jest.fn(),
};

describe("session", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("clearAllOfSession", () => {
    test("yar.clear is called for all entries (no exclusions)", () => {
      const request = { yar: yarMock };
      clearAllOfSession(request);

      const entryKeyValuePairs = Object.entries(sessionEntryKeys);
      expect(yarMock.clear).toHaveBeenCalledTimes(entryKeyValuePairs.length);

      entryKeyValuePairs.forEach(([key, value]) => {
        expect(yarMock.clear).toHaveBeenCalledWith(value);
      });
    });
  });

  describe("clearApplyRedirect", () => {
    const request = { yar: yarMock };
    clearApplyRedirect(request);

    expect(yarMock.clear).toHaveBeenCalledWith(sessionEntryKeys.signInRedirect);
  });

  describe("removeSessionDataForSelectHerdChange", () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    test("rebuilds subset of endemicsClaim and keeps organisation", () => {
      const request = { yar: yarMock };
      const endemicsClaim = {
        latestVetVisitApplication: { a: 1 },
        latestEndemicsApplication: { b: 2 },
        previousClaims: [{ id: 1 }, { id: 2 }],
        reference: "IAHW-G3CL-V59P",
        typeOfLivestock: "beef",
        typeOfReview: "beef",
        dateOfVisit: "2025-08-15T00:00:00Z",
        tempHerdId: "04f55ea-ed42-4139-9c46-c75ba63eb0742",
        herds: [{ id: "herd1" }, { id: "herd2" }],
        vetVisitsReviewTestResults: "negative",
        biosecurity: "yes",
        piHuntAllAnimals: "yes",
        piHuntRecommended: "yes",
        reviewTestResults: "negative",
      };
      const organisation = {
        name: "Fake org name",
        farmerName: "Fake farmer name",
        email: "fake.farmer.email@example.com.test",
        sbi: "123456789",
        address: "1 fake street,fake town,United Kingdom",
        orgEmail: "fake.org.email@example.com.test",
      };

      yarMock.get.mockImplementation((entryKey) => {
        if (entryKey === sessionEntryKeys.endemicsClaim) {
          return endemicsClaim;
        }
        if (entryKey === sessionEntryKeys.organisation) {
          return organisation;
        }
        return undefined;
      });

      const result = removeSessionDataForSelectHerdChange(request);

      expect(yarMock.clear).toHaveBeenCalledWith(sessionEntryKeys.endemicsClaim);

      const expectedSession = {
        latestVetVisitApplication: { a: 1 },
        latestEndemicsApplication: { b: 2 },
        previousClaims: [{ id: 1 }, { id: 2 }],
        reference: "IAHW-G3CL-V59P",
        typeOfLivestock: "beef",
        typeOfReview: "beef",
        dateOfVisit: "2025-08-15T00:00:00Z",
        tempHerdId: "04f55ea-ed42-4139-9c46-c75ba63eb0742",
        herds: [{ id: "herd1" }, { id: "herd2" }],
        vetVisitsReviewTestResults: "negative",
      };
      expect(yarMock.set).toHaveBeenCalledWith(sessionEntryKeys.endemicsClaim, expectedSession);
      expect(yarMock.set).toHaveBeenCalledWith(sessionEntryKeys.organisation, organisation);
      expect(result).toEqual({
        originalSession: endemicsClaim,
        remadeSession: expectedSession,
      });
    });
  });
});
