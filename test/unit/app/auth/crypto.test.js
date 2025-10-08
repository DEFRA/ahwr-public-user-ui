import { generateCodeChallenge } from "../../../../app/auth/auth-code-grant/proof-key-for-code-exchange.js";
import { setPkcecodes } from "../../../../app/session/index.js";

jest.mock("../../../../app/session", () => ({
  setPkcecodes: jest.fn(),
}));

describe("generateCodeChallenge", () => {
  test("when createCryptoProvider verifier value set in session", async () => {
    const result = generateCodeChallenge(undefined);
    expect(result).not.toBeNull();
    expect(setPkcecodes).toHaveBeenCalledWith(undefined, "verifier", expect.anything());
  });
});
