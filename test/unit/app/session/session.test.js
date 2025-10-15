import {
  clearAllOfSession,
  clearApplyRedirect,
  sessionEntryKeys,
  sessionKeys,
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

  test("session entry keys should be an object representation of all of the object keys of sessionKeys", () => {
    const sessionKeysTopLevel = Object.keys(sessionKeys).sort();
    const sessionEntryKeysTopLevel = Object.keys(sessionEntryKeys).sort();

    expect(sessionEntryKeysTopLevel).toEqual(sessionKeysTopLevel);
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
});
