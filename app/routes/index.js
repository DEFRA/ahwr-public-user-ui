import { dashboardRoutes } from "../constants/routes.js";

export const entryPointHandlers = [
  {
    method: "GET",
    path: "/",
    options: {
      handler: async (_request, h) => {
        return h.redirect(dashboardRoutes.selectFunding);
      },
    },
  },
];
