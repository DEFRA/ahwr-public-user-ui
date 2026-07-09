import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import HttpStatus from "http-status-codes";
import { PIG_GENETIC_SEQUENCING_VALUES } from "ffc-ahwr-common-library";
import { claimConstants } from "../../../constants/claim-constants.js";
import { livestockClaimRoutes, livestockClaimViews } from "../../../constants/routes.js";

const getBackLink = (pigsFollowUpTest) => {
  if (pigsFollowUpTest === claimConstants.pigsFollowUpTest.elisa) {
    return livestockClaimRoutes.pigsElisaResult;
  }

  return livestockClaimRoutes.pigsPcrResult;
};

const getHandler = {
  method: "GET",
  path: livestockClaimRoutes.pigsGeneticSequencing,
  options: {
    handler: async (request, h) => {
      const { pigsGeneticSequencing, pigsFollowUpTest } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );

      return h.view(livestockClaimViews.pigsGeneticSequencing, {
        options: PIG_GENETIC_SEQUENCING_VALUES.map((x) => ({
          ...x,
          text: x.label,
          checked: pigsGeneticSequencing === x.value,
        })),
        backLink: getBackLink(pigsFollowUpTest),
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: livestockClaimRoutes.pigsGeneticSequencing,
  options: {
    validate: {
      payload: Joi.object({
        geneticSequencing: Joi.string()
          .valid(...PIG_GENETIC_SEQUENCING_VALUES.map((x) => x.value))
          .required(),
      }),
      failAction: (request, h, _err) => {
        const errorMessage = {
          text: "Select the result of the genetic sequencing",
        };

        const pigsFollowUpTest = getSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.pigsFollowUpTest,
        );

        return h
          .view(livestockClaimViews.pigsGeneticSequencing, {
            errorMessage,
            options: PIG_GENETIC_SEQUENCING_VALUES.map((x) => ({
              ...x,
              text: x.label,
            })),
            backLink: getBackLink(pigsFollowUpTest),
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { geneticSequencing } = request.payload;

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.pigsGeneticSequencing,
        geneticSequencing,
      );

      return h.redirect(livestockClaimRoutes.biosecurity);
    },
  },
};

export const pigsGeneticSequencingHandlers = [getHandler, postHandler];
