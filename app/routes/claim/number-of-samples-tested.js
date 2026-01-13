import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../session/index.js";
import { thresholds, claimConstants } from "../../constants/claim-constants.js";
import HttpStatus from "http-status-codes";
import { claimRoutes, claimViews } from "../../constants/routes.js";
import { sendInvalidDataEvent } from "../../messaging/ineligibility-event-emission.js";

const getHandler = {
  method: "GET",
  path: "/number-of-samples-tested",
  options: {
    handler: async (request, h) => {
      const numberOfSamplesTested = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.numberOfSamplesTested,
      );

      return h.view(claimViews.numberOfSamplesTested, {
        numberOfSamplesTested,
        backLink: claimRoutes.testUrn,
        hintText:
          "Enter how many polymerase chain reaction (PCR) and enzyme-linked immunosorbent assay (ELISA) test results you got back. You can find this on the summary the vet gave you.",
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: "/number-of-samples-tested",
  options: {
    validate: {
      payload: Joi.object({
        numberOfSamplesTested: Joi.string().pattern(/^\d+$/).max(4).required().messages({
          "string.base":
            "Enter how many samples were tested. Use the number of PCR or ELISA test results you got back",
          "string.empty":
            "Enter how many samples were tested. Use the number of PCR or ELISA test results you got back",
          "string.max":
            "The number of samples tested should not exceed 9999. Use the number of PCR or ELISA test results you got back",
          "string.pattern.base":
            "The amount of samples tested must only include numbers. Use the number of PCR or ELISA test results you got back",
        }),
      }),
      failAction: async (request, h, error) => {
        return h
          .view(claimViews.numberOfSamplesTested, {
            ...request.payload,
            errorMessage: { text: error.details[0].message, href: "#numberOfSamplesTested" },
            backLink: claimRoutes.testUrn,
            hintText:
              "Enter how many polymerase chain reaction (PCR) and enzyme-linked immunosorbent assay (ELISA) test results you got back. You can find this on the summary the vet gave you.",
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { numberOfSamplesTested } = request.payload;
      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.numberOfSamplesTested,
        numberOfSamplesTested,
      );

      const { herdVaccinationStatus, vetVisitsReviewTestResults, relevantReviewForEndemics } =
        getSessionData(request, sessionEntryKeys.endemicsClaim);
      // This has always been here - but would question if maybe we should be calling getReviewTestResultWithinLast10Months(request) rather than this.
      const lastReviewTestResults =
        vetVisitsReviewTestResults ?? relevantReviewForEndemics?.data?.testResults;

      const threshold =
        lastReviewTestResults === "positive"
          ? thresholds.positiveReviewNumberOfSamplesTested
          : thresholds.negativeReviewNumberOfSamplesTested;

      if (numberOfSamplesTested !== threshold) {
        await sendInvalidDataEvent({
          request,
          sessionKey: sessionKeys.endemicsClaim.numberOfSamplesTested,
          exception: `Value ${numberOfSamplesTested} is not equal to required value ${threshold}`,
        });

        return h
          .view(claimViews.numberOfSamplesTestedException, {
            backLink: claimRoutes.numberOfSamplesTested,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      const {
        vaccination: { vaccinated },
        pigsFollowUpTest: { pcr, elisa },
        result: { positive },
      } = claimConstants;

      if (herdVaccinationStatus === vaccinated || lastReviewTestResults === positive) {
        await setSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.pigsFollowUpTest,
          pcr,
          { shouldEmitEvent: false },
        );
        return h.redirect(claimRoutes.pigsPcrResult);
      }

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.pigsFollowUpTest,
        elisa,
        { shouldEmitEvent: false },
      );

      return h.redirect(claimRoutes.pigsElisaResult);
    },
  },
};

export const numberOfSamplesTestedHandlers = [getHandler, postHandler];
