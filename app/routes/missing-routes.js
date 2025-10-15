import { StatusCodes } from "http-status-codes";
import { config } from "../config/index.js";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";

export const missingPagesRoutes = [
  {
    method: "GET",
    path: "/{any*}",
    options: {
      auth: { mode: "try" },
      handler: (request, h) => {
        const userIsSignedIn = Boolean(
          getSessionData(
            request,
            sessionEntryKeys.endemicsClaim,
            sessionKeys.endemicsClaim.organisation,
          ),
        );

        return h
          .view("error-pages/404", {
            signInLink: !userIsSignedIn ? `${config.serviceUri}sign-in` : undefined,
            dashboardLink: `${config.serviceUri}vet-visits`,
          })
          .code(StatusCodes.NOT_FOUND);
      },
    },
  },
];
