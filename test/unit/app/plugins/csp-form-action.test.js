import { buildFormActionSources } from "../../../../app/plugins/content-security-policy.js";

describe("form-action sources", () => {
  const defraId = {
    tenantName: "dcidm",
    hostname: "https://dcidm.b2clogin.com/dcidm.onmicrosoft.com",
  };

  test("allows the Defra ID origin for the configured tenant", () => {
    expect(buildFormActionSources(defraId)).toEqual(["self", "https://dcidm.b2clogin.com"]);
  });

  test("allows the Defra ID origin without the tenant path segment", () => {
    expect(buildFormActionSources(defraId)).not.toContainEqual(
      expect.stringContaining("onmicrosoft.com"),
    );
  });

  test("allows self only when no Defra ID tenant is configured", () => {
    expect(buildFormActionSources({ ...defraId, tenantName: undefined })).toEqual(["self"]);
  });
});
