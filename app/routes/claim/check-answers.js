import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../session/index.js";
import { claimRoutes, claimViews } from "../../constants/routes.js";
import { upperFirstLetter } from "../../lib/display-helpers.js";
import { getLivestockTypes, getReviewType } from "../../lib/utils.js";
import { submitNewClaim } from "../../api-requests/claim-api.js";
import { isMultipleHerdsUserJourney } from "../../lib/context-helper.js";
import { buildClaimPayload, buildRows, collateRows } from "../../lib/build-claim-data.js";

const getBackLink = (isReview, isSheep) => {
  if (isReview) {
    return isSheep ? claimRoutes.testUrn : claimRoutes.testResults;
  }

  return isSheep ? claimRoutes.sheepTestResults : claimRoutes.biosecurity;
};

const getNoChangeRows = ({ isReview, isPigs, isSheep, organisationName, endemicsClaimSession }) => {
  const { dateOfVisit, typeOfLivestock, herdName, agreementFlags } = endemicsClaimSession;

  return [
    {
      key: { text: "Business name" },
      value: { html: upperFirstLetter(organisationName) },
    },
    {
      key: {
        text: isMultipleHerdsUserJourney(dateOfVisit, agreementFlags) ? "Species" : "Livestock",
      },
      value: {
        html: upperFirstLetter(isPigs || isSheep ? typeOfLivestock : `${typeOfLivestock} cattle`),
      },
    },
    ...(isMultipleHerdsUserJourney(dateOfVisit, agreementFlags)
      ? [getHerdNameRow(herdName, typeOfLivestock)]
      : []),
    {
      key: { text: "Review or follow-up" },
      value: {
        html: isReview ? "Animal health and welfare review" : "Endemic disease follow-up",
      },
    },
  ];
};

const getHerdNameRow = (herdName, typeOfLivestock) => {
  return {
    key: { text: `${typeOfLivestock === "sheep" ? "Flock" : "Herd"} name` },
    value: { html: herdName },
  };
};

const getHandler = {
  method: "GET",
  path: claimRoutes.checkAnswers,
  options: {
    handler: async (request, h) => {
      const endemicsClaimSession = getSessionData(request, sessionEntryKeys.endemicsClaim);
      const organisation = getSessionData(request, sessionEntryKeys.organisation);
      const { isBeef, isDairy, isPigs, isSheep } = getLivestockTypes(
        endemicsClaimSession.typeOfLivestock,
      );
      const { isReview, isEndemicsFollowUp } = getReviewType(endemicsClaimSession.typeOfReview);

      const backLink = getBackLink(isReview, isSheep);

      const builtRows = buildRows({
        isReview,
        endemicsClaimSession,
        isBeef,
        isDairy,
        isPigs,
        isEndemicsFollowUp,
      });

      const { beefRows, dairyRows, pigRows, sheepRows } = collateRows({
        isReview,
        isEndemicsFollowUp,
        endemicsClaimSession,
        ...builtRows,
      });

      const speciesRows = () => {
        switch (true) {
          case isBeef:
            return beefRows;
          case isDairy:
            return dairyRows;
          case isPigs:
            return pigRows;
          case isSheep:
            return sheepRows;
          default:
            return [];
        }
      };

      const rows = [
        ...getNoChangeRows({
          isReview,
          isPigs,
          isSheep,
          organisationName: organisation.name,
          endemicsClaimSession,
        }),
        ...speciesRows(),
      ];

      const rowsWithData = rows.filter((row) => row.value?.html !== undefined);
      return h.view(claimViews.checkAnswers, {
        listData: { rows: rowsWithData },
        backLink,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: claimRoutes.checkAnswers,
  options: {
    handler: async (request, h) => {
      const endemicsClaimSession = getSessionData(request, sessionEntryKeys.endemicsClaim);
      const claimPayload = buildClaimPayload(endemicsClaimSession);
      const claim = await submitNewClaim(claimPayload, request.logger);

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.reference,
        claim.reference,
      );
      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.amount,
        claim.data.amount,
      );

      // TODO - fire an event that a claim was created
      return h.redirect(claimRoutes.confirmation);
    },
  },
};

export const checkAnswersHandlers = [getHandler, postHandler];
