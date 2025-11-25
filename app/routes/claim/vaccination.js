import Joi from "joi";
import { claimConstants } from "../../constants/claim-constants.js";
import { radios } from "../models/form-component/radios.js";
import HttpStatus from "http-status-codes";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../session/index.js";
import { claimRoutes, claimViews } from "../../constants/routes.js";

const { vaccination } = claimConstants;

const questionText =
  "What is the herd porcine reproductive and respiratory syndrome (PRRS) vaccination status?";
const hintHtml = "You can find this on the summary the vet gave you.";

const getHandler = {
  method: "GET",
  path: claimRoutes.vaccination,
  options: {
    handler: async (request, h) => {
      const { vetVisitsReviewTestResults, herdVaccinationStatus } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );
      const vaccinatedNotVaccinatedRadios = radios(
        questionText,
        "herdVaccinationStatus",
        undefined,
        { hintHtml },
      )([
        {
          value: vaccination.vaccinated,
          text: "Vaccinated",
          checked: herdVaccinationStatus === "vaccinated",
        },
        {
          value: vaccination.notVaccinated,
          text: "Not vaccinated",
          checked: herdVaccinationStatus === "notVaccinated",
        },
      ]);
      const backLink = vetVisitsReviewTestResults ? claimRoutes.testResults : claimRoutes.vetRcvs;
      return h.view(claimViews.vaccination, { backLink, ...vaccinatedNotVaccinatedRadios });
    },
  },
};

const postHandler = {
  method: "POST",
  path: claimRoutes.vaccination,
  options: {
    validate: {
      payload: Joi.object({
        herdVaccinationStatus: Joi.string()
          .valid(vaccination.vaccinated, vaccination.notVaccinated)
          .required(),
      }),
      failAction: async (request, h, err) => {
        request.logger.setBindings({ error: err });
        const { vetVisitsReviewTestResults } = getSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
        );
        const vaccinatedNotVaccinatedRadios = radios(
          questionText,
          "herdVaccinationStatus",
          "Select a vaccination status",
          { hintHtml },
        )([
          { value: vaccination.vaccinated, text: "Vaccinated" },
          { value: vaccination.notVaccinated, text: "Not vaccinated" },
        ]);
        const backLink = vetVisitsReviewTestResults ? claimRoutes.testResults : claimRoutes.vetRcvs;
        return h
          .view(claimViews.vaccination, {
            ...request.payload,
            backLink,
            ...vaccinatedNotVaccinatedRadios,
            errorMessage: {
              text: "Select a vaccination status",
              href: "#herdVaccinationStatus",
            },
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { herdVaccinationStatus } = request.payload;

      // TODO: Should emit event
      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.herdVaccinationStatus,
        herdVaccinationStatus,
      );
      return h.redirect(claimRoutes.testUrn);
    },
  },
};

export const vaccinationHandlers = [getHandler, postHandler];
