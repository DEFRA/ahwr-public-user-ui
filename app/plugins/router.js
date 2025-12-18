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
import { biosecurityHandlers } from "../routes/claim/biosecurity.js";
import { checkAnswersHandlers } from "../routes/claim/check-answers.js";
import { checkHerdDetailsHandlers } from "../routes/claim/check-herd-details.js";
import { confirmationHandlers } from "../routes/claim/confirmation.js";
import { dateOfTestingHandlers } from "../routes/claim/date-of-testing.js";
import { dateOfVisitHandlers } from "../routes/claim/date-of-visit.js";
import { diseaseStatusHandlers } from "../routes/claim/disease-status.js";
import { enterCphNumberHandlers } from "../routes/claim/enter-cph-number.js";
import { enterHerdDetailsHandlers } from "../routes/claim/enter-herd-details.js";
import { enterHerdNameHandlers } from "../routes/claim/enter-herd-name.js";
import { herdOthersOnSbiHandlers } from "../routes/claim/herd-others-on-sbi.js";
import { numberOfOralFluidSamplesHandlers } from "../routes/claim/number-of-fluid-oral-samples.js";
import { numberOfSamplesTestedHandlers } from "../routes/claim/number-of-samples-tested.js";
import { numberOfSpeciesTestedHandlers } from "../routes/claim/number-of-species-tested.js";
import { piHuntHandlers } from "../routes/claim/pi-hunt.js";
import { piHuntAllAnimalsHandlers } from "../routes/claim/pi-hunt-all-animals.js";
import { piHuntRecommendedHandlers } from "../routes/claim/pi-hunt-recommended.js";
import { pigsElisaResultHandlers } from "../routes/claim/pigs-elisa-result.js";
import { pigsGeneticSequencingHandlers } from "../routes/claim/pigs-genetic-sequencing.js";
import { pigsPcrResultHandlers } from "../routes/claim/pigs-pcr-result.js";
import { sameHerdHandlers } from "../routes/claim/same-herd.js";
import { selectTheHerdHandlers } from "../routes/claim/select-the-herd.js";
import { sheepEndemicsPackageHandlers } from "../routes/claim/sheep-endemics-package.js";
import { sheepTestResultsHandlers } from "../routes/claim/sheep-test-results.js";
import { sheepTestsHandlers } from "../routes/claim/sheep-tests.js";
import { speciesNumbersHandlers } from "../routes/claim/species-numbers.js";
import { testResultsHandlers } from "../routes/claim/test-results.js";
import { testUrnHandlers } from "../routes/claim/test-urn.js";
import { vaccinationHandlers } from "../routes/claim/vaccination.js";
import { vetsNameHandlers } from "../routes/claim/vet-name.js";
import { vetRCVSHandlers } from "../routes/claim/vet-rcvs.js";
import { vetVisitsReviewTestResultsHandlers } from "../routes/claim/vet-visits-review-test-results.js";
import { whichSpeciesHandlers } from "../routes/claim/which-species.js";
import { whichReviewHandlers } from "../routes/claim/which-type-of-review.js";

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
  // Claim routes
  biosecurityHandlers,
  checkAnswersHandlers,
  checkHerdDetailsHandlers,
  confirmationHandlers,
  dateOfTestingHandlers,
  dateOfVisitHandlers,
  diseaseStatusHandlers,
  enterCphNumberHandlers,
  enterHerdDetailsHandlers,
  enterHerdNameHandlers,
  herdOthersOnSbiHandlers,
  numberOfOralFluidSamplesHandlers,
  numberOfSamplesTestedHandlers,
  numberOfSpeciesTestedHandlers,
  piHuntHandlers,
  piHuntAllAnimalsHandlers,
  piHuntRecommendedHandlers,
  pigsElisaResultHandlers,
  pigsGeneticSequencingHandlers,
  pigsPcrResultHandlers,
  sameHerdHandlers,
  selectTheHerdHandlers,
  sheepEndemicsPackageHandlers,
  sheepTestResultsHandlers,
  sheepTestsHandlers,
  speciesNumbersHandlers,
  testResultsHandlers,
  testUrnHandlers,
  vaccinationHandlers,
  vetsNameHandlers,
  vetRCVSHandlers,
  vetVisitsReviewTestResultsHandlers,
  whichSpeciesHandlers,
  whichReviewHandlers,
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
