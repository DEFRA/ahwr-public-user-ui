import { poultryClaimRoutes } from "../constants/routes.js";
import { formatDate, upperFirstLetter } from "./display-helpers.js";
import { createdHerdRowObject, createImmutableRowObject } from "./generate-answer-rows.js";

const biosecurityUsefulnessLabels = {
  "very-useful": "Very useful",
  "somewhat-useful": "Somewhat useful",
  "not-very-useful": "Not very useful",
  "not-useful": "Not useful at all",
  "not-sure": "I am not sure yet",
};

const changesInBiosecurityLabels = {
  "infra-and-control": "Housing, buildings, infrastructure, and wild bird control",
  "people-and-hygiene": "People, visitors, and hygiene procedures",
  "movement-and-management": "Bird movements, and flock management",
  "bird-handling": "Feed, water, bedding, eggs, and waste handling",
  cleaning: "Cleaning, disinfection, and disease control",
  "no-recommendation": "No recommendations were made in my review",
};

const costOfChangesLabels = {
  "0-1500": "Up to £1,500",
  "1500-3000": "£1,500 to £3,000",
  "3000-4500": "£3,000 to £4,500",
  "over-4500": "Over £4,500",
  "not-sure": "I am not sure about the cost",
  "no-intention": "I do not intend to make changes",
};

export const buildPoultryRows = ({ poultryClaim, organisation, herds }) => {
  const organisationNameRow = createImmutableRowObject(
    "Business name",
    upperFirstLetter(organisation.name),
  );

  const dateOfVisitRow = createdHerdRowObject(
    "Date of visit",
    formatDate(poultryClaim.dateOfVisit),
    poultryClaimRoutes.dateOfVisit,
    "date of visit",
  );

  const { siteNameRow, cphNumberRow, siteOthersRow } = createSiteInformationRows(
    herds,
    poultryClaim,
  );

  const filteredPoultryTypes = poultryClaim.typesOfPoultry.filter((type) => type !== "chickens");

  const typesOfPoultryRow = createdHerdRowObject(
    "Species",
    upperFirstLetter(filteredPoultryTypes.join(", ").replace("-", " ")),
    poultryClaimRoutes.selectPoultryType,
    "species",
  );

  const minimumNumberOfBirdsRow = createdHerdRowObject(
    "Minimum number of birds",
    upperFirstLetter(poultryClaim.minimumNumberOfBirds),
    poultryClaimRoutes.minimumNumberOfBirds,
    "minimum number of birds",
  );

  const vetsNameRow = createdHerdRowObject(
    "Vet's name",
    upperFirstLetter(poultryClaim.vetsName),
    poultryClaimRoutes.vetName,
    "vet's name",
  );

  const vetsRCVSRow = createdHerdRowObject(
    "Vet's RCVS number",
    poultryClaim.vetRCVSNumber,
    poultryClaimRoutes.vetRcvs,
    "vet's RCVS number",
  );

  const {
    biosecurityAssessmentRow,
    biosecurityUsefulnessRow,
    changesInBiosecurityRow,
    costOfChangesRow,
  } = createBiosecurityRows(poultryClaim);

  const interviewRow = createdHerdRowObject(
    "Evaluation interview",
    upperFirstLetter(poultryClaim.interview),
    poultryClaimRoutes.interview,
    "evaluation interview",
  );

  return [
    organisationNameRow,
    dateOfVisitRow,
    siteNameRow,
    cphNumberRow,
    siteOthersRow,
    typesOfPoultryRow,
    minimumNumberOfBirdsRow,
    vetsNameRow,
    vetsRCVSRow,
    biosecurityAssessmentRow,
    biosecurityUsefulnessRow,
    changesInBiosecurityRow,
    costOfChangesRow,
    interviewRow,
  ];
};

export const buildPoultryClaimPayload = (poultryClaim) => {
  return {
    applicationReference: poultryClaim.latestPoultryApplication.reference,
    // This is a temporal claim reference
    reference: poultryClaim.reference,
    type: "REVIEW",
    createdBy: "admin",
    data: {
      dateOfVisit: poultryClaim.dateOfVisit,
      site: {
        id: poultryClaim.herdId ?? poultryClaim.tempSiteId,
        version: 1, // We don't update sites, should have the single version
        name: poultryClaim.herdName,
        cph: poultryClaim.herdCph,
        same: poultryClaim.isOnlyHerdOnSbi,
      },
      typesOfPoultry: poultryClaim.typesOfPoultry.filter((type) => type !== "chickens"),
      minimumNumberOfBirds: poultryClaim.minimumNumberOfBirds,
      vetsName: poultryClaim.vetsName,
      vetRCVSNumber: poultryClaim.vetRCVSNumber,
      biosecurity: poultryClaim.biosecurity,
      biosecurityUsefulness: poultryClaim.biosecurityUsefulness,
      changesInBiosecurity: poultryClaim.changesInBiosecurity,
      costOfChanges: poultryClaim.costOfChanges,
      interview: poultryClaim.interview,
    },
  };
};

function createBiosecurityRows(poultryClaim) {
  const biosecurityAssessmentRow = createdHerdRowObject(
    "Biosecurity assessment",
    upperFirstLetter(poultryClaim.biosecurity),
    poultryClaimRoutes.biosecurity,
    "biosecurity assessment",
  );

  const biosecurityUsefulnessRow = createdHerdRowObject(
    "Biosecurity usefulness",
    biosecurityUsefulnessLabels[poultryClaim.biosecurityUsefulness],
    poultryClaimRoutes.biosecurityUsefulness,
    "biosecurity usefulness",
  );

  const changesInBiosecurityRow = createdHerdRowObject(
    "Biosecurity recommended changes",
    changesInBiosecurityLabels[poultryClaim.changesInBiosecurity],
    poultryClaimRoutes.changesInBiosecurity,
    "biosecurity recommended changes",
  );

  const costOfChangesRow = createdHerdRowObject(
    "Expected cost for biosecurity changes",
    costOfChangesLabels[poultryClaim.costOfChanges],
    poultryClaimRoutes.costOfChanges,
    "expected cost for biosecurity changes",
  );
  return {
    biosecurityAssessmentRow,
    biosecurityUsefulnessRow,
    changesInBiosecurityRow,
    costOfChangesRow,
  };
}

function createSiteInformationRows(herds, poultryClaim) {
  const isExistingSite = herds?.some((herd) => herd.name === poultryClaim.herdName);

  const siteNameRow = isExistingSite
    ? createImmutableRowObject("Site name", poultryClaim.herdName)
    : createdHerdRowObject(
        "Site name",
        poultryClaim.herdName,
        poultryClaimRoutes.enterSiteName,
        "site name",
      );

  const cphNumberRow = isExistingSite
    ? createImmutableRowObject("Site CPH", poultryClaim.herdCph)
    : createdHerdRowObject(
        "Site CPH",
        poultryClaim.herdCph,
        poultryClaimRoutes.enterCphNumber,
        "site CPH",
      );

  const siteOthersRow = isExistingSite
    ? createImmutableRowObject(
        "Only site within the SBI",
        upperFirstLetter(poultryClaim.isOnlyHerdOnSbi),
      )
    : createdHerdRowObject(
        "Only site within the SBI",
        upperFirstLetter(poultryClaim.isOnlyHerdOnSbi),
        poultryClaimRoutes.siteOthersOnSbi,
        "only site within the SBI",
      );
  return { siteNameRow, cphNumberRow, siteOthersRow };
}
