import { config } from "./index.js";

export const claimServiceUri = config.claimServiceUri;

export const dashboardRoutes = { manageYourClaims: "vet-visits", checkDetails: "check-details" };

export const applyRoutes = {
  youCanClaimMultiple: "/you-can-claim-multiple",
  timings: "/timings",
  numbers: "/numbers",
  declaration: "/declaration",
  offerRejected: "/offer-rejected",
  confirmation: "/confirmation",
};

export const applyViews = {
  youCanClaimMultiple: "apply/you-can-claim-multiple",
  timings: "apply/timings",
  numbers: "apply/numbers",
  declaration: "apply/declaration",
  offerRejected: "apply/offer-rejected",
  confirmation: "apply/confirmation",
};

export const claimRoutes = {};

export const claimViews = {};
