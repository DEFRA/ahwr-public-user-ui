import { poultryClaimRoutes } from "../../../constants/routes";

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.dateOfReview,
  options: {
    handler: async (request, h) => {},
  },
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.dateOfReview,
  options: {
    handler: async (request, h) => {},
  },
};

export const poultryDateOfReviewHandlers = [getHandler, postHandler];
