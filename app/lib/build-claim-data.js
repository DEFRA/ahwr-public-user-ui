import { isMultipleHerdsUserJourney } from "./context-helper.js";
import {
  formatDate,
  getSpeciesEligibleNumberForDisplay,
  getVaccinationStatusForDisplay,
  upperFirstLetter,
} from "./display-helpers.js";
import { claimRoutes } from "../constants/routes.js";
import {
  sheepPackages,
  sheepTestResultsType,
  sheepTestTypes,
} from "../constants/claim-constants.js";
import { generatePigStatusAnswerRows } from "./generate-answer-rows.js";
import { getLivestockTypes, getReviewType } from "./utils.js";

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

export const buildVetTestandPiHuntRows = ({ endemicsClaimSession, isReview }) => {
  const vetDetailsRows = [
    createdHerdRowObject(
      "Vet's name",
      upperFirstLetter(endemicsClaimSession.vetsName),
      claimRoutes.vetName,
      "vet's name",
    ),
    createdHerdRowObject(
      "Vet's RCVS number",
      endemicsClaimSession.vetRCVSNumber,
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

  const testResultsRow = createdHerdRowObject(
    isReview ? "Test results" : "Follow-up test result",
    upperFirstLetter(endemicsClaimSession.testResults),
    claimRoutes.testResults,
    "test results",
  );

  const vetVisitsReviewTestResultsRow = createdHerdRowObject(
    "Review test result",
    upperFirstLetter(endemicsClaimSession.vetVisitsReviewTestResults),
    claimRoutes.vetVisitsReviewTestResults,
    "review test results",
  );

  return {
    vetDetailsRows,
    piHuntRow,
    piHuntRecommendedRow,
    piHuntAllAnimalsRow,
    testResultsRow,
    vetVisitsReviewTestResultsRow,
  };
};

export const buildRows = ({
  isReview,
  endemicsClaimSession,
  isBeef,
  isDairy,
  isPigs,
  isEndemicsFollowUp,
}) => {
  const dateOfVisitRow = getDateOfVisitRow(isReview, endemicsClaimSession.dateOfVisit);
  const dateOfSamplingRow = getDateOfSamplingRow(endemicsClaimSession.dateOfTesting);
  const speciesNumbersRow = createdHerdRowObject(
    getSpeciesEligibleNumberForDisplay(endemicsClaimSession, true),
    upperFirstLetter(endemicsClaimSession.speciesNumbers),
    claimRoutes.speciesNumbers,
    "number of species",
  );

  const numberOfAnimalsTestedRow = createdHerdRowObject(
    "Number of samples taken",
    endemicsClaimSession.numberAnimalsTested,
    claimRoutes.numberOfSpeciesTested,
    "number of samples taken",
  );

  const laboratoryUrnRow = createdHerdRowObject(
    isBeef || isDairy ? "URN or test certificate" : "URN",
    endemicsClaimSession.laboratoryURN,
    claimRoutes.testUrn,
    "URN",
  );

  const oralFluidSamplesRow = createdHerdRowObject(
    "Number of oral fluid samples taken",
    endemicsClaimSession.numberOfOralFluidSamples,
    claimRoutes.numberOfFluidOralSamples,
    "number of oral fluid samples taken",
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

  return {
    dateOfVisitRow,
    dateOfSamplingRow,
    speciesNumbersRow,
    numberOfAnimalsTestedRow,
    laboratoryUrnRow,
    oralFluidSamplesRow,
    samplesTestedRow,
    herdVaccinationStatusRow,
    biosecurityAssessmentRow,
    sheepPackageRow,
    sheepDiseasesTestedRow,
  };
};

const buildSheepTestResultRows = ({ endemicsClaimSession, isEndemicsFollowUp }) => {
  const sheepTests = endemicsClaimSession.sheepTestResults || [];

  if (!isEndemicsFollowUp || sheepTests.length === 0) {
    return [];
  }

  return sheepTests.map((sheepTest, index) => {
    const { diseaseType, result } = sheepTest;

    const valueHtml = Array.isArray(result)
      ? result.map((res) => `${res.diseaseType} (${res.testResult})</br>`).join(" ")
      : buildSingleResultHtml({
          diseaseType,
          result,
          endemicsClaimSession,
        });

    return {
      key: { text: index === 0 ? "Disease or condition test result" : "" },
      value: { html: valueHtml },
      actions: {
        items: [
          {
            href: `${claimRoutes.sheepTestResults}?diseaseType=${diseaseType}`,
            text: "Change",
            visuallyHiddenText: `disease type ${diseaseType} and test result`,
          },
        ],
      },
    };
  });
};

const buildSingleResultHtml = ({ diseaseType, result, endemicsClaimSession }) => {
  const packageKey = endemicsClaimSession.sheepEndemicsPackage;
  const disease = sheepTestTypes[packageKey].find((d) => d.value === diseaseType);
  const resultLabel = sheepTestResultsType[diseaseType].find((r) => r.value === result);

  return `${disease.text} (${resultLabel.text})`;
};

export const collateRows = (rows) => {
  const {
    vetVisitsReviewTestResultsRow,
    dateOfVisitRow,
    isReview,
    dateOfSamplingRow,
    speciesNumbersRow,
    numberOfAnimalsTestedRow,
    vetDetailsRows,
    piHuntRow,
    piHuntRecommendedRow,
    piHuntAllAnimalsRow,
    isEndemicsFollowUp,
    laboratoryUrnRow,
    testResultsRow,
    biosecurityAssessmentRow,
    herdVaccinationStatusRow,
    oralFluidSamplesRow,
    samplesTestedRow,
    endemicsClaimSession,
    sheepPackageRow,
    sheepDiseasesTestedRow,
  } = rows;

  const commonVisitRows = () => [
    vetVisitsReviewTestResultsRow,
    dateOfVisitRow,
    isReview && dateOfSamplingRow,
    speciesNumbersRow,
    numberOfAnimalsTestedRow,
    ...vetDetailsRows,
  ];

  const piHuntRows = () => [piHuntRow, piHuntRecommendedRow, piHuntAllAnimalsRow];

  const beefRows = [
    ...commonVisitRows(),
    ...piHuntRows(),
    isEndemicsFollowUp && dateOfSamplingRow,
    laboratoryUrnRow,
    testResultsRow,
    isEndemicsFollowUp && biosecurityAssessmentRow,
  ];

  const dairyRows = [...beefRows];

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
    ...buildSheepTestResultRows({
      endemicsClaimSession,
      isEndemicsFollowUp,
    }),
  ];

  return { beefRows, dairyRows, pigRows, sheepRows };
};

const getSheepFollowUpTestResults = ({ isEndemicsFollowUp, isSheep, sheepTestResults }) => {
  if (isEndemicsFollowUp && isSheep) {
    return {
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
    };
  }

  return {};
};

const getHerdInformation = ({
  dateOfVisit,
  latestEndemicsApplication,
  herdId,
  herdVersion,
  herdName,
  herdCph,
  herdReasons,
  herdSame,
}) => {
  if (isMultipleHerdsUserJourney(dateOfVisit, latestEndemicsApplication.flags)) {
    return {
      herd: {
        id: herdId,
        version: herdVersion,
        name: herdName,
        cph: herdCph,
        reasons: herdReasons,
        same: herdSame,
      },
    };
  }

  return {};
};

export const buildClaimPayload = (endemicsClaimSession) => {
  const {
    typeOfLivestock,
    typeOfReview,
    dateOfVisit,
    latestEndemicsApplication,
    sheepTestResults,
    reference: tempClaimReference,
    herdId,
    herdVersion,
    herdName,
    herdCph,
    herdReasons,
    herdSame,
  } = endemicsClaimSession;

  const { isSheep } = getLivestockTypes(typeOfLivestock);
  const { isEndemicsFollowUp } = getReviewType(typeOfReview);

  return {
    applicationReference: latestEndemicsApplication.reference,
    reference: tempClaimReference,
    type: typeOfReview,
    createdBy: "admin",
    data: {
      typeOfLivestock: endemicsClaimSession.typeOfLivestock,
      dateOfVisit: endemicsClaimSession.dateOfVisit,
      dateOfTesting: endemicsClaimSession.dateOfTesting,
      speciesNumbers: endemicsClaimSession.speciesNumbers,
      vetsName: endemicsClaimSession.vetsName,
      vetRCVSNumber: endemicsClaimSession.vetRCVSNumber,
      laboratoryURN: endemicsClaimSession.laboratoryURN,
      piHunt: endemicsClaimSession.piHunt,
      piHuntRecommended: endemicsClaimSession.piHuntRecommended,
      piHuntAllAnimals: endemicsClaimSession.piHuntAllAnimals,
      numberOfOralFluidSamples: endemicsClaimSession.numberOfOralFluidSamples,
      numberAnimalsTested: endemicsClaimSession.numberAnimalsTested,
      testResults: endemicsClaimSession.testResults,
      vetVisitsReviewTestResults: endemicsClaimSession.vetVisitsReviewTestResults,
      biosecurity: endemicsClaimSession.biosecurity,
      herdVaccinationStatus: endemicsClaimSession.herdVaccinationStatus,
      diseaseStatus: endemicsClaimSession.diseaseStatus,
      pigsFollowUpTest: endemicsClaimSession.pigsFollowUpTest,
      pigsElisaTestResult: endemicsClaimSession.pigsElisaTestResult,
      pigsPcrTestResult: endemicsClaimSession.pigsPcrTestResult,
      pigsGeneticSequencing: endemicsClaimSession.pigsGeneticSequencing,
      sheepEndemicsPackage: endemicsClaimSession.sheepEndemicsPackage,
      numberOfSamplesTested: endemicsClaimSession.numberOfSamplesTested,
      reviewTestResults: endemicsClaimSession.reviewTestResults,
      ...getSheepFollowUpTestResults({
        isEndemicsFollowUp,
        isSheep,
        sheepTestResults,
      }),
      ...getHerdInformation({
        dateOfVisit,
        latestEndemicsApplication,
        herdId,
        herdName,
        herdCph,
        herdReasons,
        herdSame,
        herdVersion,
      }),
    },
  };
};
