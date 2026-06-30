import {
  clearAllOfSession,
  clearApplyRedirect,
  clearFundingSelection,
  clearEndemicsClaim,
  clearPoultryClaim,
  sessionEntryKeys,
  removeSessionDataForSelectHerdChange,
  removeSessionDataForSameHerdChange,
  removeSessionDataForLogin,
  removeMultipleHerdsSessionData,
  setSessionEntry,
  setSessionData,
  getSessionData,
  sessionKeys,
  emitHerdEvent,
} from "../../../../app/session/index.js";
import {
  sendSessionEvent,
  sendHerdEvent,
} from "../../../../app/messaging/session-event-emission.js";

jest.mock("../../../../app/messaging/session-event-emission.js");

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
    test("yar.clear is called for all entries (no exclusions)", async () => {
      const mockDropFn = jest.fn();
      const sessionId = 123;
      const request = {
        yar: yarMock,
        auth: { credentials: { sessionId } },
        server: { app: { cache: { drop: mockDropFn } } },
      };
      await clearAllOfSession(request);

      const entryKeyValuePairs = Object.entries(sessionEntryKeys);
      expect(yarMock.clear).toHaveBeenCalledTimes(entryKeyValuePairs.length);

      entryKeyValuePairs.forEach(([key, value]) => {
        expect(yarMock.clear).toHaveBeenCalledWith(value);
      });

      expect(mockDropFn).toHaveBeenCalledWith(sessionId);
    });

    test("does not call cache.drop when no sessionId in credentials", async () => {
      const mockDropFn = jest.fn();
      const request = {
        yar: yarMock,
        auth: { credentials: {} },
        server: { app: { cache: { drop: mockDropFn } } },
      };
      await clearAllOfSession(request);

      expect(mockDropFn).not.toHaveBeenCalled();
    });
  });

  describe("clearApplyRedirect", () => {
    test("clears signInRedirect from session", () => {
      const request = { yar: yarMock };
      clearApplyRedirect(request);

      expect(yarMock.clear).toHaveBeenCalledWith(sessionEntryKeys.signInRedirect);
    });
  });

  describe("clearFundingSelection", () => {
    test("clears fundingSelection from session", () => {
      const request = { yar: yarMock };
      clearFundingSelection(request);

      expect(yarMock.clear).toHaveBeenCalledWith(sessionEntryKeys.fundingSelection);
    });
  });

  describe("clearEndemicsClaim", () => {
    test("retains only latestVetVisitApplication and latestEndemicsApplication", () => {
      const endemicsClaim = {
        latestVetVisitApplication: { ref: "VET-123" },
        latestEndemicsApplication: { ref: "END-456" },
        reference: "IAHW-G3CL-V59P",
        typeOfLivestock: "beef",
        dateOfVisit: "2025-08-15T00:00:00Z",
        biosecurity: "yes",
      };
      const organisation = {
        name: "Fake org name",
        sbi: "123456789",
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

      const request = { yar: yarMock };
      clearEndemicsClaim(request);

      expect(yarMock.set).toHaveBeenCalledWith(sessionEntryKeys.endemicsClaim, {
        latestVetVisitApplication: { ref: "VET-123" },
        latestEndemicsApplication: { ref: "END-456" },
      });
      expect(yarMock.set).toHaveBeenCalledWith(sessionEntryKeys.organisation, organisation);
    });

    test("handles undefined endemicsClaim gracefully", () => {
      yarMock.get.mockImplementation((entryKey) => {
        if (entryKey === sessionEntryKeys.organisation) {
          return { name: "Org" };
        }
        return undefined;
      });

      const request = { yar: yarMock };
      clearEndemicsClaim(request);

      expect(yarMock.set).toHaveBeenCalledWith(sessionEntryKeys.endemicsClaim, {
        latestVetVisitApplication: undefined,
        latestEndemicsApplication: undefined,
      });
    });
  });

  describe("clearPoultryClaim", () => {
    test("retains only latestPoultryApplication", () => {
      const poultryClaim = {
        latestPoultryApplication: { ref: "POUL-123" },
        reference: "POUL-G3CL-V59P",
        dateOfVisit: "2025-08-15T00:00:00Z",
        biosecurity: "yes",
        herdId: "herd-123",
      };
      const organisation = {
        name: "Fake org name",
        sbi: "123456789",
      };

      yarMock.get.mockImplementation((entryKey) => {
        if (entryKey === sessionEntryKeys.poultryClaim) {
          return poultryClaim;
        }

        if (entryKey === sessionEntryKeys.organisation) {
          return organisation;
        }
        return undefined;
      });

      const request = { yar: yarMock };
      clearPoultryClaim(request);

      expect(yarMock.set).toHaveBeenCalledWith(sessionEntryKeys.poultryClaim, {
        latestPoultryApplication: { ref: "POUL-123" },
      });
      expect(yarMock.set).toHaveBeenCalledWith(sessionEntryKeys.organisation, organisation);
    });

    test("handles undefined poultryClaim gracefully", () => {
      yarMock.get.mockImplementation((entryKey) => {
        if (entryKey === sessionEntryKeys.organisation) {
          return { name: "Org" };
        }
        return undefined;
      });

      const request = { yar: yarMock };
      clearPoultryClaim(request);

      expect(yarMock.set).toHaveBeenCalledWith(sessionEntryKeys.poultryClaim, {
        latestPoultryApplication: undefined,
      });
    });
  });

  describe("removeMultipleHerdsSessionData", () => {
    test("clears herd-related fields from endemicsClaim", () => {
      const endemicsClaim = {
        latestVetVisitApplication: { ref: "VET-123" },
        reference: "IAHW-G3CL-V59P",
        typeOfLivestock: "beef",
        tempHerdId: "temp-herd-123",
        herdId: "herd-123",
        herdName: "Main Herd",
        herdCph: "12/345/6789",
        isOnlyHerdOnSbi: false,
        herdReasons: ["reason1"],
        herdSame: "yes",
      };

      yarMock.get.mockImplementation((entryKey) => {
        if (entryKey === sessionEntryKeys.endemicsClaim) {
          return endemicsClaim;
        }
        return undefined;
      });

      const request = { yar: yarMock };
      removeMultipleHerdsSessionData(request);

      expect(yarMock.set).toHaveBeenCalledWith(sessionEntryKeys.endemicsClaim, {
        latestVetVisitApplication: { ref: "VET-123" },
        reference: "IAHW-G3CL-V59P",
        typeOfLivestock: "beef",
        tempHerdId: undefined,
        herdId: undefined,
        herdName: undefined,
        herdCph: undefined,
        isOnlyHerdOnSbi: undefined,
        herdReasons: undefined,
        herdSame: undefined,
      });
    });
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

  describe("removeSessionDataForSameHerdChange", () => {
    test("rebuilds session and restores herd info from original", () => {
      const endemicsClaim = {
        latestVetVisitApplication: { a: 1 },
        latestEndemicsApplication: { b: 2 },
        previousClaims: [{ id: 1 }],
        reference: "IAHW-G3CL-V59P",
        typeOfLivestock: "beef",
        typeOfReview: "beef",
        dateOfVisit: "2025-08-15T00:00:00Z",
        tempHerdId: "temp-123",
        herds: [{ id: "herd1" }],
        vetVisitsReviewTestResults: "negative",
        herdId: "herd-456",
        herdVersion: 2,
        herdName: "Main Herd",
        herdCph: "12/345/6789",
        isOnlyHerdOnSbi: true,
        herdReasons: ["reason1", "reason2"],
        biosecurity: "yes",
      };
      const organisation = {
        name: "Fake org name",
        sbi: "123456789",
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

      const request = { yar: yarMock };
      removeSessionDataForSameHerdChange(request);

      expect(yarMock.clear).toHaveBeenCalledWith(sessionEntryKeys.endemicsClaim);

      const expectedSession = {
        latestVetVisitApplication: { a: 1 },
        latestEndemicsApplication: { b: 2 },
        previousClaims: [{ id: 1 }],
        reference: "IAHW-G3CL-V59P",
        typeOfLivestock: "beef",
        typeOfReview: "beef",
        dateOfVisit: "2025-08-15T00:00:00Z",
        tempHerdId: "temp-123",
        herds: [{ id: "herd1" }],
        vetVisitsReviewTestResults: "negative",
        herdId: "herd-456",
        herdVersion: 2,
        herdName: "Main Herd",
        herdCph: "12/345/6789",
        isOnlyHerdOnSbi: true,
        herdReasons: ["reason1", "reason2"],
      };

      expect(yarMock.set).toHaveBeenCalledWith(sessionEntryKeys.endemicsClaim, expectedSession);
    });
  });

  describe("removeSessionDataForLogin", () => {
    test("clears all session data then restores pkcecodes and tokens", async () => {
      const pkcecodes = { verifier: "code-verifier-123" };
      const tokens = {
        idToken: "id-token-123",
        accessToken: "access-token-123",
        refreshToken: "refresh-token-123",
        state: "state-123",
        nonce: "nonce-123",
      };
      const sessionId = 123;
      const mockDropFn = jest.fn();

      yarMock.get.mockImplementation((entryKey) => {
        if (entryKey === sessionEntryKeys.pkcecodes) {
          return pkcecodes;
        }
        if (entryKey === sessionEntryKeys.tokens) {
          return tokens;
        }
        return undefined;
      });

      const request = {
        yar: yarMock,
        auth: { credentials: { sessionId } },
        server: { app: { cache: { drop: mockDropFn } } },
      };

      await removeSessionDataForLogin(request);

      const entryKeyValuePairs = Object.entries(sessionEntryKeys);
      expect(yarMock.clear).toHaveBeenCalledTimes(entryKeyValuePairs.length);
      entryKeyValuePairs.forEach(([, value]) => {
        expect(yarMock.clear).toHaveBeenCalledWith(value);
      });

      expect(mockDropFn).toHaveBeenCalledWith(sessionId);

      expect(yarMock.set).toHaveBeenCalledWith(sessionEntryKeys.pkcecodes, pkcecodes);
      expect(yarMock.set).toHaveBeenCalledWith(sessionEntryKeys.tokens, tokens);
    });
  });

  describe("getSessionData", () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    test("returns entire entry when no key provided", () => {
      const endemicsClaim = {
        reference: "IAHW-G3CL-V59P",
        typeOfLivestock: "beef",
      };

      yarMock.get.mockImplementation((entryKey) => {
        if (entryKey === sessionEntryKeys.endemicsClaim) {
          return endemicsClaim;
        }
        return undefined;
      });

      const request = { yar: yarMock };
      const result = getSessionData(request, sessionEntryKeys.endemicsClaim);

      expect(result).toEqual(endemicsClaim);
    });

    test("returns specific key value when key provided", () => {
      const endemicsClaim = {
        reference: "IAHW-G3CL-V59P",
        typeOfLivestock: "beef",
      };

      yarMock.get.mockImplementation((entryKey) => {
        if (entryKey === sessionEntryKeys.endemicsClaim) {
          return endemicsClaim;
        }
        return undefined;
      });

      const request = { yar: yarMock };
      const result = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.reference,
      );

      expect(result).toBe("IAHW-G3CL-V59P");
    });

    test("returns undefined when entry does not exist", () => {
      yarMock.get.mockReturnValue(undefined);

      const request = { yar: yarMock };
      const result = getSessionData(request, sessionEntryKeys.endemicsClaim);

      expect(result).toBeUndefined();
    });

    test("returns undefined when key does not exist in entry", () => {
      const endemicsClaim = {
        reference: "IAHW-G3CL-V59P",
      };

      yarMock.get.mockImplementation((entryKey) => {
        if (entryKey === sessionEntryKeys.endemicsClaim) {
          return endemicsClaim;
        }
        return undefined;
      });

      const request = { yar: yarMock };
      const result = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.typeOfLivestock,
      );

      expect(result).toBeUndefined();
    });

    test("throws error when entry key does not exist", () => {
      const request = { yar: yarMock };

      expect(() => {
        getSessionData(request, "invalidEntryKey");
      }).toThrow(
        "Session was attempted to be accessed with an entry key that doesnt exist: invalidEntryKey.",
      );
    });

    test("throws error when inner key does not exist in sessionKeys", () => {
      yarMock.get.mockReturnValue({});

      const request = { yar: yarMock };

      expect(() => {
        getSessionData(request, sessionEntryKeys.endemicsClaim, "invalidInnerKey");
      }).toThrow(
        "Session was attempted to be accessed with an inner key that doesnt exist: invalidInnerKey.",
      );
    });

    test("allows any key for entries without nested sessionKeys definition", () => {
      yarMock.get.mockReturnValue({ customKey: "customValue" });

      const request = { yar: yarMock };
      const result = getSessionData(request, sessionEntryKeys.organisation, "customKey");

      expect(result).toBe("customValue");
    });
  });

  describe("setSessionEntry", () => {
    const endemicsClaim = {
      latestVetVisitApplication: { a: 1 },
      latestEndemicsApplication: { b: 2, reference: "IAHW-G3CL-V59P" },
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
    const poultryClaim = {
      latestVetVisitApplication: { a: 1 },
      latestEndemicsApplication: { b: 2 },
      latestPoultryApplication: { c: 2, reference: "POUL-G3CL-V59P" },
      previousClaims: [{ id: 1 }, { id: 2 }],
      reference: "POUL-G3CL-V59P",
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
    const farmerApplyData = {
      reference: "IAHW-G3CL-V59P",
    };
    const poultryApplyData = {
      reference: "POUL-G3CL-V59P",
    };

    beforeEach(() => {
      jest.resetAllMocks();
      yarMock.get.mockImplementation((entryKey) => {
        if (entryKey === sessionEntryKeys.endemicsClaim) {
          return endemicsClaim;
        }
        if (entryKey === sessionEntryKeys.organisation) {
          return organisation;
        }
        if (entryKey === sessionEntryKeys.farmerApplyData) {
          return farmerApplyData;
        }
        if (entryKey === sessionEntryKeys.poultryApplyData) {
          return poultryApplyData;
        }
        if (entryKey === sessionEntryKeys.poultryClaim) {
          return poultryClaim;
        }
        return undefined;
      });
    });

    test("throws error when entry key does not exist", async () => {
      const request = { yar: yarMock };

      await expect(setSessionEntry(request, "invalidEntryKey", "value")).rejects.toThrow(
        "Session entry was attempted to be set with an entry key that doesnt exist: invalidEntryKey.",
      );
    });

    test("trims string values before setting", async () => {
      const request = { yar: yarMock };
      await setSessionEntry(request, sessionEntryKeys.tempReference, "  REF-123  ", {
        shouldEmitEvent: false,
      });

      expect(yarMock.set).toHaveBeenCalledWith(sessionEntryKeys.tempReference, "REF-123");
    });

    test("does not trim non-string values", async () => {
      const objValue = { key: "value" };
      const request = { yar: yarMock };
      await setSessionEntry(request, sessionEntryKeys.customer, objValue, {
        shouldEmitEvent: false,
      });

      expect(yarMock.set).toHaveBeenCalledWith(sessionEntryKeys.customer, objValue);
    });

    test("emits event by default", async () => {
      const request = { yar: yarMock };
      await setSessionEntry(request, sessionEntryKeys.customer, {});

      expect(sendSessionEvent).toHaveBeenCalled();
    });

    test("emits event when explicitly setting emit to true", async () => {
      const request = { yar: yarMock };
      await setSessionEntry(request, sessionEntryKeys.customer, {}, { shouldEmitEvent: true });

      expect(sendSessionEvent).toHaveBeenCalled();
    });

    test("does not emit event when explicitly setting emit to false", async () => {
      const request = { yar: yarMock };
      await setSessionEntry(request, sessionEntryKeys.customer, {}, { shouldEmitEvent: false });

      expect(sendSessionEvent).not.toHaveBeenCalled();
    });

    test("emits event and sets journey to application when entryKey is application and journey is APPLY", async () => {
      const request = { yar: yarMock };
      await setSessionEntry(
        request,
        sessionEntryKeys.application,
        { reference: "IAHW-G3CL-V59P" },
        { journey: "apply" },
      );

      expect(sendSessionEvent).toHaveBeenCalledWith({
        applicationReference: "IAHW-G3CL-V59P",
        email: "fake.farmer.email@example.com.test",
        id: 1,
        journey: "application",
        reference: "IAHW-G3CL-V59P",
        sbi: "123456789",
        sessionKey: "application",
        value: { reference: "IAHW-G3CL-V59P" },
      });
    });

    test("emits event and sets journey to application when entryKey is poultryApplication and journey is poultryApply", async () => {
      const request = { yar: yarMock };
      yarMock.get.mockImplementation((entryKey) => {
        if (entryKey === sessionEntryKeys.poultryClaim) {
          return { ...poultryClaim, reference: "POUL-G3CL-V59P" };
        }
        if (entryKey === sessionEntryKeys.organisation) {
          return organisation;
        }
        if (entryKey === sessionEntryKeys.poultryApplyData) {
          return poultryApplyData;
        }
        if (entryKey === sessionEntryKeys.fundingSelection) {
          return {
            selectedFunding: "POUL",
          };
        }
        return undefined;
      });

      await setSessionEntry(
        request,
        sessionEntryKeys.poultryApplication,
        { reference: "POUL-G3CL-V59P" },
        { journey: "poultryApply" },
      );

      expect(sendSessionEvent).toHaveBeenCalledWith({
        applicationReference: "POUL-G3CL-V59P",
        email: "fake.farmer.email@example.com.test",
        id: 1,
        journey: "poultryApplication",
        reference: "POUL-G3CL-V59P",
        sbi: "123456789",
        sessionKey: "poultryApplication",
        value: { reference: "POUL-G3CL-V59P" },
      });
    });

    test("emits event and sets journey to tempReference when entryKey is tempReference and journey is APPLY", async () => {
      const request = { yar: yarMock };
      await setSessionEntry(request, sessionEntryKeys.tempReference, "TEMP-G3CL-V59P", {
        journey: "apply",
      });

      expect(sendSessionEvent).toHaveBeenCalledWith({
        applicationReference: "IAHW-G3CL-V59P",
        email: "fake.farmer.email@example.com.test",
        id: 1,
        journey: "tempReference",
        reference: "IAHW-G3CL-V59P",
        sbi: "123456789",
        sessionKey: "tempReference",
        value: "TEMP-G3CL-V59P",
      });
    });

    test("emits event and sets journey to tempClaimReference when entryKey is tempClaimReference and journey is CLAIM", async () => {
      const request = { yar: yarMock };
      await setSessionEntry(request, sessionEntryKeys.tempClaimReference, "TEMP-CLAIM-86M1-SHM3", {
        journey: "claim",
      });

      expect(sendSessionEvent).toHaveBeenCalledWith({
        applicationReference: "IAHW-G3CL-V59P",
        email: "fake.farmer.email@example.com.test",
        id: 1,
        journey: "tempClaimReference",
        reference: "IAHW-G3CL-V59P",
        sbi: "123456789",
        sessionKey: "tempClaimReference",
        value: "TEMP-CLAIM-86M1-SHM3",
      });
    });

    test("emits event and sets journey to claim when entryKey is organisation", async () => {
      const request = { yar: yarMock };
      await setSessionEntry(request, sessionEntryKeys.organisation, { name: "Farm business" });

      expect(sendSessionEvent).toHaveBeenCalledWith({
        applicationReference: "IAHW-G3CL-V59P",
        email: "fake.farmer.email@example.com.test",
        id: 1,
        journey: "claim",
        reference: "IAHW-G3CL-V59P",
        sbi: "123456789",
        sessionKey: "organisation",
        value: { name: "Farm business" },
      });
    });

    test("does not emit event when no organisation in session", async () => {
      yarMock.get.mockReturnValue(undefined);

      const request = { yar: yarMock };
      await setSessionEntry(request, sessionEntryKeys.customer, { id: "123" });

      expect(sendSessionEvent).not.toHaveBeenCalled();
    });
  });

  describe("setSessionData", () => {
    beforeEach(() => {
      jest.resetAllMocks();
      yarMock.get.mockImplementation((entryKey) => {
        if (entryKey === sessionEntryKeys.endemicsClaim) {
          return endemicsClaim;
        }
        if (entryKey === sessionEntryKeys.organisation) {
          return organisation;
        }
        if (entryKey === sessionEntryKeys.poultryClaim) {
          return poultryClaim;
        }
        return undefined;
      });
    });

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
    const poultryClaim = {
      latestVetVisitApplication: { a: 1 },
      latestEndemicsApplication: { b: 2 },
      latestPoultryApplication: { c: 2, reference: "POUL-G3CL-V59P" },
      previousClaims: [{ id: 1 }, { id: 2 }],
      reference: "POUL-G3CL-V59P",
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

    test("throws error when entry key does not exist", async () => {
      const request = { yar: yarMock };

      await expect(setSessionData(request, "invalidEntryKey", "someKey", "value")).rejects.toThrow(
        "Session was attempted to be set with an entry key that doesnt exist: invalidEntryKey.",
      );
    });

    test("throws error when key is not provided", async () => {
      const request = { yar: yarMock };

      await expect(
        setSessionData(request, sessionEntryKeys.endemicsClaim, null, "value"),
      ).rejects.toThrow(
        "setSessionData requires a key - use setSessionEntry for updating individual non-nested values",
      );
    });

    test("throws error when key is undefined", async () => {
      const request = { yar: yarMock };

      await expect(
        setSessionData(request, sessionEntryKeys.endemicsClaim, undefined, "value"),
      ).rejects.toThrow(
        "setSessionData requires a key - use setSessionEntry for updating individual non-nested values",
      );
    });

    test("trims string values before setting", async () => {
      const request = { yar: yarMock };
      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.vetsName,
        "  Dr. Smith  ",
        { shouldEmitEvent: false },
      );

      expect(yarMock.set).toHaveBeenCalledWith(sessionEntryKeys.endemicsClaim, {
        ...endemicsClaim,
        vetsName: "Dr. Smith",
      });
    });

    test("does not trim non-string values", async () => {
      const request = { yar: yarMock };
      const arrayValue = ["item1", "item2"];
      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.sheepTests,
        arrayValue,
        { shouldEmitEvent: false },
      );

      expect(yarMock.set).toHaveBeenCalledWith(sessionEntryKeys.endemicsClaim, {
        ...endemicsClaim,
        sheepTests: arrayValue,
      });
    });

    test("creates entry object if it does not exist", async () => {
      yarMock.get.mockImplementation((entryKey) => {
        if (entryKey === sessionEntryKeys.organisation) {
          return organisation;
        }
        return undefined;
      });

      const request = { yar: yarMock };
      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.reference,
        "NEW-REF-123",
        { shouldEmitEvent: false },
      );

      expect(yarMock.set).toHaveBeenCalledWith(sessionEntryKeys.endemicsClaim, {
        reference: "NEW-REF-123",
      });
    });

    test("emits event by default", async () => {
      const request = { yar: yarMock };
      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.amount,
        "15",
      );

      expect(sendSessionEvent).toHaveBeenCalled();
    });

    test("emits event when explicitly setting emit to true", async () => {
      const request = { yar: yarMock };
      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.amount,
        "15",
        { shouldEmitEvent: true },
      );

      expect(sendSessionEvent).toHaveBeenCalled();
    });

    test("does not emit event when explicitly setting emit to false", async () => {
      const request = { yar: yarMock };
      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.amount,
        "15",
        { shouldEmitEvent: false },
      );

      expect(sendSessionEvent).not.toHaveBeenCalled();
    });

    test("emits event when entryKey is poultryApplyData", async () => {
      const request = { yar: yarMock };
      yarMock.get.mockImplementation((entryKey) => {
        if (entryKey === sessionEntryKeys.poultryClaim) {
          return { ...poultryClaim, reference: "POUL-G3CL-V59P" };
        }
        if (entryKey === sessionEntryKeys.organisation) {
          return organisation;
        }
        if (entryKey === sessionEntryKeys.poultryApplyData) {
          return {
            reference: "POUL-G3CL-V59P",
          };
        }
        if (entryKey === sessionEntryKeys.fundingSelection) {
          return {
            selectedFunding: "POUL",
          };
        }
        return undefined;
      });

      await setSessionData(
        request,
        sessionEntryKeys.poultryApplyData,
        sessionKeys.poultryApplyData.agreeMultipleSpecies,
        "yes",
      );

      expect(sendSessionEvent).toHaveBeenCalledWith({
        applicationReference: "POUL-G3CL-V59P",
        email: "fake.farmer.email@example.com.test",
        id: 1,
        journey: "farmerApplyData",
        reference: "POUL-G3CL-V59P",
        sbi: "123456789",
        sessionKey: "agreeMultipleSpecies",
        value: "yes",
      });
    });

    test("emits event when entryKey is poultryClaim", async () => {
      const request = { yar: yarMock };
      yarMock.get.mockImplementation((entryKey) => {
        if (entryKey === sessionEntryKeys.poultryClaim) {
          return { ...poultryClaim, reference: "POUL-G3CL-V59P" };
        }
        if (entryKey === sessionEntryKeys.organisation) {
          return organisation;
        }
        if (entryKey === sessionEntryKeys.poultryApplyData) {
          return {
            reference: "POUL-G3CL-V59P",
          };
        }
        if (entryKey === sessionEntryKeys.fundingSelection) {
          return {
            selectedFunding: "POUL",
          };
        }
        return undefined;
      });
      await setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.biosecurityUsefulness,
        "not-very-useful",
      );

      expect(sendSessionEvent).toHaveBeenCalledWith({
        applicationReference: "POUL-G3CL-V59P",
        email: "fake.farmer.email@example.com.test",
        id: 1,
        journey: "claim",
        reference: "POUL-G3CL-V59P",
        sbi: "123456789",
        sessionKey: "biosecurityUsefulness",
        value: "not-very-useful",
      });
    });

    test("emits event when entryKey is farmerApplyData", async () => {
      const request = { yar: yarMock };
      yarMock.get.mockImplementation((entryKey) => {
        if (entryKey === sessionEntryKeys.endemicsClaim) {
          return endemicsClaim;
        }
        if (entryKey === sessionEntryKeys.organisation) {
          return organisation;
        }
        if (entryKey === sessionEntryKeys.farmerApplyData) {
          return { reference: "FARM-REF-123" };
        }
        return undefined;
      });

      await setSessionData(
        request,
        sessionEntryKeys.farmerApplyData,
        sessionKeys.farmerApplyData.declaration,
        true,
      );

      expect(sendSessionEvent).toHaveBeenCalledWith({
        applicationReference: "IAHW-G3CL-V59P",
        email: "fake.farmer.email@example.com.test",
        id: 1,
        journey: "farmerApplyData",
        reference: "FARM-REF-123",
        sbi: "123456789",
        sessionKey: "declaration",
        value: true,
      });
    });

    test("emits event when user is signing in", async () => {
      const request = { yar: yarMock };
      yarMock.get.mockImplementation((entryKey) => {
        if (entryKey === sessionEntryKeys.poultryClaim) {
          return { ...poultryClaim, reference: "POUL-G3CL-V59P" };
        }
        if (entryKey === sessionEntryKeys.organisation) {
          return organisation;
        }
        if (entryKey === sessionEntryKeys.poultryApplyData) {
          return {
            reference: "POUL-G3CL-V59P",
          };
        }
        if (entryKey === sessionEntryKeys.fundingSelection) {
          return {
            selectedFunding: "POUL",
          };
        }
        return undefined;
      });

      await setSessionEntry(request, sessionEntryKeys.signInRedirect, true);

      expect(sendSessionEvent).toHaveBeenCalledWith({
        applicationReference: "POUL-G3CL-V59P",
        email: "fake.farmer.email@example.com.test",
        id: 1,
        journey: "signInRedirect",
        reference: "POUL-G3CL-V59P",
        sbi: "123456789",
        sessionKey: "signInRedirect",
        value: true,
      });
    });

    test("emits event when organisation and scheme is livestock", async () => {
      const request = { yar: yarMock };
      yarMock.get.mockImplementation((entryKey) => {
        if (entryKey === sessionEntryKeys.organisation) {
          return organisation;
        }
        if (entryKey === sessionEntryKeys.fundingSelection) {
          return {
            selectedFunding: "IAHW",
          };
        }
        return undefined;
      });

      await setSessionEntry(request, sessionEntryKeys.organisation, organisation);

      expect(sendSessionEvent).toHaveBeenCalledWith({
        email: "fake.farmer.email@example.com.test",
        id: 1,
        journey: "claim",
        sbi: "123456789",
        sessionKey: "organisation",
        value: organisation,
      });
    });
  });

  test("does not emit event when no organisation in session", async () => {
    yarMock.get.mockReturnValue(undefined);

    const request = { yar: yarMock };
    await setSessionData(
      request,
      sessionEntryKeys.endemicsClaim,
      sessionKeys.endemicsClaim.amount,
      "15",
    );

    expect(sendSessionEvent).not.toHaveBeenCalled();
  });

  describe("emitHerdEvent", () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    const organisation = {
      name: "Fake org name",
      farmerName: "Fake farmer name",
      email: "fake.farmer.email@example.com.test",
      sbi: "123456789",
      address: "1 fake street,fake town,United Kingdom",
      orgEmail: "fake.org.email@example.com.test",
    };

    test("calls sendHerdEvent with correct data", async () => {
      const request = { yar: yarMock };
      yarMock.get.mockImplementation(() => organisation);

      await emitHerdEvent({
        request,
        type: "herd-name",
        message: "Herd name collected from user",
        data: {
          herdId: "12345678",
          herdVersion: 1,
          herdName: "Herd one",
        },
      });
      expect(sendHerdEvent).toHaveBeenCalledWith({
        sbi: "123456789",
        email: "fake.farmer.email@example.com.test",
        sessionId: 1,
        type: "herd-name",
        message: "Herd name collected from user",
        data: {
          herdId: "12345678",
          herdVersion: 1,
          herdName: "Herd one",
        },
      });
    });

    test("sends herd event with organisation details", async () => {
      const organisation = {
        name: "Fake org name",
        email: "fake.farmer.email@example.com.test",
        sbi: "123456789",
      };

      yarMock.get.mockImplementation((entryKey) => {
        if (entryKey === sessionEntryKeys.organisation) {
          return organisation;
        }
        return undefined;
      });

      const request = { yar: yarMock };
      const eventData = {
        request,
        type: "herd-created",
        message: "New herd created",
        data: { herdId: "herd-123", herdName: "Main Herd" },
      };

      await emitHerdEvent(eventData);

      expect(sendHerdEvent).toHaveBeenCalledWith({
        sbi: "123456789",
        email: "fake.farmer.email@example.com.test",
        sessionId: 1,
        type: "herd-created",
        message: "New herd created",
        data: { herdId: "herd-123", herdName: "Main Herd" },
      });
    });

    test("sends herd event with different event types", async () => {
      const organisation = {
        email: "test@example.com",
        sbi: "987654321",
      };

      yarMock.get.mockImplementation((entryKey) => {
        if (entryKey === sessionEntryKeys.organisation) {
          return organisation;
        }
        return undefined;
      });

      const request = { yar: yarMock };

      await emitHerdEvent({
        request,
        type: "herd-updated",
        message: "Herd details updated",
        data: { herdId: "herd-456" },
      });

      expect(sendHerdEvent).toHaveBeenCalledWith({
        sbi: "987654321",
        email: "test@example.com",
        sessionId: 1,
        type: "herd-updated",
        message: "Herd details updated",
        data: { herdId: "herd-456" },
      });
    });
  });
});
