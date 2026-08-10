import { claimType as CLAIM_TYPE } from "ffc-ahwr-common-library";

export const getClaimInfo = (previousClaims, typeOfLivestock) => {
  const previousClaimsForSpecies = previousClaims?.filter(
    (claim) => claim.data.typeOfLivestock === typeOfLivestock,
  );

  if (previousClaimsForSpecies && previousClaimsForSpecies.length > 0) {
    const {
      createdAt,
      type,
      data: { dateOfVisit },
      herd: { id },
    } = previousClaimsForSpecies.reduce((latest, claim) => {
      return claim.createdAt > latest.createdAt ? claim : latest;
    });

    const claimTypeText = type === CLAIM_TYPE.review ? "Review" : "Endemics";
    const dateOfVisitText = new Date(dateOfVisit).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const claimDateText = new Date(createdAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const herdIdentifier = id;

    return {
      species: typeOfLivestock,
      claimType: claimTypeText,
      lastVisitDate: dateOfVisitText,
      claimDate: claimDateText,
      herdId: herdIdentifier,
    };
  } else {
    return {
      species: typeOfLivestock,
      claimType: null,
      lastVisitDate: null,
      claimDate: null,
      herdId: null,
    };
  }
};
