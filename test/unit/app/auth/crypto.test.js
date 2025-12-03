import { generateCodeChallenge } from "../../../../app/auth/auth-code-grant/proof-key-for-code-exchange.js";
import { sessionEntryKeys, sessionKeys, setSessionData } from "../../../../app/session/index.js";

jest.mock("../../../../app/session", () => {
  const actual = jest.requireActual("../../../../app/session");
  // Mocking everything apart from sessionKeys and sessionEntryKeys
  const mocked = Object.keys(actual).reduce((acc, key) => {
    acc[key] = key === "sessionKeys" || key === "sessionEntryKeys" ? actual[key] : jest.fn();
    return acc;
  }, {});
  return mocked;
});

describe("generateCodeChallenge", () => {
  test("when createCryptoProvider verifier value set in session", async () => {
    const mockRequest = {
      logger: {
        error: jest.fn(),
      },
    };
    const result = await generateCodeChallenge(mockRequest);
    expect(result).toEqual(expect.any(String));
    expect(setSessionData).toHaveBeenCalledWith(
      mockRequest,
      sessionEntryKeys.pkcecodes,
      sessionKeys.pkcecodes.verifier,
      expect.any(String),
    );
  });
});
