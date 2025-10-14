import { applicationType, userType } from "../constants/constants.js";
import { getLatestApplication, isWithin10Months } from "../lib/utils.js";

export function getUserTypeByApplication(latestApplicationsForSbi) {
  const oldWorldApplications = latestApplicationsForSbi.filter(
    (application) => application.type === applicationType.VET_VISITS,
  );

  if (oldWorldApplications.length === 0) {
    return userType.NEW_USER;
  }

  const latestApplication = getLatestApplication(latestApplicationsForSbi);
  const latestApplicationWithinLastTenMonths = isWithin10Months(latestApplication.data.visitDate);

  const closedStatuses = ["WITHDRAWN", "REJECTED", "NOT_AGREED"];

  if (closedStatuses.includes(latestApplication.status) || !latestApplicationWithinLastTenMonths) {
    return userType.NEW_USER;
  }

  return userType.EXISTING_USER;
}
