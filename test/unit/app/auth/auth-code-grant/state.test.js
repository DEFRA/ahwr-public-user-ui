import { verifyState } from "../../../../../app/auth/auth-code-grant/state.js";
import { getToken } from "../../../../../app/session/index.js";
jest.mock("../../../../../app/session/index");

describe("auth-code-grant state tests", () => {
  test("state verify - query error", () => {
    getToken.mockResolvedValueOnce("access-token");

    const request = {
      query: { description: "Error", error: true },
      yar: { id: 1 },
      logger: { setBindings: jest.fn() },
    };
    expect(verifyState(request)).toEqual(false);
  });

  test("state verify - no state", () => {
    getToken.mockResolvedValueOnce("access-token");

    const request = {
      query: { description: "No state", error: false, state: false },
      yar: { id: 1 },
      logger: { setBindings: jest.fn() },
    };
    expect(verifyState(request)).toEqual(false);
  });
});
