import { MULTIPLE_HERDS_RELEASE_DATE } from "../../constants/claim-constants";

export const showMultiHerdsBanner = (application, claims) => {
  const releaseDate = MULTIPLE_HERDS_RELEASE_DATE.getTime();

  const appliedBeforeMultipleHerds = Boolean(
    new Date(application.createdAt).getTime() < releaseDate,
  );

  const [latestClaim] = claims;
  const hasNotClaimedSinceMultipleHerds = Boolean(
    latestClaim === undefined || new Date(latestClaim.createdAt).getTime() < releaseDate,
  );

  return appliedBeforeMultipleHerds && hasNotClaimedSinceMultipleHerds;
};
