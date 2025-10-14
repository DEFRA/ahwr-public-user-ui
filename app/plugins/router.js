import { healthHandlers } from "../routes/health.js";
import { assetsRouteHandlers } from "../routes/assets.js";
import { cookieHandlers } from "../routes/cookies.js";
import { entryPointHandlers } from "../routes/index.js";
import { checkDetailsHandlers } from "../routes/check-details.js";
import { updateDetailsHandlers } from "../routes/update-details.js";
import { signinRouteHandlers } from "../routes/signin-oidc.js";
import { downloadApplicationHandlers } from "../routes/download-application.js";
import { vetVisitsHandlers } from "../routes/vet-visits.js";
import { devLoginHandlers } from "../routes/dev-sign-in.js";
import { accessibilityRouteHandlers } from "../routes/accessibility.js";
import { signOutHandlers } from "../routes/sign-out.js";
import { config } from "../config/index.js";
import { cannotSignInExceptionHandlers } from "../routes/cannot-sign-in.js";
import { defraIdSignInHandlers } from "../routes/sign-in.js";
import { missingPagesRoutes } from "../routes/missing-routes.js";
import { declarationRouteHandlers } from "../routes/apply/declaration.js";
import { numbersRouteHandlers } from "../routes/apply/numbers.js";
import { timingsRouteHandlers } from "../routes/apply/timings.js";
import { claimMultipleRouteHandlers } from "../routes/apply/you-can-claim-multiple.js";

const alwaysOnRoutes = [
  healthHandlers,
  assetsRouteHandlers,
  cookieHandlers,
  entryPointHandlers,
  checkDetailsHandlers,
  updateDetailsHandlers,
  signinRouteHandlers,
  downloadApplicationHandlers,
  accessibilityRouteHandlers,
  vetVisitsHandlers,
  signOutHandlers,
  cannotSignInExceptionHandlers,
  defraIdSignInHandlers,
  missingPagesRoutes,
  // Apply routes
  declarationRouteHandlers,
  numbersRouteHandlers,
  timingsRouteHandlers,
  claimMultipleRouteHandlers,
].flat();

let routes;
const mapRoutes = () => {
  routes = alwaysOnRoutes;

  if (config.devLogin.enabled) {
    routes = routes.concat(devLoginHandlers);
  }
};

export const routerPlugin = {
  plugin: {
    name: "router",
    register: (server, _) => {
      mapRoutes();
      server.route(routes);
    },
  },
};
