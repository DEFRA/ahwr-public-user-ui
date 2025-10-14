import { verifyState } from "../../../../../app/auth/auth-code-grant/state.js";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../../../../../app/session/index.js";
import { when } from "jest-when";

jest.mock("../../../../../app/session", () => {
  const actual = jest.requireActual("../../../../../app/session");
  // Mocking everything apart from sessionKeys and sessionEntryKeys
  const mocked = Object.keys(actual).reduce((acc, key) => {
    acc[key] = key === "sessionKeys" || key === "sessionEntryKeys" ? actual[key] : jest.fn();
    return acc;
  }, {});
  return mocked;
});

when(getSessionData)
  .calledWith(expect.anything(), sessionEntryKeys.tokens, sessionKeys.tokens.accessToken)
  .mockReturnValue("access-token");

describe("auth-code-grant state tests", () => {
  test("state verify - query error", () => {
    const request = {
      query: { description: "Error", error: true },
      yar: { id: 1 },
      logger: { setBindings: jest.fn() },
    };
    expect(verifyState(request)).toEqual(false);
  });

  test("state verify - no state", () => {
    const request = {
      query: { description: "No state", error: false, state: false },
      yar: { id: 1 },
      logger: { setBindings: jest.fn() },
    };
    expect(verifyState(request)).toEqual(false);
  });
});
