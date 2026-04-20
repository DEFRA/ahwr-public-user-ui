import { poultryClaimRoutes } from "../constants/routes.js";
import { formatDate, upperFirstLetter } from "./display-helpers.js";
import { createdHerdRowObject, createImmutableRowObject } from "./generate-answer-rows.js";

export const buildPoultryRows = ({ poultryClaim, organisation, herds }) => {
  const organisationNameRow = createImmutableRowObject(
    "BusinessName",
    upperFirstLetter(organisation.name),
  );

  const dateOfReviewRow = createdHerdRowObject(
    "Date of review",
    formatDate(poultryClaim.dateOfReview),
    poultryClaimRoutes.dateOfReview,
    "date of review",
  );

  const { siteNameRow, cphNumberRow, siteOthersRow } = createSiteInformationRows(
    herds,
    poultryClaim,
  );

  const filteredPoultryTypes = poultryClaim.typesOfPoultry.filter((type) => type !== "chickens");

  const typesOfPoultryRow = createdHerdRowObject(
    "Species",
    upperFirstLetter(filteredPoultryTypes.join(", ")),
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
    dateOfReviewRow,
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

export const buildPoultryClaimPayload = (poultryClaimSession) => {
  return {
    applicationReference: poultryClaimSession.latestPoultryApplication.reference,
    // This is a temporal claim reference
    reference: poultryClaimSession.reference,
    type: "Review",
    createdBy: "admin",
    data: {
      dateOfReview: poultryClaimSession.dateOfReview,
      siteName: poultryClaimSession.herdName,
      siteCph: poultryClaimSession.herdCph,
      isOnlySite: poultryClaimSession.isOnlyHerdOnSbi,
      typesOfPoultry: poultryClaimSession.typesOfPoultry.filter((type) => type !== "chickens"),
      minimumNumberOfBirds: poultryClaimSession.minimumNumberOfBirds,
      vetsName: poultryClaimSession.vetsName,
      vetRCVSNumber: poultryClaimSession.vetRCVSNumber,
      biosecurity: poultryClaimSession.biosecurity,
      biosecurityUsefulness: poultryClaimSession.biosecurityUsefulness,
      changesInBiosecurity: poultryClaimSession.changesInBiosecurity,
      costOfChanges: poultryClaimSession.costOfChanges,
      interview: poultryClaimSession.interview,
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
    upperFirstLetter(poultryClaim.biosecurityUsefulness),
    poultryClaimRoutes.biosecurityUsefulness,
    "biosecurity usefulness",
  );

  const changesInBiosecurityRow = createdHerdRowObject(
    "Biosecurity recommended changes",
    upperFirstLetter(poultryClaim.changesInBiosecurity),
    poultryClaimRoutes.changesInBiosecurity,
    "biosecurity recommended changes",
  );

  const costOfChangesRow = createdHerdRowObject(
    "Expected cost for biosecurity changes",
    upperFirstLetter(poultryClaim.costOfChanges),
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
