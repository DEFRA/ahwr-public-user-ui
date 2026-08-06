import { getClaimInfo } from "../../../../../app/routes/utils/get-claim-info.js";

describe("getClaimInfo", () => {
  const sheepReview = {
    type: "REVIEW",
    createdAt: "2025-04-28T00:00:00.000Z",
    data: {
      typeOfLivestock: "sheep",
      dateOfVisit: "2025-04-14T00:00:00.000Z",
    },
    herd: { id: "1" },
  };

  test("returns the species passed in", () => {
    expect(getClaimInfo([sheepReview], "sheep").species).toBe("sheep");
  });

  test("selects the most recent claim of the species by createdAt", () => {
    const olderSheepReview = {
      type: "REVIEW",
      createdAt: "2025-01-01T00:00:00.000Z",
      data: { typeOfLivestock: "sheep", dateOfVisit: "2024-12-20T00:00:00.000Z" },
    };

    const info = getClaimInfo([sheepReview, olderSheepReview], "sheep");

    expect(info.lastVisitDate).toBe("14 April 2025");
    expect(info.claimDate).toBe("28 April 2025");
  });

  test("ignores claims for other species", () => {
    const beefReview = {
      type: "REVIEW",
      createdAt: "2025-09-01T00:00:00.000Z",
      data: { typeOfLivestock: "beef", dateOfVisit: "2025-08-20T00:00:00.000Z" },
    };

    const info = getClaimInfo([sheepReview, beefReview], "sheep");

    expect(info.lastVisitDate).toBe("14 April 2025");
    expect(info.claimDate).toBe("28 April 2025");
  });

  test("maps a REVIEW claim type to 'Review'", () => {
    expect(getClaimInfo([sheepReview], "sheep").claimType).toBe("Review");
  });

  test("maps a non-review claim type to 'Endemics'", () => {
    const sheepFollowUp = {
      type: "FOLLOW_UP",
      createdAt: "2025-04-28T00:00:00.000Z",
      data: { typeOfLivestock: "sheep", dateOfVisit: "2025-04-14T00:00:00.000Z" },
      herd: { id: "2" },
    };

    expect(getClaimInfo([sheepFollowUp], "sheep").claimType).toBe("Endemics");
  });

  test("returns null claim details when no claim exists for the species", () => {
    const beefReview = {
      type: "REVIEW",
      createdAt: "2025-09-01T00:00:00.000Z",
      data: { typeOfLivestock: "beef", dateOfVisit: "2025-08-20T00:00:00.000Z" },
    };

    const info = getClaimInfo([beefReview], "sheep");

    expect(info).toEqual({
      species: "sheep",
      claimType: null,
      lastVisitDate: null,
      claimDate: null,
      herdId: null,
    });
  });

  test("returns null claim details when previousClaims is undefined", () => {
    const info = getClaimInfo(undefined, "sheep");

    expect(info).toEqual({
      species: "sheep",
      claimType: null,
      lastVisitDate: null,
      claimDate: null,
      herdId: null,
    });
  });
});
