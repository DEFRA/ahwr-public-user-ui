import { getSites } from "../../../api-requests/application-api.js";
import { submitNewClaim } from "../../../api-requests/claim-api.js";
import { JOURNEY } from "../../../constants/constants.js";
import { poultryClaimRoutes, poultryClaimViews } from "../../../constants/routes.js";
import { buildPoultryClaimPayload, buildPoultryRows } from "../../../lib/build-claim-data.js";
import { trackEvent } from "../../../logging/logger.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../session/index.js";

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.checkAnswers,
  options: {
    handler: async (request, h) => {
      const poultryClaimSession = getSessionData(request, sessionEntryKeys.poultryClaim);
      const organisation = getSessionData(request, sessionEntryKeys.organisation);
      const { herds } = await getSites(
        poultryClaimSession.latestPoultryApplication.reference,
        request.logger,
      );

      const rows = buildPoultryRows({ poultryClaimSession, organisation, herds });

      const rowsWithData = rows.filter((row) => row.value?.html !== undefined);

      return h.view(poultryClaimViews.checkAnswers, {
        listData: { rows: rowsWithData },
        backLink: poultryClaimRoutes.interview,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.checkAnswers,
  options: {
    handler: async (request, h) => {
      const poultryClaimSession = getSessionData(request, sessionEntryKeys.poultryClaim);
      const tempClaimReference = poultryClaimSession.reference;
      const claimPayload = buildPoultryClaimPayload(poultryClaimSession);
      const claim = await submitNewClaim(claimPayload, request.logger);

      await setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.reference,
        claim.reference,
      );
      await setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.amount,
        claim.data.amount,
      );
      await setSessionData(
        request,
        sessionEntryKeys.tempClaimReference,
        sessionKeys.tempClaimReference,
        tempClaimReference,
        { journey: JOURNEY.CLAIM },
      );

      trackEvent(
        request.logger,
        "submit-claim",
        `status: ${claim.status}, sbi:${getSessionData(request, sessionEntryKeys.organisation).sbi}`,
        {
          reference: `applicationReference: ${claimPayload.applicationReference}, claimReference: ${claim.reference}, tempClaimReference: ${claimPayload.reference}`,
        },
      );
      return h.redirect(poultryClaimRoutes.confirmation);
    },
  },
};

export const poultryCheckAnswersHandlers = [getHandler, postHandler];
