import { config } from "../../../../app/config/index.js";
import { getFarmerApplyData } from "../../../../app/session/index.js";
import { maybeSuffixLoginRedirectUrl } from "../../../../app/lib/suffix-url.js";

jest.mock("../../../../app/session/index.js");

describe("maybeSuffixLoginRedirectUrl", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("appends session details to url if development mode and session contains flag", async () => {
    config.isDev = true;
    getFarmerApplyData.mockReturnValueOnce("true");
    getFarmerApplyData.mockReturnValueOnce({
      organisation: { name: "Test Org" },
      crn: "1234567890",
      customerId: "cust-12345",
    });

    const request = {};

    const result = maybeSuffixLoginRedirectUrl(request, "/somewhere", "1234567890", "cust-12345");

    expect(result).toMatch(/\/somewhere\?org=\w+&crn=1234567890&custId=cust-12345/);
  });

  test("returns unchanged url if not in development mode", async () => {
    config.isDev = false;
    getFarmerApplyData.mockReturnValueOnce("true");

    const request = {};

    const result = maybeSuffixLoginRedirectUrl(request, "/somewhere", "1234567890", "cust-12345");

    expect(result).toBe("/somewhere");
  });

  test("returns unchanged url if no flag set", async () => {
    config.isDev = true;
    getFarmerApplyData.mockReturnValueOnce(undefined);
    getFarmerApplyData.mockReturnValueOnce({
      organisation: { name: "Test Org" },
      crn: "1234567890",
      customerId: "cust-12345",
    });

    const request = {};

    const result = maybeSuffixLoginRedirectUrl(request, "/somewhere", "1234567890", "cust-12345");

    expect(result).toBe("/somewhere");
  });
});
