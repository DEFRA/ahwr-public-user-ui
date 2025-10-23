import { claimRoutes } from "../constants/routes.js";
import { PIG_GENETIC_SEQUENCING_VALUES } from "ffc-ahwr-common-library";

export const generatePigStatusAnswerRows = (sessionData) => {
  const testResultRow = {
    key: { text: "Test result" },
    value: {
      html: prefixResultForTestType(sessionData.pigsElisaTestResult, sessionData.pigsPcrTestResult),
    },
    actions: {
      items: [
        {
          href: sessionData.pigsElisaTestResult ? claimRoutes.pigsElisaResult : claimRoutes.pigsPcrResult,
          text: "Change",
          visuallyHiddenText: "test result",
        },
      ],
    },
  };

  const geneticSequencingResultRow = {
    key: { text: "Genetic sequencing test results" },
    value: {
      html: PIG_GENETIC_SEQUENCING_VALUES.find((x) => x.value === sessionData.pigsGeneticSequencing)
        ?.label,
    },
    actions: {
      items: [
        {
          href: claimRoutes.pigsGeneticSequencing,
          text: "Change",
          visuallyHiddenText: "genetic sequencing test results",
        },
      ],
    },
  };

  return [testResultRow, geneticSequencingResultRow];
};

const prefixResultForTestType = (elisaValue, pcrValue) => {
  if (elisaValue) {
    return `ELISA ${elisaValue}`;
  }

  if (pcrValue) {
    return `PCR ${pcrValue}`;
  }
  return undefined;
};
