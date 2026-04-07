import { poultryClaimRoutes } from "../../../constants/routes.js";

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.selectTheSite,
  handler: async (_request, _h) => {},
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.selectTheSite,
  handler: async (_request, _h) => {},
};

export const poultrySelectTheSiteHandlers = [getHandler, postHandler];
