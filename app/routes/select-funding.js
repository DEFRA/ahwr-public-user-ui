import HttpStatus from "http-status-codes";
import { setSessionData, sessionEntryKeys, sessionKeys, getSessionData } from "../session/index.js";
import {
  applyRoutes,
  dashboardRoutes,
  dashboardViews,
  poultryApplyRoutes,
} from "../constants/routes.js";
import Joi from "joi";

export const selectFundingRouteHandlers = [
  {
    method: "GET",
    path: "/select-funding",
    options: {
      handler: async (request, h) => {
        const { livestockText, poultryText, organisation } = getScreenInformation(request);

        return h.view(dashboardViews.selectFunding, {
          livestockText,
          poultryText,
          ...organisation,
        });
      },
    },
  },
  {
    method: "POST",
    path: "/select-funding",
    options: {
      validate: {
        payload: Joi.object({
          type: Joi.string()
            .valid("IAHW", "POUL")
            .required()
            .messages({ "any.required": "Select a funding" }),
        }),
        failAction: async (request, h, error) => {
          request.logger.error({ error });
          const { livestockText, poultryText, organisation } = getScreenInformation(request);
          return h
            .view(dashboardViews.selectFunding, {
              livestockText,
              poultryText,
              ...organisation,
              errorMessage: {
                text: error.details[0].message,
                href: "#selectFunding",
              },
            })
            .code(HttpStatus.BAD_REQUEST)
            .takeover();
        },
      },
      handler: async (request, h) => {
        const { type } = request.payload;

        const latestEndemicsApplication = getSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.latestEndemicsApplication,
        );
        const latestPoultryApplication = getSessionData(
          request,
          sessionEntryKeys.poultryClaim,
          sessionKeys.poultryClaim.latestPoultryApplication,
        );

        await setSessionData(
          request,
          sessionEntryKeys.poultryApplyData,
          sessionKeys.poultryApplyData.type,
          type,
        );

        if (type === "IAHW" && latestEndemicsApplication) {
          return h.redirect(dashboardRoutes.manageYourClaims);
        }

        if (type === "IAHW") {
          return h.redirect(applyRoutes.youCanClaimMultiple);
        }

        if (type === "POUL" && latestPoultryApplication) {
          return h.redirect(dashboardRoutes.manageYourClaims);
        }

        if (type === "POUL") {
          return h.redirect(poultryApplyRoutes.youCanClaimMultiple);
        }
      },
    },
  },
];
function getScreenInformation(request) {
  const organisation = getSessionData(request, sessionEntryKeys.organisation);

  const latestEndemicsApplication = getSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.latestEndemicsApplication,
  );
  const latestPoultryApplication = getSessionData(
    request,
    sessionEntryKeys.poultryClaim,
    sessionKeys.poultryClaim.latestPoultryApplication,
  );

  const livestockText = getLivestockText(latestEndemicsApplication);
  const poultryText = getPoultryText(latestPoultryApplication);
  return { livestockText, poultryText, organisation };
}

function getPoultryText(latestPoultryApplication) {
  return latestPoultryApplication
    ? `<b>Agreement number</b>: ${latestPoultryApplication.reference}<br/>Create or manage claims for this agreement`
    : "Create an agreement for poultry biosecurity assessments";
}

function getLivestockText(latestEndemicsApplication) {
  return latestEndemicsApplication
    ? `<b>Agreement number</b>: ${latestEndemicsApplication.reference}<br/>Create or manage claims for this agreement`
    : "Create an agreement for cattle, sheep and pig";
}
