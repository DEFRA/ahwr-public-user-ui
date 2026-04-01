import { config } from "../config/index.js";
import { dashboardRoutes } from "../constants/routes.js";

export const entryPointHandlers = [
  {
    method: "GET",
    path: "/",
    options: {
      handler: async (_request, h) => {
        return h.redirect(
          config.poultry.enabled ? dashboardRoutes.selectFunding : dashboardRoutes.manageYourClaims,
        );
      },
    },
  },
];
