import { config } from "../../config/index.js";

export const showMultiHerdsBanner = (applications, claims) => {
  const releaseDate = new Date(config.multiHerds.releaseDate).getTime();

  const [latestApplication] = applications;
  const appliedBeforeMultipleHerds = Boolean(
    latestApplication && new Date(latestApplication.createdAt).getTime() < releaseDate,
  );

  const [latestClaim] = claims;
  const hasNotClaimedSinceMultipleHerds = Boolean(
    latestClaim === undefined || new Date(latestClaim.createdAt).getTime() < releaseDate,
  );

  return appliedBeforeMultipleHerds && hasNotClaimedSinceMultipleHerds;
};
