import { getSessionData, sessionEntryKeys, sessionKeys } from "../../session/index.js";
import { requestAuthorizationCodeUrl } from "../../auth/auth-code-grant/request-authorization-code-url.js";
import { config } from "../../config/index.js";
import { RPA_CONTACT_DETAILS } from "ffc-ahwr-common-library";
import { claimRoutes } from "../../constants/routes.js";
import { refreshApplications } from "../../lib/context-helper.js";

const { latestTermsAndConditionsUri } = config;

const getOrRefreshApplication = async (request, sbi) => {
  const latestPoultryApplication = getSessionData(
    request,
    sessionEntryKeys.poultryClaim,
    sessionKeys.poultryClaim.latestPoultryApplication,
  );

  if (!latestPoultryApplication) {
    const { latestPoultryApplication: updatedApplication } = await refreshApplications(
      sbi,
      request,
    );
    return updatedApplication;
  }

  return latestPoultryApplication;
};

export const poultryVetVisitsHandlers = [
  {
    method: "GET",
    path: "/poultry/vet-visits",
    options: {
      handler: async (request, h) => {
        const organisation = getSessionData(request, sessionEntryKeys.organisation);

        const attachedToMultipleBusinesses = getSessionData(
          request,
          sessionEntryKeys.customer,
          sessionKeys.customer.attachedToMultipleBusinesses,
        );

        const application = await getOrRefreshApplication(request, organisation.sbi);

        if (application.redacted) {
          return h.view("agreement-redacted", {
            ruralPaymentsAgency: RPA_CONTACT_DETAILS,
            privacyPolicyUri: config.privacyPolicyUri,
          });
        }

        const downloadedDocument = `/download-application/${organisation.sbi}/${application.reference}`;

        return h.view("poultry/vet-visits", {
          attachedToMultipleBusinesses,
          claimJourneyStartPointUri: claimRoutes.whichSpeciesPoultry,
          ...organisation,
          reference: application.reference,
          downloadedDocument,
          ...(attachedToMultipleBusinesses && {
            hostname: await requestAuthorizationCodeUrl(request),
          }),
          latestTermsAndConditionsUri,
        });
      },
    },
  },
];
