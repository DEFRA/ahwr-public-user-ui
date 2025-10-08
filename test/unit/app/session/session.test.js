import {
  clearAllOfSession,
  entries,
  getCustomer,
  getEndemicsClaim,
  getFarmerApplyData,
  getPkcecodes,
  getToken,
  setCustomer,
  setEndemicsClaim,
  setFarmerApplyData,
  setPkcecodes,
  setToken,
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

      const entryKeyValuePairs = Object.entries(entries);
      expect(yarMock.clear).toHaveBeenCalledTimes(entryKeyValuePairs.length);

      entryKeyValuePairs.forEach(([key, value]) => {
        expect(yarMock.clear).toHaveBeenCalledWith(value);
      });
    });
  });

  describe("EndemicsClaim", () => {
    test("set called with correct variables", () => {
      const request = { yar: yarMock, headers: { "x-forwarded-for": "1,2,3" } };
      setEndemicsClaim(request, "test key", "test value");
      expect(yarMock.set).toHaveBeenCalledWith("endemicsClaim", {
        "test key": "test value",
      });
    });

    test("get called with correct variables", () => {
      const request = { yar: yarMock, headers: { "x-forwarded-for": "1,2,3" } };
      getEndemicsClaim(request, "test key");
      expect(yarMock.get).toHaveBeenCalledWith("endemicsClaim");
    });
  });

  describe("FarmerApplyData", () => {
    test("set called with correct variables", () => {
      const request = { yar: yarMock, headers: { "x-forwarded-for": "1,2,3" } };
      setFarmerApplyData(request, "test key", "test value");
      expect(yarMock.set).toHaveBeenCalledWith("farmerApplyData", {
        "test key": "test value",
      });
    });

    test("get called with correct variables", () => {
      const request = { yar: yarMock, headers: { "x-forwarded-for": "1,2,3" } };
      getFarmerApplyData(request, "test key");
      expect(yarMock.get).toHaveBeenCalledWith("farmerApplyData");
    });
  });

  describe("Token", () => {
    test("set called with correct variables", () => {
      const request = { yar: yarMock, headers: { "x-forwarded-for": "1,2,3" } };
      setToken(request, "test key", 123);
      expect(yarMock.set).toHaveBeenCalledWith("tokens", { "test key": 123 });
    });

    test("get called with correct variables", () => {
      const request = { yar: yarMock, headers: { "x-forwarded-for": "1,2,3" } };
      getToken(request, "test key");
      expect(yarMock.get).toHaveBeenCalledWith("tokens");
    });
  });

  describe("Pkcecodes", () => {
    test("set called with correct variables", () => {
      const request = { yar: yarMock, headers: { "x-forwarded-for": "1,2,3" } };
      setPkcecodes(request, "test key", "test value");
      expect(yarMock.set).toHaveBeenCalledWith("pkcecodes", {
        "test key": "test value",
      });
    });

    test("get called with correct variables", () => {
      const request = { yar: yarMock, headers: { "x-forwarded-for": "1,2,3" } };
      getPkcecodes(request, "test key");
      expect(yarMock.get).toHaveBeenCalledWith("pkcecodes");
    });
  });

  describe("Customer", () => {
    test("set called with correct variables", () => {
      const request = { yar: yarMock, headers: { "x-forwarded-for": "1,2,3" } };
      setCustomer(request, "test key", "test value");
      expect(yarMock.set).toHaveBeenCalledWith("customer", {
        "test key": "test value",
      });
    });

    test("get called with correct variables", () => {
      const request = { yar: yarMock, headers: { "x-forwarded-for": "1,2,3" } };
      getCustomer(request, "test key");
      expect(yarMock.get).toHaveBeenCalledWith("customer");
    });
  });
});
