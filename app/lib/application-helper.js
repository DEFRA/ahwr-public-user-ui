import {
  APPLICATION_REFERENCE_PREFIX_NEW_WORLD,
  APPLICATION_REFERENCE_PREFIX_OLD_WORLD,
  APPLICATION_REFERENCE_PREFIX_POULTRY,
} from "ffc-ahwr-common-library";

import { getApplicationsBySbi } from "../api-requests/application-api.js";
import { areDatesWithin10Months } from "./utils.js";

const nonClaimableApplicationStatuses = new Set(["NOT_AGREED"]);

const isClaimableApplication = (application) =>
  !nonClaimableApplicationStatuses.has(application.status);

export const getLatestApplications = async (sbi, logger) => {
  const applications = await getApplicationsBySbi(sbi, logger);

  const latestEndemicsApplication = applications.find(
    (application) =>
      application.reference.startsWith(APPLICATION_REFERENCE_PREFIX_NEW_WORLD) &&
      isClaimableApplication(application),
  );

  const latestPoultryApplication = applications.find(
    (application) =>
      application.reference.startsWith(APPLICATION_REFERENCE_PREFIX_POULTRY) &&
      isClaimableApplication(application),
  );

  // get latest old world - if there isn't one, or it's not within 10 months of the new world one, then we won't consider it,
  // and thus return undefined
  const latestVetVisitApplication = applications.find((application) => {
    // endemics application must have been created within 10 months of vet-visit application visit date
    return (
      application.reference.startsWith(APPLICATION_REFERENCE_PREFIX_OLD_WORLD) &&
      areDatesWithin10Months(application.data?.visitDate, latestEndemicsApplication?.createdAt ?? 0)
    );
  });

  return { latestEndemicsApplication, latestPoultryApplication, latestVetVisitApplication };
};
