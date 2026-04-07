import { poultryClaimRoutes } from "../../../constants/routes.js";

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.enterSiteName,
  handler: async (_request, _h) => {},
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.enterSiteName,
  handler: async (_request, _h) => {},
};

export const poultryEnterSiteNameHandlers = [getHandler, postHandler];
