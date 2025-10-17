import Joi from "joi";
import links from "../../config/routes.js";
import { sessionKeys } from "../../session/keys.js";
import { claimConstants } from "../../constants/claim-constants.js";
import { getEndemicsClaim, setEndemicsClaim } from "../../session/index.js";
import { radios } from "../models/form-component/radios.js";
import HttpStatus from "http-status-codes";
import { prefixUrl } from "../utils/page-utils.js";

const { endemicsVaccination, endemicsTestUrn, endemicsVetRCVS, endemicsTestResults } = links;
const {
  endemicsClaim: { herdVaccinationStatus: herdVaccinationStatusKey },
} = sessionKeys;
const { vaccination } = claimConstants;

const pageUrl = prefixUrl(endemicsVaccination);

const questionText =
  "What is the herd porcine reproductive and respiratory syndrome (PRRS) vaccination status?";
const hintHtml = "You can find this on the summary the vet gave you.";

const getHandler = {
  method: "GET",
  path: pageUrl,
  options: {
    handler: async (request, h) => {
      const { vetVisitsReviewTestResults, herdVaccinationStatus } = getEndemicsClaim(request);
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
      const backLink = vetVisitsReviewTestResults
        ? prefixUrl(endemicsTestResults)
        : prefixUrl(endemicsVetRCVS);
      return h.view(endemicsVaccination, { backLink, ...vaccinatedNotVaccinatedRadios });
    },
  },
};

const postHandler = {
  method: "POST",
  path: pageUrl,
  options: {
    validate: {
      payload: Joi.object({
        herdVaccinationStatus: Joi.string()
          .valid(vaccination.vaccinated, vaccination.notVaccinated)
          .required(),
      }),
      failAction: async (request, h, err) => {
        request.logger.setBindings({ err });
        const { vetVisitsReviewTestResults } = getEndemicsClaim(request);
        const vaccinatedNotVaccinatedRadios = radios(
          questionText,
          "herdVaccinationStatus",
          "Select a vaccination status",
          { hintHtml },
        )([
          { value: vaccination.vaccinated, text: "Vaccinated" },
          { value: vaccination.notVaccinated, text: "Not vaccinated" },
        ]);
        const backLink = vetVisitsReviewTestResults
          ? prefixUrl(endemicsTestResults)
          : prefixUrl(endemicsVetRCVS);
        return h
          .view(endemicsVaccination, {
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

      setEndemicsClaim(request, herdVaccinationStatusKey, herdVaccinationStatus);
      return h.redirect(prefixUrl(endemicsTestUrn));
    },
  },
};

export const vaccinationHandlers = [getHandler, postHandler];
