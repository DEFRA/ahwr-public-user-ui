import { getAllClaimsForFirstHerd } from "../../../../app/lib/claim-helper.js";

describe("getAllClaimsForFirstHerd", () => {
  it("returns beef review when creating a beef follow-up, even if earlier sheep review (with herd) exists", () => {
    const previousClaims = [sheepReview, beefReview, sheepFollowUp];
    const typeOfLivestock = "beef";

    const claims = getAllClaimsForFirstHerd(previousClaims, typeOfLivestock);

    expect(claims).toContain(beefReview);
  });

  const sheepReview = {
    createdAt: new Date("2025-01-01T12:00:00.000Z"),
    data: {
      typeOfLivestock: "sheep",
      dateOfVisit: "2025-01-01T12:00:00.000Z",
    },
    herd: {
      // this herd was added when follow-up created
      id: "fake-id",
    },
  };
  const sheepFollowUp = {
    createdAt: new Date("2026-01-01T12:00:00.000Z"),
    data: {
      typeOfLivestock: "sheep",
      dateOfVisit: "2026-01-01T12:00:00.000Z",
    },
    herd: {
      id: "fake-id",
    },
  };
  const beefReview = {
    createdAt: new Date("2025-03-01T12:00:00.000Z"),
    data: {
      typeOfLivestock: "beef",
      dateOfVisit: "2025-03-01T12:00:00.000Z",
    },
  };
});
