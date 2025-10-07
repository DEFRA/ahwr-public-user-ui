import { requestAuthorizationCodeUrl } from "../../../../app/auth/auth-code-grant/request-authorization-code-url.js";
import { authenticate } from "../../../../app/auth/authenticate.js";
import { verifyState } from "../../../../app/auth/auth-code-grant/state.js";

jest.mock("../../../../app/session");
jest.mock("../../../../app/auth/auth-code-grant/state");

jest.mock("applicationinsights", () => ({
  defaultClient: { trackException: jest.fn() },
  dispose: jest.fn(),
}));

describe("Generate authentication url test", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("requestAuthorizationCodeUrl sets a code challenge parameter", async () => {
    const result = requestAuthorizationCodeUrl();
    const params = new URL(result).searchParams;
    expect(params.get("code_challenge")).not.toBeNull();
  });

  test("when invalid state occurs", async () => {
    verifyState.mockReturnValueOnce(false);
    const request = { yar: { id: "33" }, logger: { setBindings: jest.fn() } };
    const mockLogger = {
      setBindings: jest.fn(),
    };
    const mockRedirect = jest.fn();
    const mockH = {
      redirect: mockRedirect,
    };

    await authenticate(request, mockH, mockLogger);
    expect(mockRedirect).toHaveBeenCalled();
  });
});
