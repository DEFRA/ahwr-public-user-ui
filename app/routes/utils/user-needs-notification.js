import { config } from "../../config/index.js";

export const userNeedsNotification = (applications, claims) => {
  const releaseDate = new Date(config.multiSpecies.releaseDate).getTime();

  const [latestApplication] = applications;
  const appliedBeforeMultipleSpecies = Boolean(
    latestApplication && new Date(latestApplication.createdAt).getTime() < releaseDate,
  );

  const [latestClaim] = claims;
  const hasNotClaimedSinceMultipleSpecies = Boolean(
    latestClaim === undefined || new Date(latestClaim.createdAt).getTime() < releaseDate,
  );

  return appliedBeforeMultipleSpecies && hasNotClaimedSinceMultipleSpecies;
};
