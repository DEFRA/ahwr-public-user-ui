import { claimType as CLAIM_TYPE } from "ffc-ahwr-common-library";

export const getClaimInfo = (previousClaims, typeOfLivestock) => {
  let claimTypeText;
  let dateOfVisitText;
  let claimDateText;
  let herdIdentifier;

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

    claimTypeText = type === CLAIM_TYPE.review ? "Review" : "Endemics";
    dateOfVisitText = new Date(dateOfVisit).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    claimDateText = new Date(createdAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    herdIdentifier = id;
  }

  return {
    species: typeOfLivestock,
    claimType: claimTypeText,
    lastVisitDate: dateOfVisitText,
    claimDate: claimDateText,
    herdId: herdIdentifier,
  };
};
