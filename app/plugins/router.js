import { healthHandlers } from "../routes/health.js";
import { assetsRouteHandlers } from "../routes/assets.js";
import { cookieHandlers } from "../routes/cookies.js";
import { entryPointHandlers } from "../routes/index.js";
import { updateDetailsHandlers } from "../routes/update-details.js";
import { signinRouteHandlers } from "../routes/signin-oidc.js";
import { downloadApplicationHandlers } from "../routes/download-application.js";
import { vetVisitsHandlers } from "../routes/livestock/vet-visits.js";
import { devLoginHandlers } from "../routes/dev-sign-in.js";
import { accessibilityRouteHandlers } from "../routes/accessibility.js";
import { signOutHandlers } from "../routes/sign-out.js";
import { config } from "../config/index.js";
import { cannotSignInExceptionHandlers } from "../routes/cannot-sign-in.js";
import { defraIdSignInHandlers } from "../routes/sign-in.js";
import { missingPagesRoutes } from "../routes/missing-routes.js";
import { declarationRouteHandlers } from "../routes/livestock/apply/declaration.js";
import { numbersRouteHandlers } from "../routes/livestock/apply/numbers.js";
import { timingsRouteHandlers } from "../routes/livestock/apply/timings.js";
import { claimMultipleRouteHandlers } from "../routes/livestock/apply/you-can-claim-multiple.js";
import { poultryDeclarationRouteHandlers } from "../routes/poultry/apply/agreement-offer.js";
import { poultryNumbersRouteHandlers } from "../routes/poultry/apply/minimum-number.js";
import { poultryTimingsRouteHandlers } from "../routes/poultry/apply/timings.js";
import { poultryClaimMultipleRouteHandlers } from "../routes/poultry/apply/what-you-can-claim.js";
import { poultryDateOfVisitHandlers } from "../routes/poultry/claim/date-of-visit.js";
import { selectFundingRouteHandlers } from "../routes/select-funding.js";
import { biosecurityHandlers } from "../routes/livestock/claim/biosecurity.js";
import { checkAnswersHandlers } from "../routes/livestock/claim/check-answers.js";
import { checkHerdDetailsHandlers } from "../routes/livestock/claim/check-herd-details.js";
import { confirmationHandlers } from "../routes/livestock/claim/confirmation.js";
import { dateOfTestingHandlers } from "../routes/livestock/claim/date-of-testing.js";
import { dateOfVisitHandlers } from "../routes/livestock/claim/date-of-visit.js";
import { diseaseStatusHandlers } from "../routes/livestock/claim/disease-status.js";
import { enterCphNumberHandlers } from "../routes/livestock/claim/enter-cph-number.js";
import { enterHerdDetailsHandlers } from "../routes/livestock/claim/enter-herd-details.js";
import { enterHerdNameHandlers } from "../routes/livestock/claim/enter-herd-name.js";
import { herdOthersOnSbiHandlers } from "../routes/livestock/claim/herd-others-on-sbi.js";
import { typeOfSamplesTakenHandlers } from "../routes/livestock/claim/type-of-samples-taken.js";
import { numberOfOralFluidSamplesHandlers } from "../routes/livestock/claim/number-of-fluid-oral-samples.js";
import { numberOfBloodSamplesHandlers } from "../routes/livestock/claim/number-of-blood-samples.js";
import { numberOfSamplesTestedHandlers } from "../routes/livestock/claim/number-of-samples-tested.js";
import { numberOfSpeciesTestedHandlers } from "../routes/livestock/claim/number-of-species-tested.js";
import { piHuntHandlers } from "../routes/livestock/claim/pi-hunt.js";
import { piHuntAllAnimalsHandlers } from "../routes/livestock/claim/pi-hunt-all-animals.js";
import { piHuntRecommendedHandlers } from "../routes/livestock/claim/pi-hunt-recommended.js";
import { pigsElisaResultHandlers } from "../routes/livestock/claim/pigs-elisa-result.js";
import { pigsGeneticSequencingHandlers } from "../routes/livestock/claim/pigs-genetic-sequencing.js";
import { pigsPcrResultHandlers } from "../routes/livestock/claim/pigs-pcr-result.js";
import { sameHerdHandlers } from "../routes/livestock/claim/same-herd.js";
import { selectTheHerdHandlers } from "../routes/livestock/claim/select-the-herd.js";
import { sheepEndemicsPackageHandlers } from "../routes/livestock/claim/sheep-endemics-package.js";
import { sheepTestResultsHandlers } from "../routes/livestock/claim/sheep-test-results.js";
import { sheepTestsHandlers } from "../routes/livestock/claim/sheep-tests.js";
import { speciesNumbersHandlers } from "../routes/livestock/claim/species-numbers.js";
import { testResultsHandlers } from "../routes/livestock/claim/test-results.js";
import { testUrnHandlers } from "../routes/livestock/claim/test-urn.js";
import { vaccinationHandlers } from "../routes/livestock/claim/vaccination.js";
import { vetsNameHandlers } from "../routes/livestock/claim/vet-name.js";
import { vetRCVSHandlers } from "../routes/livestock/claim/vet-rcvs.js";
import { vetVisitsReviewTestResultsHandlers } from "../routes/livestock/claim/vet-visits-review-test-results.js";
import { whichSpeciesHandlers } from "../routes/livestock/claim/which-species.js";
import { whichReviewHandlers } from "../routes/livestock/claim/which-type-of-review.js";
import { assuranceSchemeHandlers } from "../routes/livestock/claim/assurance-scheme.js";
import { poultryVetVisitsHandlers } from "../routes/poultry/manage-claims.js";
import { poultrySelectTheSiteHandlers } from "../routes/poultry/claim/select-the-site.js";
import { poultryEnterSiteNameHandlers } from "../routes/poultry/claim/site-name.js";
import { poultryEnterCphNumberHandlers } from "../routes/poultry/claim/cph.js";
import { poultrySelectPoultryTypeHandlers } from "../routes/poultry/claim/poultry-type.js";
import { poultrySiteOthersOnSbiHandlers } from "../routes/poultry/claim/sbi-sites.js";
import { poultryMinimumNumberOfBirdsHandlers } from "../routes/poultry/claim/minimum-number-of-birds.js";
import { poultryVetRCVSHandlers } from "../routes/poultry/claim/vet-rcvs.js";
import { poultryBiosecurityHandlers } from "../routes/poultry/claim/biosecurity.js";
import { poultryVetsNameHandlers } from "../routes/poultry/claim/vet-name.js";
import { poultryCheckAnswersHandlers } from "../routes/poultry/claim/check-answers.js";
import { poultryBiosecurityUsefulnessHandlers } from "../routes/poultry/claim/biosecurity-usefulness.js";
import { poultryChangesInBiosecurityHandlers } from "../routes/poultry/claim/changes-in-biosecurity.js";
import { poultryBiosecurityCostOfChangesHandlers } from "../routes/poultry/claim/biosecurity-cost-of-changes.js";
import { poultryInterviewHandlers } from "../routes/poultry/claim/interview.js";
import { poultryConfirmationHandlers } from "../routes/poultry/claim/confirmation.js";
import { checkDetailsHandlers } from "../routes/check-details.js";

const alwaysOnRoutes = [
  healthHandlers,
  assetsRouteHandlers,
  cookieHandlers,
  entryPointHandlers,
  updateDetailsHandlers,
  signinRouteHandlers,
  downloadApplicationHandlers,
  accessibilityRouteHandlers,
  vetVisitsHandlers,
  signOutHandlers,
  cannotSignInExceptionHandlers,
  defraIdSignInHandlers,
  missingPagesRoutes,
  checkDetailsHandlers,
  // Apply routes
  declarationRouteHandlers,
  numbersRouteHandlers,
  timingsRouteHandlers,
  claimMultipleRouteHandlers,
  // Claim routes
  assuranceSchemeHandlers,
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
  typeOfSamplesTakenHandlers,
  numberOfOralFluidSamplesHandlers,
  numberOfBloodSamplesHandlers,
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

const poultryRoutes = [
  selectFundingRouteHandlers,
  poultryDeclarationRouteHandlers,
  poultryNumbersRouteHandlers,
  poultryTimingsRouteHandlers,
  poultryClaimMultipleRouteHandlers,
  poultryDateOfVisitHandlers,
  poultryVetVisitsHandlers,
  poultrySelectTheSiteHandlers,
  poultryEnterSiteNameHandlers,
  poultryEnterCphNumberHandlers,
  poultrySelectPoultryTypeHandlers,
  poultrySiteOthersOnSbiHandlers,
  poultryMinimumNumberOfBirdsHandlers,
  poultryVetRCVSHandlers,
  poultryBiosecurityHandlers,
  poultryBiosecurityUsefulnessHandlers,
  poultryChangesInBiosecurityHandlers,
  poultryVetsNameHandlers,
  poultryCheckAnswersHandlers,
  poultryBiosecurityCostOfChangesHandlers,
  poultryInterviewHandlers,
  poultryConfirmationHandlers,
].flat();

let routes;
const mapRoutes = () => {
  routes = alwaysOnRoutes;

  routes = routes.concat(poultryRoutes);

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
