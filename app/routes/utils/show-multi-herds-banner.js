import { config } from "../../config/index.js";

export const showMultiHerdsBanner = (application, claims) => {
  const releaseDate = new Date(config.multiHerds.releaseDate).getTime();

  const appliedBeforeMultipleHerds = Boolean(
    new Date(application.createdAt).getTime() < releaseDate,
  );

  const [latestClaim] = claims;
  const hasNotClaimedSinceMultipleHerds = Boolean(
    latestClaim === undefined || new Date(latestClaim.createdAt).getTime() < releaseDate,
  );

  return appliedBeforeMultipleHerds && hasNotClaimedSinceMultipleHerds;
};
