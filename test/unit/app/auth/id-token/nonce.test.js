import { generate, verify } from "../../../../../app/auth/id-token/nonce.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../../../app/session/index.js";
import { randomUUID } from "node:crypto";
import { when } from "jest-when";

jest.mock("node:crypto", () => ({
  randomUUID: jest.fn(),
}));

jest.mock("../../../../../app/session", () => {
  const actual = jest.requireActual("../../../../../app/session");
  // Mocking everything apart from sessionKeys and sessionEntryKeys
  const mocked = Object.keys(actual).reduce((acc, key) => {
    acc[key] = key === "sessionKeys" || key === "sessionEntryKeys" ? actual[key] : jest.fn();
    return acc;
  }, {});
  return mocked;
});

describe("Nonce handling", () => {
  const mockNonce = "uuid-nonce";
  const request = {};
  const idToken = { nonce: mockNonce };

  beforeEach(() => {
    randomUUID.mockReturnValueOnce(mockNonce);
    jest.clearAllMocks();
  });

  describe("generate", () => {
    test("should generate a nonce and store it in the session", async () => {
      const nonce = await generate(request);

      expect(randomUUID).toHaveBeenCalled();
      expect(setSessionData).toHaveBeenCalledWith(
        request,
        sessionEntryKeys.tokens,
        sessionKeys.tokens.nonce,
        mockNonce,
      );
      expect(nonce).toBe(mockNonce);
    });
  });

  describe("verify", () => {
    test("should throw an error if idToken is undefined", () => {
      expect(() => verify(request)).toThrow("Empty id_token");
    });

    test("should throw an error if session contains no nonce", () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.tokens, sessionKeys.tokens.nonce)
        .mockReturnValue(null);
      expect(() => verify(request, idToken)).toThrow("HTTP Session contains no nonce");
    });

    test("should throw an error if nonce does not match", () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.tokens, sessionKeys.tokens.nonce)
        .mockReturnValue("different-nonce");
      expect(() => verify(request, idToken)).toThrow("Nonce mismatch");
    });

    test("should not throw an error if nonce matches", () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.tokens, sessionKeys.tokens.nonce)
        .mockReturnValue(mockNonce);
      expect(() => verify(request, idToken)).not.toThrow();
    });
  });
});
