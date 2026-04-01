import { poultryClaimRoutes } from "../../../constants/routes";

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.dateOfReview,
  options: {
    handler: async (_request, _h) => {},
  },
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.dateOfReview,
  options: {
    handler: async (_request, _h) => {},
  },
};

export const poultryDateOfReviewHandlers = [getHandler, postHandler];
