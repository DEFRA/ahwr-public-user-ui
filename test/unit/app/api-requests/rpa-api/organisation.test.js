import {
  getOrganisation,
  getOrganisationAuthorisation,
  getOrganisationRole,
  organisationHasPermission,
} from "../../../../../app/api-requests/rpa-api/organisation.js";
import { sendRPAGetRequest } from "../../../../../app/api-requests/rpa-api/send-get-request.js";

const mockLogger = {
  error: jest.fn(),
};

jest.mock("../../../../../app/api-requests/rpa-api/send-get-request.js");
jest.mock("../../../../../app/config/auth.js", () => ({
  authConfig: {
    ruralPaymentsAgency: {
      getOrganisationPermissionsUrl: "https://rpa.api/organisations/organisationId/permissions",
      getOrganisationUrl: "https://rpa.api/organisations/organisationId",
    },
  },
}));

describe("organisation API", () => {
  describe("getOrganisationRole", () => {
    test('returns "Admin" when person has admin role', () => {
      const result = getOrganisationRole({
        organisationAuthorisation: {
          personRoles: [
            { personId: "12345", role: "Admin" },
            { personId: "67890", role: "User" },
          ],
        },
        personId: "12345",
        logger: mockLogger,
      });

      expect(result).toEqual("Admin");
    });
    test("returns undefined when person ID not found", () => {
      const result = getOrganisationRole({
        organisationAuthorisation: {
          personRoles: [
            { personId: "12345", role: "Admin" },
            { personId: "67890", role: "User" },
          ],
        },
        personId: "54321",
        logger: mockLogger,
      });

      expect(result).toBeUndefined();
    });
    test("returns null when error encountered", () => {
      const result = getOrganisationRole({
        organisationAuthorisation: {},
        personId: "54321",
        logger: mockLogger,
      });

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
  describe("organisationHasPermission", () => {
    test("returns true when person has appropriate role", () => {
      const result = organisationHasPermission({
        organisationAuthorisation: {
          personPrivileges: [
            { personId: "12345", privilegeNames: ["Full permission - business"] },
            { personId: "67890", privilegeNames: ["Read only"] },
          ],
        },
        personId: "12345",
      });

      expect(result).toBeTruthy();
    });
    test("returns true when person has multiple appropriate roles", () => {
      const result = organisationHasPermission({
        organisationAuthorisation: {
          personPrivileges: [
            { personId: "12345", privilegeNames: ["Full permission - business", "Submit - bps"] },
            { personId: "67890", privilegeNames: ["Read only"] },
          ],
        },
        personId: "12345",
      });

      expect(result).toBeTruthy();
    });
    test("returns false when person does not have appropriate role", () => {
      const result = getOrganisationRole({
        organisationAuthorisation: {
          personPrivileges: [
            { personId: "12345", privilegeNames: ["Read only"] },
            { personId: "67890", privilegeNames: ["Read only"] },
          ],
        },
        personId: "54321",
        logger: mockLogger,
      });

      expect(result).toBeFalsy();
    });
    test("returns false when person not found", () => {
      const result = getOrganisationRole({
        organisationAuthorisation: {
          personPrivileges: [{ personId: "67890", privilegeNames: ["Read only"] }],
        },
        personId: "54321",
        logger: mockLogger,
      });

      expect(result).toBeFalsy();
    });
    test("returns false when person has appropriate role, along with another that is not appropriate", () => {
      // TODO: Current implementation of organisationHasPermission would return false in this case
      // However not convinced that is actually correct, need to check this with RPA team
      const result = getOrganisationRole({
        organisationAuthorisation: {
          personPrivileges: [
            { personId: "12345", privilegeNames: ["Submit - bps", "File paperwork"] },
            { personId: "67890", privilegeNames: ["Read only"] },
          ],
        },
        personId: "54321",
        logger: mockLogger,
      });

      expect(result).toBeFalsy();
    });
  });
  describe("getOrganisation", () => {
    test("calls through to send an RPA request and returns the data", async () => {
      sendRPAGetRequest.mockResolvedValueOnce({ _data: "some data" });

      const result = await getOrganisation({
        apimAccessToken: "abc123",
        organisationId: "12345",
        defraIdAccessToken: "def456",
      });
      expect(result).toEqual("some data");
      expect(sendRPAGetRequest).toHaveBeenCalledWith({
        defraIdAccessToken: "def456",
        headers: { Authorization: "abc123" },
        url: "https://rpa.api/organisations/12345",
      });
    });
  });
  describe("getOrganisationAuthorisation", () => {
    test("calls through to send an RPA request and returns the data", async () => {
      sendRPAGetRequest.mockResolvedValueOnce({ data: "some data" });

      const result = await getOrganisationAuthorisation({
        apimAccessToken: "abc123",
        organisationId: "12345",
        defraIdAccessToken: "def456",
      });
      expect(result).toEqual("some data");
      expect(sendRPAGetRequest).toHaveBeenCalledWith({
        defraIdAccessToken: "def456",
        headers: { Authorization: "abc123" },
        url: "https://rpa.api/organisations/12345/permissions",
      });
    });
  });
});
