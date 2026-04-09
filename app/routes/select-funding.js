import HttpStatus from "http-status-codes";
import {
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
  getSessionData,
  clearFundingSelection,
} from "../session/index.js";
import {
  applyRoutes,
  dashboardRoutes,
  dashboardViews,
  poultryApplyRoutes,
} from "../constants/routes.js";
import Joi from "joi";
import { requestAuthorizationCodeUrl } from "../auth/auth-code-grant/request-authorization-code-url.js";

export const selectFundingRouteHandlers = [
  {
    method: "GET",
    path: "/select-funding",
    options: {
      handler: async (request, h) => {
        const { livestockText, poultryText, organisation } = getScreenInformation(request);

        const attachedToMultipleBusinesses = getSessionData(
          request,
          sessionEntryKeys.customer,
          sessionKeys.customer.attachedToMultipleBusinesses,
        );

        return h.view(dashboardViews.selectFunding, {
          attachedToMultipleBusinesses,
          livestockText,
          poultryText,
          ...(attachedToMultipleBusinesses && {
            hostname: await requestAuthorizationCodeUrl(request),
          }),
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
          fundingType: Joi.string()
            .valid("IAHW", "POUL")
            .required()
            .messages({ "any.required": "Select a funding" }),
        }),
        failAction: async (request, h, error) => {
          request.logger.error({ error });
          clearFundingSelection(request);
          setSessionData(
            request,
            sessionEntryKeys.fundingSelection,
            sessionKeys.fundingSelection.error,
            "No funding selected",
          );
          const { livestockText, poultryText, organisation } = getScreenInformation(request);

          const attachedToMultipleBusinesses = getSessionData(
            request,
            sessionEntryKeys.customer,
            sessionKeys.customer.attachedToMultipleBusinesses,
          );

          return h
            .view(dashboardViews.selectFunding, {
              attachedToMultipleBusinesses,
              livestockText,
              poultryText,
              ...organisation,
              ...(attachedToMultipleBusinesses && {
                hostname: await requestAuthorizationCodeUrl(request),
              }),
              errorMessage: {
                text: error.details[0].message,
                href: "#fundingType",
              },
            })
            .code(HttpStatus.BAD_REQUEST)
            .takeover();
        },
      },
      handler: async (request, h) => {
        clearFundingSelection(request);
        const { fundingType } = request.payload;

        await setSessionData(
          request,
          sessionEntryKeys.fundingSelection,
          sessionKeys.fundingSelection.selectedFunding,
          fundingType,
        );

        if (fundingType === "IAHW") {
          const latestEndemicsApplication = getSessionData(
            request,
            sessionEntryKeys.endemicsClaim,
            sessionKeys.endemicsClaim.latestEndemicsApplication,
          );
          await setSessionData(
            request,
            sessionEntryKeys.fundingSelection,
            sessionKeys.fundingSelection.agreement,
            latestEndemicsApplication?.reference,
          );
          return h.redirect(
            latestEndemicsApplication
              ? dashboardRoutes.manageYourClaims
              : applyRoutes.youCanClaimMultiple,
          );
        }

        if (fundingType === "POUL") {
          const latestPoultryApplication = getSessionData(
            request,
            sessionEntryKeys.poultryClaim,
            sessionKeys.poultryClaim.latestPoultryApplication,
          );
          await setSessionData(
            request,
            sessionEntryKeys.fundingSelection,
            sessionKeys.fundingSelection.agreement,
            latestPoultryApplication?.reference,
          );
          return h.redirect(
            latestPoultryApplication
              ? dashboardRoutes.poultryManageYourClaims
              : poultryApplyRoutes.youCanClaimMultiple,
          );
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
    : "Create an agreement for improve animal health and welfare for cattle, pigs and sheep";
}
