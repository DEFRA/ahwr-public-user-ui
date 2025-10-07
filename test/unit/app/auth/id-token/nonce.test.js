import { generate, verify } from "../../../../../app/auth/id-token/nonce.js";
import { sessionKeys } from "../../../../../app/session/keys.js";
import { getToken, setToken } from "../../../../../app/session/index.js";

jest.mock("node:crypto", () => ({
  randomUUID: jest.fn(),
}));

jest.mock("../../../../../app/session", () => ({
  setToken: jest.fn(),
  getToken: jest.fn(),
}));
const { randomUUID } = require("node:crypto");

describe("Nonce handling", () => {
  const mockNonce = "uuid-nonce";
  const request = {};
  const idToken = { nonce: mockNonce };

  beforeEach(() => {
    randomUUID.mockReturnValueOnce(mockNonce);
    setToken.mockClear();
    getToken.mockClear();
  });

  describe("generate", () => {
    test("should generate a nonce and store it in the session", () => {
      const nonce = generate(request);

      expect(randomUUID).toHaveBeenCalled();
      expect(setToken).toHaveBeenCalledWith(request, sessionKeys.tokens.nonce, mockNonce);
      expect(nonce).toBe(mockNonce);
    });
  });

  describe("verify", () => {
    test("should throw an error if idToken is undefined", () => {
      expect(() => verify(request)).toThrow("Empty id_token");
    });

    test("should throw an error if session contains no nonce", () => {
      getToken.mockReturnValueOnce(null);
      expect(() => verify(request, idToken)).toThrow("HTTP Session contains no nonce");
    });

    test("should throw an error if nonce does not match", () => {
      getToken.mockReturnValueOnce("different-nonce");
      expect(() => verify(request, idToken)).toThrow("Nonce mismatch");
    });

    test("should not throw an error if nonce matches", () => {
      getToken.mockReturnValueOnce(mockNonce);
      expect(() => verify(request, idToken)).not.toThrow();
    });
  });
});
