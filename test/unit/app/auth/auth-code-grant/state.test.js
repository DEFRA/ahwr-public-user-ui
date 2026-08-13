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

const encodeState = (state) => Buffer.from(JSON.stringify(state)).toString("base64");

describe("auth-code-grant state tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("state verify - no state", () => {
    const request = {
      query: {},
      yar: { id: 1 },
    };
    expect(() => verifyState(request)).toThrow("No state");
  });

  test("state verify - no session state", () => {
    const request = {
      query: {
        state: encodeState({ id: "b0a1c9d4-0000-4000-8000-000000000002", namespace: "ahwr" }),
      },
      yar: { id: 1 },
    };
    when(getSessionData)
      .calledWith(request, sessionEntryKeys.tokens, sessionKeys.tokens.state)
      .mockReturnValue(undefined);

    expect(() => verifyState(request)).toThrow("No session state");
  });

  test("state verify - state id does not match session state id", () => {
    const request = {
      query: {
        state: encodeState({ id: "b0a1c9d4-0000-4000-8000-000000000003", namespace: "ahwr" }),
      },
      yar: { id: 1 },
    };
    when(getSessionData)
      .calledWith(request, sessionEntryKeys.tokens, sessionKeys.tokens.state)
      .mockReturnValue(
        encodeState({ id: "b0a1c9d4-0000-4000-8000-000000000004", namespace: "ahwr" }),
      );

    expect(() => verifyState(request)).toThrow("State id does not match");
  });

  test("state verify - not base64", () => {
    const request = {
      query: {
        state: "blahblahblah",
      },
      yar: { id: 1 },
    };

    expect(() => verifyState(request)).toThrow();
  });

  test("state verify - state id matches session state id", () => {
    const state = encodeState({
      id: "b0a1c9d4-0000-4000-8000-000000000005",
      namespace: "ahwr",
    });
    const request = {
      query: { state },
      yar: { id: 1 },
    };
    when(getSessionData)
      .calledWith(request, sessionEntryKeys.tokens, sessionKeys.tokens.state)
      .mockReturnValue(state);

    expect(verifyState(request)).toEqual(true);
  });
});
