import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionEntry,
} from "../../session/index.js";
import { claimRoutes, claimViews } from "../../constants/routes.js";
import {
  formatDate,
  getSpeciesEligibleNumberForDisplay,
  getVaccinationStatusForDisplay,
  upperFirstLetter,
} from "../../lib/display-helpers.js";
import { getLivestockTypes, getReviewType } from "../../lib/utils.js";
import {
  sheepPackages,
  sheepTestResultsType,
  sheepTestTypes,
} from "../../constants/claim-constants.js";
import { submitNewClaim } from "../../api-requests/claim-api.js";
import { isMultipleHerdsUserJourney } from "../../lib/context-helper.js";
import { generatePigStatusAnswerRows } from "../../lib/generate-answer-rows.js";

const getBackLink = (isReview, isSheep) => {
  if (isReview) {
    return isSheep ? claimRoutes.testUrn : claimRoutes.testResults;
  }

  return isSheep ? claimRoutes.sheepTestResults : claimRoutes.biosecurity;
};

const getNoChangeRows = ({
  isReview,
  isPigs,
  isSheep,
  typeOfLivestock,
  dateOfVisit,
  organisationName,
  herdName,
  agreementFlags,
}) => [
  {
    key: { text: "Business name" },
    value: { html: upperFirstLetter(organisationName) },
  },
  {
    key: {
      text: isMultipleHerdsUserJourney(dateOfVisit, agreementFlags) ? "Species" : "Livestock",
    },
    value: {
      html: upperFirstLetter(isPigs || isSheep ? typeOfLivestock : `${typeOfLivestock} cattle`),
    },
  },
  ...(isMultipleHerdsUserJourney(dateOfVisit, agreementFlags)
    ? [getHerdNameRow(herdName, typeOfLivestock)]
    : []),
  {
    key: { text: "Review or follow-up" },
    value: {
      html: isReview ? "Animal health and welfare review" : "Endemic disease follow-up",
    },
  },
];
const getBiosecurityAssessmentRow = (isPigs, sessionData) => {
  return createdHerdRowObject(
    "Biosecurity assessment",
    isPigs && sessionData.biosecurity
      ? upperFirstLetter(
          `${sessionData.biosecurity?.biosecurity}, Assessment percentage: ${sessionData.biosecurity?.assessmentPercentage}%`,
        )
      : upperFirstLetter(sessionData.biosecurity),
    claimRoutes.biosecurity,
    "biosecurity assessment",
  );
};
const getDateOfVisitRow = (isReview, dateOfVisit) => {
  return createdHerdRowObject(
    isReview ? "Date of review" : "Date of follow-up",
    formatDate(dateOfVisit),
    claimRoutes.dateOfVisit,
    `date of ${isReview ? "review" : "follow-up"}`,
  );
};
const getDateOfSamplingRow = (dateOfTesting) => {
  return createdHerdRowObject(
    "Date of sampling",
    dateOfTesting ? formatDate(dateOfTesting) : undefined,
    claimRoutes.dateOfTesting,
    "date of sampling",
  );
};
const getSheepDiseasesTestedRow = (isEndemicsFollowUp, sessionData) => {
  if (isEndemicsFollowUp && sessionData.sheepTestResults?.length) {
    const testList = sessionData.sheepTestResults
      .map(
        (sheepTest) =>
          `${
            sheepTestTypes[sessionData.sheepEndemicsPackage].find(
              (test) => test.value === sheepTest.diseaseType,
            ).text
          }</br>`,
      )
      .join(" ");
    return createdHerdRowObject(
      "Diseases or conditions tested for",
      testList,
      claimRoutes.sheepTests,
      "diseases or conditions tested for",
    );
  }
  return {};
};

const getHerdNameRow = (herdName, typeOfLivestock) => {
  return {
    key: { text: `${typeOfLivestock === "sheep" ? "Flock" : "Herd"} name` },
    value: { html: herdName },
  };
};

const createdHerdRowObject = (keyText, htmlValue, href, visuallyHiddenText) => {
  return {
    key: { text: keyText },
    value: {
      html: htmlValue,
    },
    actions: {
      items: [
        {
          href,
          text: "Change",
          visuallyHiddenText,
        },
      ],
    },
  };
};

const getHandler = {
  method: "GET",
  path: claimRoutes.checkAnswers,
  options: {
    handler: async (request, h) => {
      const endemicsClaimSession = getSessionData(request, sessionEntryKeys.endemicsClaim);
      const {
        organisation,
        typeOfLivestock,
        typeOfReview,
        dateOfVisit,
        dateOfTesting,
        speciesNumbers,
        vetsName,
        vetRCVSNumber,
        laboratoryURN,
        numberAnimalsTested,
        testResults,
        herdName,
        latestEndemicsApplication,
      } = endemicsClaimSession;

      const { isBeef, isDairy, isPigs, isSheep } = getLivestockTypes(typeOfLivestock);
      const { isReview, isEndemicsFollowUp } = getReviewType(typeOfReview);

      const backLink = getBackLink(isReview, isSheep);
      const dateOfVisitRow = getDateOfVisitRow(isReview, dateOfVisit);

      const dateOfSamplingRow = getDateOfSamplingRow(dateOfTesting);

      const speciesNumbersRow = createdHerdRowObject(
        getSpeciesEligibleNumberForDisplay(endemicsClaimSession, true),
        upperFirstLetter(speciesNumbers),
        claimRoutes.speciesNumbers,
        "number of species",
      );

      const numberOfAnimalsTestedRow = createdHerdRowObject(
        "Number of samples taken",
        numberAnimalsTested,
        claimRoutes.numberOfSpeciesTested,
        "number of samples taken",
      );

      const vetDetailsRows = [
        createdHerdRowObject(
          "Vet's name",
          upperFirstLetter(vetsName),
          claimRoutes.vetName,
          "vet's name",
        ),
        createdHerdRowObject(
          "Vet's RCVS number",
          vetRCVSNumber,
          claimRoutes.vetRcvs,
          "vet's rcvs number",
        ),
      ];
      const piHuntRow = createdHerdRowObject(
        "PI hunt",
        upperFirstLetter(endemicsClaimSession.piHunt),
        claimRoutes.piHunt,
        "the pi hunt",
      );

      const piHuntRecommendedRow = createdHerdRowObject(
        "Vet recommended PI hunt",
        upperFirstLetter(endemicsClaimSession.piHuntRecommended),
        claimRoutes.piHuntRecommended,
        "the pi hunt recommended",
      );

      const piHuntAllAnimalsRow = createdHerdRowObject(
        "PI hunt done on all cattle in herd",
        upperFirstLetter(endemicsClaimSession.piHuntAllAnimals),
        claimRoutes.piHuntAllAnimals,
        "the pi hunt",
      );

      const laboratoryUrnRow = createdHerdRowObject(
        isBeef || isDairy ? "URN or test certificate" : "URN",
        laboratoryURN,
        claimRoutes.testUrn,
        "URN",
      );

      const oralFluidSamplesRow = createdHerdRowObject(
        "Number of oral fluid samples taken",
        endemicsClaimSession.numberOfOralFluidSamples,
        claimRoutes.numberOfFluidOralSamples,
        "number of oral fluid samples taken",
      );

      const testResultsRow = createdHerdRowObject(
        isReview ? "Test results" : "Follow-up test result",
        upperFirstLetter(testResults),
        claimRoutes.testResults,
        "test results",
      );

      const vetVisitsReviewTestResultsRow = createdHerdRowObject(
        "Review test result",
        upperFirstLetter(endemicsClaimSession.vetVisitsReviewTestResults),
        claimRoutes.vetVisitsReviewTestResults,
        "review test results",
      );

      const samplesTestedRow = createdHerdRowObject(
        "Number of samples tested",
        endemicsClaimSession.numberOfSamplesTested,
        claimRoutes.numberOfSamplesTested,
        "number of samples tested",
      );

      const herdVaccinationStatusRow = createdHerdRowObject(
        "Herd PRRS vaccination status",
        getVaccinationStatusForDisplay(endemicsClaimSession.herdVaccinationStatus),
        claimRoutes.vaccination,
        "herd PRRS vaccination status",
      );

      const biosecurityAssessmentRow = getBiosecurityAssessmentRow(isPigs, endemicsClaimSession);
      const sheepPackageRow = createdHerdRowObject(
        "Sheep health package",
        sheepPackages[endemicsClaimSession.sheepEndemicsPackage],
        claimRoutes.sheepEndemicsPackage,
        "sheep health package",
      );

      const sheepDiseasesTestedRow = getSheepDiseasesTestedRow(
        isEndemicsFollowUp,
        endemicsClaimSession,
      );

      const beefRows = [
        vetVisitsReviewTestResultsRow,
        dateOfVisitRow,
        isReview && dateOfSamplingRow,
        speciesNumbersRow,
        numberOfAnimalsTestedRow,
        ...vetDetailsRows,
        piHuntRow,
        piHuntRecommendedRow,
        piHuntAllAnimalsRow,
        isEndemicsFollowUp && dateOfSamplingRow,
        laboratoryUrnRow,
        testResultsRow,
        isEndemicsFollowUp && biosecurityAssessmentRow,
      ];
      const dairyRows = [
        vetVisitsReviewTestResultsRow,
        dateOfVisitRow,
        isReview && dateOfSamplingRow,
        speciesNumbersRow,
        numberOfAnimalsTestedRow,
        ...vetDetailsRows,
        piHuntRow,
        piHuntRecommendedRow,
        piHuntAllAnimalsRow,
        isEndemicsFollowUp && dateOfSamplingRow,
        laboratoryUrnRow,
        testResultsRow,
        isEndemicsFollowUp && biosecurityAssessmentRow,
      ];
      const pigRows = [
        dateOfVisitRow,
        dateOfSamplingRow,
        speciesNumbersRow,
        numberOfAnimalsTestedRow,
        ...vetDetailsRows,
        vetVisitsReviewTestResultsRow,
        herdVaccinationStatusRow,
        laboratoryUrnRow,
        oralFluidSamplesRow, // review claim
        testResultsRow,
        samplesTestedRow, // endemics claim
        ...generatePigStatusAnswerRows(endemicsClaimSession),
        isEndemicsFollowUp && biosecurityAssessmentRow,
      ];
      const sheepRows = [
        dateOfVisitRow,
        dateOfSamplingRow,
        speciesNumbersRow,
        numberOfAnimalsTestedRow,
        ...vetDetailsRows,
        laboratoryUrnRow,
        testResultsRow,
        sheepPackageRow,
        sheepDiseasesTestedRow,
        ...(isEndemicsFollowUp && endemicsClaimSession.sheepTestResults?.length
          ? (endemicsClaimSession.sheepTestResults || []).map((sheepTest, index) => ({
              key: {
                text: index === 0 ? "Disease or condition test result" : "",
              },
              value: {
                html:
                  typeof sheepTest.result === "object"
                    ? sheepTest.result
                        .map(
                          (testResult) =>
                            `${testResult.diseaseType} (${testResult.testResult})</br>`,
                        )
                        .join(" ")
                    : `${sheepTestTypes[endemicsClaimSession.sheepEndemicsPackage].find(({ value }) => value === sheepTest.diseaseType).text} (${sheepTestResultsType[sheepTest.diseaseType].find((resultType) => resultType.value === sheepTest.result).text})`,
              },
              actions: {
                items: [
                  {
                    href: `${claimRoutes.sheepTestResults}?diseaseType=${sheepTest.diseaseType}`,
                    text: "Change",
                    visuallyHiddenText: `disease type ${sheepTest.diseaseType} and test result`,
                  },
                ],
              },
            }))
          : []),
      ];

      const speciesRows = () => {
        switch (true) {
          case isBeef:
            return beefRows;
          case isDairy:
            return dairyRows;
          case isPigs:
            return pigRows;
          case isSheep:
            return sheepRows;
          default:
            return [];
        }
      };

      const rows = [
        ...getNoChangeRows({
          isReview,
          isPigs,
          isSheep,
          typeOfLivestock,
          dateOfVisit,
          organisationName: organisation?.name,
          herdName,
          agreementFlags: latestEndemicsApplication.flags,
        }),
        ...speciesRows(),
      ];

      const rowsWithData = rows.filter((row) => row.value?.html !== undefined);
      return h.view(claimViews.checkAnswers, {
        listData: { rows: rowsWithData },
        backLink,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: claimRoutes.checkAnswers,
  options: {
    handler: async (request, h) => {
      const {
        typeOfLivestock,
        typeOfReview,
        dateOfVisit,
        dateOfTesting,
        speciesNumbers,
        vetsName,
        vetRCVSNumber,
        laboratoryURN,
        piHunt,
        piHuntRecommended,
        piHuntAllAnimals,
        numberOfOralFluidSamples,
        numberAnimalsTested,
        testResults,
        latestEndemicsApplication,
        vetVisitsReviewTestResults,
        sheepTestResults,
        biosecurity,
        herdVaccinationStatus,
        diseaseStatus,
        pigsFollowUpTest,
        pigsElisaTestResult,
        pigsPcrTestResult,
        pigsGeneticSequencing,
        sheepEndemicsPackage,
        numberOfSamplesTested,
        reference: tempClaimReference,
        reviewTestResults,
        herdId,
        herdVersion,
        herdName,
        herdCph,
        herdReasons,
        herdSame,
      } = getSessionData(request, sessionEntryKeys.endemicsClaim);

      const { isSheep } = getLivestockTypes(typeOfLivestock);
      const { isEndemicsFollowUp } = getReviewType(typeOfReview);

      const claim = await submitNewClaim(
        {
          applicationReference: latestEndemicsApplication.reference,
          reference: tempClaimReference,
          type: typeOfReview,
          createdBy: "admin",
          data: {
            typeOfLivestock,
            dateOfVisit,
            dateOfTesting,
            speciesNumbers,
            vetsName,
            vetRCVSNumber,
            laboratoryURN,
            piHunt,
            piHuntRecommended,
            piHuntAllAnimals,
            numberOfOralFluidSamples,
            numberAnimalsTested,
            testResults,
            vetVisitsReviewTestResults,
            biosecurity,
            herdVaccinationStatus,
            diseaseStatus,
            pigsFollowUpTest,
            pigsElisaTestResult,
            pigsPcrTestResult,
            pigsGeneticSequencing,
            sheepEndemicsPackage,
            numberOfSamplesTested,
            reviewTestResults,
            ...(isEndemicsFollowUp &&
              isSheep && {
                testResults: sheepTestResults?.map((sheepTest) => ({
                  diseaseType: sheepTest.diseaseType,
                  result:
                    typeof sheepTest.result === "object"
                      ? sheepTest.result.map((testResult) => ({
                          diseaseType: testResult.diseaseType,
                          result: testResult.testResult,
                        }))
                      : sheepTest.result,
                })),
              }),
            ...(isMultipleHerdsUserJourney(dateOfVisit, latestEndemicsApplication.flags) && {
              herd: {
                id: herdId,
                version: herdVersion,
                name: herdName,
                cph: herdCph,
                reasons: herdReasons,
                same: herdSame,
              },
            }),
          },
        },
        request.logger,
      );

      setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.reference,
        claim.reference,
      );
      setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.amount,
        claim.data.amount,
      );
      setSessionEntry(request, sessionEntryKeys.tempClaimReference, claim.reference);

      // TODO - fire an event that a claim was created

      return h.redirect(claimRoutes.confirmation);
    },
  },
};

export const checkAnswersHandlers = [getHandler, postHandler];
