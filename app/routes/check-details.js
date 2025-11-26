import { getOrganisationModel } from "./models/organisation.js";
import joi from "joi";
import { StatusCodes } from "http-status-codes";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import { config } from "../config/index.js";
import { applyRoutes } from "../constants/routes.js";
import { RPA_CONTACT_DETAILS } from "ffc-ahwr-common-library";

export const checkDetailsHandlers = [
  {
    method: "GET",
    path: "/check-details",
    options: {
      handler: async (request, h) => {
        const organisation = getSessionData(request, sessionEntryKeys.organisation);

        if (!organisation) {
          throw new Error("Organisation not in session.");
        }

        return h.view("check-details", await getOrganisationModel(request, organisation));
      },
    },
  },
  {
    method: "POST",
    path: "/check-details",
    options: {
      validate: {
        payload: joi.object({
          confirmCheckDetails: joi.string().valid("yes", "no").required(),
        }),
        failAction: async (request, h, err) => {
          request.logger.setBindings({ error: err });
          const organisation = getSessionData(request, sessionEntryKeys.organisation);

          if (!organisation) {
            throw new Error("Organisation not in session.");
          }

          return h
            .view("check-details", {
              errorMessage: { text: "Select if these details are correct" },
              ...(await getOrganisationModel(
                request,
                organisation,
                "Select if these details are correct",
              )),
            })
            .code(StatusCodes.BAD_REQUEST)
            .takeover();
        },
      },
      handler: async (request, h) => {
        const { confirmCheckDetails } = request.payload;

        if (confirmCheckDetails === "yes") {
          const redirectToApply = getSessionData(
            request,
            sessionEntryKeys.signInRedirect,
            sessionKeys.signInRedirect,
          );

          if (redirectToApply === true) {
            return h.redirect(applyRoutes.youCanClaimMultiple);
          }

          return h.redirect("/vet-visits");
        }

        return h.view("update-details", {
          lfsUpdateEnabled: config.lfsUpdate.enabled,
          ruralPaymentsAgency: RPA_CONTACT_DETAILS,
          lfsUpdateDetailsLink: "/update-details",
        });
      },
    },
  },
];
