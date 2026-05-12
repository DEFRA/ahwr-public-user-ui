import { getLatestApplications } from "./application-helper.js";
import { getApplicationsBySbi } from "../api-requests/application-api.js";

jest.mock("../api-requests/application-api.js");

describe("getLatestApplications", () => {
  const mockLogger = {};

  it("returns new world application and relevant old world application", async () => {
    const newWorld = {
      type: "EE",
      reference: "IAHW-1111-2222",
      createdAt: "2025-05-01T00:00:00.000Z",
    };
    const oldWorld = {
      type: "VV",
      reference: "AHWR-1111-2222",
      data: {
        visitDate: "2025-04-15T00:00:00.000Z",
      },
    };
    getApplicationsBySbi.mockResolvedValueOnce([newWorld, oldWorld]);

    const { latestEndemicsApplication, latestVetVisitApplication } = await getLatestApplications(
      "123456789",
      mockLogger,
    );

    expect(latestEndemicsApplication.reference).toBe("IAHW-1111-2222");
    expect(latestVetVisitApplication.reference).toBe("AHWR-1111-2222");
  });

  it("returns new world application and ignores not relevant old world application", async () => {
    const newWorld = {
      type: "EE",
      reference: "IAHW-1111-2222",
      createdAt: "2025-05-01T00:00:00.000Z",
    };
    const oldWorld = {
      type: "VV",
      reference: "AHWR-1111-2222",
      data: {
        visitDate: "2023-04-15T00:00:00.000Z",
      },
    };
    getApplicationsBySbi.mockResolvedValueOnce([newWorld, oldWorld]);

    const { latestEndemicsApplication, latestVetVisitApplication } = await getLatestApplications(
      "123456789",
      mockLogger,
    );

    expect(latestEndemicsApplication.reference).toBe("IAHW-1111-2222");
    expect(latestVetVisitApplication).toBeUndefined();
  });

  it("returns new world application when no old world application", async () => {
    const newWorld = {
      type: "EE",
      reference: "IAHW-1111-2222",
      createdAt: "2025-05-01T00:00:00.000Z",
    };
    getApplicationsBySbi.mockResolvedValueOnce([newWorld]);

    const { latestEndemicsApplication, latestVetVisitApplication } = await getLatestApplications(
      "123456789",
      mockLogger,
    );

    expect(latestEndemicsApplication.reference).toBe("IAHW-1111-2222");
    expect(latestVetVisitApplication).toBeUndefined();
  });

  it("returns nothing when old world application only", async () => {
    const oldWorld = {
      type: "VV",
      reference: "AHWR-1111-2222",
      data: {
        visitDate: "2023-04-15T00:00:00.000Z",
      },
    };
    getApplicationsBySbi.mockResolvedValueOnce([oldWorld]);

    const { latestEndemicsApplication, latestVetVisitApplication } = await getLatestApplications(
      "123456789",
      mockLogger,
    );

    expect(latestEndemicsApplication).toBeUndefined();
    expect(latestVetVisitApplication).toBeUndefined();
  });

  it("returns poultry application", async () => {
    const poultry = {
      type: "POUL",
      reference: "POUL-1111-2222",
      createdAt: "2025-05-01T00:00:00.000Z",
    };
    const newWorld = {
      type: "EE",
      reference: "IAHW-1111-2222",
      createdAt: "2025-05-01T00:00:00.000Z",
    };
    const oldWorld = {
      type: "VV",
      reference: "AHWR-1111-2222",
      data: {
        visitDate: "2023-04-15T00:00:00.000Z",
      },
    };
    getApplicationsBySbi.mockResolvedValueOnce([newWorld, oldWorld, poultry]);

    const { latestPoultryApplication, latestEndemicsApplication, latestVetVisitApplication } =
      await getLatestApplications("123456789", mockLogger);

    expect(latestEndemicsApplication.reference).toBe("IAHW-1111-2222");
    expect(latestPoultryApplication.reference).toBe("POUL-1111-2222");
    expect(latestVetVisitApplication).toBeUndefined();
  });

  it("excludes NOT_AGREED poultry applications when selecting latestPoultryApplication", async () => {
    const rejectedPoultry = {
      type: "POUL",
      reference: "POUL-1111-2222",
      createdAt: "2026-04-29T00:00:00.000Z",
      status: "NOT_AGREED",
    };
    getApplicationsBySbi.mockResolvedValueOnce([rejectedPoultry]);

    const { latestPoultryApplication } = await getLatestApplications("123456789", mockLogger);

    expect(latestPoultryApplication).toBeUndefined();
  });

  it("prefers an AGREED poultry application over a more recent NOT_AGREED poultry application", async () => {
    const rejectedPoultry = {
      type: "POUL",
      reference: "POUL-9999-9999",
      createdAt: "2026-04-29T00:00:00.000Z",
      status: "NOT_AGREED",
    };
    const agreedPoultry = {
      type: "POUL",
      reference: "POUL-1111-2222",
      createdAt: "2026-01-15T00:00:00.000Z",
      status: "AGREED",
    };
    // rejected first to mimic typical date-desc ordering returned by the backend
    getApplicationsBySbi.mockResolvedValueOnce([rejectedPoultry, agreedPoultry]);

    const { latestPoultryApplication } = await getLatestApplications("123456789", mockLogger);

    expect(latestPoultryApplication.reference).toBe("POUL-1111-2222");
  });

  it("excludes NOT_AGREED endemics applications when selecting latestEndemicsApplication", async () => {
    const rejectedEndemics = {
      type: "EE",
      reference: "IAHW-1111-2222",
      createdAt: "2026-04-29T00:00:00.000Z",
      status: "NOT_AGREED",
    };
    getApplicationsBySbi.mockResolvedValueOnce([rejectedEndemics]);

    const { latestEndemicsApplication } = await getLatestApplications("123456789", mockLogger);

    expect(latestEndemicsApplication).toBeUndefined();
  });

  it("prefers an AGREED endemics application over a more recent NOT_AGREED endemics application", async () => {
    const rejectedEndemics = {
      type: "EE",
      reference: "IAHW-9999-9999",
      createdAt: "2026-04-29T00:00:00.000Z",
      status: "NOT_AGREED",
    };
    const agreedEndemics = {
      type: "EE",
      reference: "IAHW-1111-2222",
      createdAt: "2026-01-15T00:00:00.000Z",
      status: "AGREED",
    };
    getApplicationsBySbi.mockResolvedValueOnce([rejectedEndemics, agreedEndemics]);

    const { latestEndemicsApplication } = await getLatestApplications("123456789", mockLogger);

    expect(latestEndemicsApplication.reference).toBe("IAHW-1111-2222");
  });

  it("filters poultry and endemics independently", async () => {
    const rejectedPoultry = {
      type: "POUL",
      reference: "POUL-9999-9999",
      createdAt: "2026-04-29T00:00:00.000Z",
      status: "NOT_AGREED",
    };
    const agreedEndemics = {
      type: "EE",
      reference: "IAHW-1111-2222",
      createdAt: "2026-01-15T00:00:00.000Z",
      status: "AGREED",
    };
    getApplicationsBySbi.mockResolvedValueOnce([rejectedPoultry, agreedEndemics]);

    const { latestPoultryApplication, latestEndemicsApplication } = await getLatestApplications(
      "123456789",
      mockLogger,
    );

    expect(latestPoultryApplication).toBeUndefined();
    expect(latestEndemicsApplication.reference).toBe("IAHW-1111-2222");
  });

  it("returns AGREED applications unchanged when no NOT_AGREED is present", async () => {
    const agreedEndemics = {
      type: "EE",
      reference: "IAHW-1111-2222",
      createdAt: "2026-01-15T00:00:00.000Z",
      status: "AGREED",
    };
    const agreedPoultry = {
      type: "POUL",
      reference: "POUL-1111-2222",
      createdAt: "2026-01-15T00:00:00.000Z",
      status: "AGREED",
    };
    getApplicationsBySbi.mockResolvedValueOnce([agreedEndemics, agreedPoultry]);

    const { latestEndemicsApplication, latestPoultryApplication } = await getLatestApplications(
      "123456789",
      mockLogger,
    );

    expect(latestEndemicsApplication).toBe(agreedEndemics);
    expect(latestPoultryApplication).toBe(agreedPoultry);
  });

  it("resolves latestVetVisitApplication against the AGREED endemics application's createdAt, ignoring a more recent NOT_AGREED one", async () => {
    const oldWorldVisitDate = "2025-04-15T00:00:00.000Z";
    const dateWithinTenMonthsOfOldWorldVisit = "2025-09-01T00:00:00.000Z";
    const dateBeyondTenMonthsOfOldWorldVisit = "2026-05-01T00:00:00.000Z";
    const rejectedEndemics = {
      type: "EE",
      reference: "IAHW-9999-9999",
      createdAt: dateBeyondTenMonthsOfOldWorldVisit,
      status: "NOT_AGREED",
    };
    const agreedEndemics = {
      type: "EE",
      reference: "IAHW-1111-2222",
      createdAt: dateWithinTenMonthsOfOldWorldVisit,
      status: "AGREED",
    };
    const oldWorld = {
      type: "VV",
      reference: "AHWR-1111-2222",
      data: {
        visitDate: oldWorldVisitDate,
      },
    };
    getApplicationsBySbi.mockResolvedValueOnce([rejectedEndemics, agreedEndemics, oldWorld]);

    const { latestEndemicsApplication, latestVetVisitApplication } = await getLatestApplications(
      "123456789",
      mockLogger,
    );

    expect(latestEndemicsApplication.reference).toBe("IAHW-1111-2222");
    expect(latestVetVisitApplication.reference).toBe("AHWR-1111-2222");
  });
});
