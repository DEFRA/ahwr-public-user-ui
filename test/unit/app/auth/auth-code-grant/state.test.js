import { verifyState } from "../../../../../app/auth/auth-code-grant/state.js";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../../../../../app/session/index.js";
import { when } from "jest-when";

jest.mock("../../../../../app/config/index.js", () => {
  const actual = jest.requireActual("../../../../../app/config/index.js");
  return {
    ...actual,
    config: { ...actual.config, namespace: "test-namespace" },
  };
});

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
      query: { description: "No state", error: false, state: false },
      yar: { id: 1 },
      logger: { error: jest.fn() },
    };
    expect(verifyState(request)).toEqual(false);
  });

  test("state verify - no state in session", () => {
    const request = {
      query: {
        error: false,
        state: encodeState({ id: "b0a1c9d4-0000-4000-8000-000000000002", namespace: "ahwr" }),
      },
      yar: { id: 1 },
      logger: { error: jest.fn() },
    };
    when(getSessionData)
      .calledWith(request, sessionEntryKeys.tokens, sessionKeys.tokens.state)
      .mockReturnValue(undefined);

    expect(verifyState(request)).toEqual(false);
  });

  test("state verify - state id does not match session state id", () => {
    const request = {
      query: {
        error: false,
        state: encodeState({ id: "b0a1c9d4-0000-4000-8000-000000000003", namespace: "ahwr" }),
      },
      yar: { id: 1 },
      logger: { error: jest.fn() },
    };
    when(getSessionData)
      .calledWith(request, sessionEntryKeys.tokens, sessionKeys.tokens.state)
      .mockReturnValue(
        encodeState({ id: "b0a1c9d4-0000-4000-8000-000000000004", namespace: "ahwr" }),
      );

    expect(verifyState(request)).toEqual(false);
  });

  test("state verify - state id matches session state id", () => {
    const state = encodeState({
      id: "b0a1c9d4-0000-4000-8000-000000000005",
      namespace: "ahwr",
    });
    const request = {
      query: { error: false, state },
      yar: { id: 1 },
      logger: { error: jest.fn() },
    };
    when(getSessionData)
      .calledWith(request, sessionEntryKeys.tokens, sessionKeys.tokens.state)
      .mockReturnValue(state);

    expect(verifyState(request)).toEqual(true);
  });
});
