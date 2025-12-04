import Joi from "joi";
import { getErrorResultObject, getErrorResultString } from "../utils/disease-type-test-result.js";
import { radios } from "../models/form-component/radios.js";
import HttpStatus from "http-status-codes";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../session/index.js";
import { claimRoutes, claimViews } from "../../constants/routes.js";
import { sheepTestResultsType, sheepTestTypes } from "../../constants/claim-constants.js";

const MAX_ALLOWED_CHARS = 500;
const VALIDATOR_PATTERN = /^(?!.*\s{2,})[a-zA-Z0-9\s-]{1,500}$/;

const routes = (request) => {
  const { sheepTestResults } = getSessionData(request, sessionEntryKeys.endemicsClaim);

  const currentDiseaseTypeIndex = sheepTestResults.findIndex((test) => test.isCurrentPage);
  const previousDiseaseTypeIndex = currentDiseaseTypeIndex - 1;
  const nextPageDiseaseTypeIndex = currentDiseaseTypeIndex + 1;

  const currentDiseaseType = sheepTestResults[currentDiseaseTypeIndex]?.diseaseType;
  const previousDiseaseType =
    previousDiseaseTypeIndex >= 0 && sheepTestResults[previousDiseaseTypeIndex]?.diseaseType;
  const nextPageDiseaseType =
    nextPageDiseaseTypeIndex <= sheepTestResults.length - 1 &&
    sheepTestResults[nextPageDiseaseTypeIndex]?.diseaseType;

  return {
    currentPage: `${claimRoutes.sheepTestResults}?diseaseType=${currentDiseaseType}`,
    nextPage: nextPageDiseaseType
      ? `${claimRoutes.sheepTestResults}?diseaseType=${nextPageDiseaseType}`
      : claimRoutes.checkAnswers,
    previousPage: previousDiseaseType
      ? `${claimRoutes.sheepTestResults}?diseaseType=${previousDiseaseType}`
      : claimRoutes.sheepTests,
  };
};

const TEST_RESULT_ELEMENT_ID = "testResult";
const DISEASE_TYPE_ELEMENT_ID = "diseaseType";

const emptyTestResultErrorMessage = "Enter the result";
const duplicatedItemErrorMessage = "You’ve already included this kind of disease";
const emptyDiseaseTypeErrorMessage = "Enter the condition or disease";

const fieldValidator = (fieldName) =>
  Joi.string()
    .trim()
    .max(MAX_ALLOWED_CHARS)
    .pattern(VALIDATOR_PATTERN)
    .required()
    .messages({
      "any.required":
        fieldName === "diseaseType" ? emptyDiseaseTypeErrorMessage : emptyTestResultErrorMessage,
      "string.base":
        fieldName === "diseaseType" ? emptyDiseaseTypeErrorMessage : emptyTestResultErrorMessage,
      "string.empty":
        fieldName === "diseaseType" ? emptyDiseaseTypeErrorMessage : emptyTestResultErrorMessage,
      "string.max": `${fieldName === "diseaseType" ? "Condition or disease" : "Test result"} must be 500 characters or fewer`,
      "string.pattern.base": `${fieldName === "diseaseType" ? "Condition or disease" : "Test result"} must only include letters a to z, numbers, special characters such as hyphens and spaces`,
    });

const title = (diseaseType) => `What was the ${diseaseType} result?`;
const inputText = (id, text, value, classes, errorMessage) => ({
  id,
  name: id,
  label: { text },
  value,
  classes,
  errorMessage,
});

const getPageContent = (request, data) => {
  const { sheepEndemicsPackage, sheepTestResults } = getSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
  );
  const { diseaseType, result } = sheepTestResults.find((test) => test.isCurrentPage);
  const testResultOptions = sheepTestResultsType[diseaseType];

  let headingText = "Other condition or disease details";
  if (testResultOptions) {
    const diseaseTypeText = sheepTestTypes[sheepEndemicsPackage].find(
      (test) => test.value === diseaseType,
    ).text;
    headingText = title(diseaseTypeText);
    return {
      pageTitle: headingText,
      ...radios(headingText, TEST_RESULT_ELEMENT_ID, data?.error && "Select a result", {
        hintHtml: "You can find this on the summary the vet gave you.",
      })(
        testResultOptions.map((test) => ({
          value: test.value,
          text: test.text,
          checked: result === test.value,
        })),
      ),
    };
  }

  const inputTexts = [
    inputText(
      DISEASE_TYPE_ELEMENT_ID,
      emptyDiseaseTypeErrorMessage,
      data?.diseaseType?.value,
      "govuk-!-width-two-thirds",
      data?.diseaseType?.text && { text: data?.diseaseType?.text },
    ),
    inputText(
      TEST_RESULT_ELEMENT_ID,
      emptyTestResultErrorMessage,
      data?.testResult?.value,
      "govuk-!-width-one-half govuk-!-margin-bottom-6",
      data?.testResult?.text && { text: data?.testResult?.text },
    ),
  ];

  return {
    title: headingText,
    pageTitle: headingText,
    inputTexts,
    result,
    resultLength: result.length,
    disableAddAnotherButton: result.length === 10,
  };
};

const getDuplicatedItemIndexes = (input) => {
  if (!isOfTypeObject(input)) {
    return [];
  }

  const duplicates = new Map();

  input
    .map((item) => item.toLowerCase())
    .forEach((element, idx) => {
      const indices = duplicates.get(element) || [];
      indices.push(idx);
      duplicates.set(element, indices);
    });

  return Array.from(duplicates.values())
    .filter((item) => item.length > 1)
    .map((item) => item.slice(1))
    .flat()
    .map((item) => ({
      [item]: { text: duplicatedItemErrorMessage, href: `#${DISEASE_TYPE_ELEMENT_ID}-${item}` },
    }));
};

const getInvalidItemIndexes = (input, key) =>
  input
    .map((item, index) => {
      const validatedItem = fieldValidator(key).validate(item);

      if (validatedItem?.error) {
        return {
          [index]: { text: validatedItem?.error?.details[0].message, href: `#${key}-${index}` },
        };
      }

      return {};
    })
    .filter((item) => Object.keys(item)?.length);

const newDiseaseTypeErrorMessageAddAnother = (
  payload,
  diseaseTypeValidationError,
  testResultValidationError,
  lastIndex,
) => {
  return {
    diseaseType: {
      value: payload.diseaseType[lastIndex],
      ...((diseaseTypeValidationError
        ? { text: diseaseTypeValidationError, href: `#${DISEASE_TYPE_ELEMENT_ID}` }
        : payload.diseaseType.slice(0, lastIndex).includes(payload.diseaseType[lastIndex]) && {
            text: duplicatedItemErrorMessage,
            href: `#${DISEASE_TYPE_ELEMENT_ID}`,
          }) || {}),
    },
    testResult: {
      value: payload.testResult[lastIndex],
      ...(testResultValidationError && {
        text: testResultValidationError,
        href: `#${TEST_RESULT_ELEMENT_ID}`,
      }),
    },
  };
};

const newDiseaseTypeErrorMessageContinue = (
  payload,
  diseaseTypeValidationError,
  testResultValidationError,
  lastIndex,
) => {
  return {
    diseaseType: {
      value: payload.diseaseType[lastIndex],
      ...(diseaseTypeValidationError && {
        text: diseaseTypeValidationError,
        href: `#${DISEASE_TYPE_ELEMENT_ID}`,
      }),
    },
    testResult: {
      value: payload.testResult[lastIndex],
      ...(testResultValidationError && {
        text: testResultValidationError,
        href: `#${TEST_RESULT_ELEMENT_ID}`,
      }),
    },
  };
};
const newDiseaseInTheListValidation = (payload) => {
  let newDiseaseTypeErrorMessage;
  let newPayloadData = { ...payload };
  const lastIndex = payload.diseaseType.length - 1;
  const diseaseTypeValidationError = fieldValidator(DISEASE_TYPE_ELEMENT_ID).validate(
    `${payload.diseaseType[lastIndex]}`,
  )?.error?.details[0]?.message;
  const testResultValidationError = fieldValidator(TEST_RESULT_ELEMENT_ID).validate(
    `${payload.testResult[lastIndex]}`,
  )?.error?.details[0]?.message;

  if (diseaseTypeValidationError || testResultValidationError) {
    newPayloadData = {
      ...payload,
      diseaseType: payload.diseaseType.slice(0, lastIndex),
      testResult: payload.testResult.slice(0, lastIndex),
    };

    if (!payload?.delete && payload?.submitButton === "addAnother") {
      newDiseaseTypeErrorMessage = newDiseaseTypeErrorMessageAddAnother(
        payload,
        diseaseTypeValidationError,
        testResultValidationError,
        lastIndex,
      );
    }
    if (
      payload?.submitButton === "continue" &&
      (payload.diseaseType[lastIndex] || payload.testResult[lastIndex])
    ) {
      newDiseaseTypeErrorMessage = newDiseaseTypeErrorMessageContinue(
        payload,
        diseaseTypeValidationError,
        testResultValidationError,
        lastIndex,
      );
    }
  } else if (payload.diseaseType.slice(0, lastIndex).includes(payload.diseaseType[lastIndex])) {
    newPayloadData = {
      ...payload,
      diseaseType: payload.diseaseType.slice(0, lastIndex),
      testResult: payload.testResult.slice(0, lastIndex),
    };

    if (!payload?.delete) {
      newDiseaseTypeErrorMessage = {
        diseaseType: {
          value: payload.diseaseType[lastIndex],
          text: duplicatedItemErrorMessage,
          href: `#${DISEASE_TYPE_ELEMENT_ID}`,
        },
        testResult: { value: payload.testResult[lastIndex] },
      };
    }
  } else {
    newPayloadData = { ...payload };
  }

  return { newPayloadData, newDiseaseTypeErrorMessage };
};

const getDiseaseTypeErrorMessage = (diseaseTypeEmptyItems, duplicateItems) => {
  let diseaseTypeErrorList;

  if (diseaseTypeEmptyItems?.length && duplicateItems.length) {
    diseaseTypeErrorList = [
      ...diseaseTypeEmptyItems,
      ...duplicateItems.filter(
        (item) =>
          !diseaseTypeEmptyItems?.length ||
          !diseaseTypeEmptyItems?.find(
            (emptyItem) => Object.keys(emptyItem)[0] === Object.keys(item)[0],
          ),
      ),
    ];
  } else if (duplicateItems.length) {
    diseaseTypeErrorList = [...duplicateItems];
  } else if (diseaseTypeEmptyItems?.length) {
    diseaseTypeErrorList = [...diseaseTypeEmptyItems];
  } else {
    diseaseTypeErrorList = [];
  }

  return diseaseTypeErrorList;
};

const updateDiseaseType = (diseaseTypeErrorList, testResultEmptyItems, payloadData) => {
  let result;

  if (diseaseTypeErrorList.length || testResultEmptyItems.length) {
    result = payloadData.diseaseType.map((disease, index) => ({
      diseaseType: disease,
      testResult: payloadData.testResult[index],
      errorMessage: {
        ...(diseaseTypeErrorList?.find((error) => error[index]) && {
          diseaseType: { text: diseaseTypeErrorList?.find((error) => error[index])[index].text },
        }),
        ...(testResultEmptyItems?.find((error) => error[index]) && {
          testResult: { text: testResultEmptyItems?.find((error) => error[index])[index].text },
        }),
      },
    }));
  } else {
    result =
      typeof payloadData.diseaseType === "object"
        ? payloadData.diseaseType.map((disease, index) => ({
            diseaseType: disease,
            testResult: payloadData.testResult[index],
          }))
        : [{ diseaseType: payloadData.diseaseType, testResult: payloadData.testResult }];
  }

  return result;
};

const hasError = (results) => {
  return results.find((result) => result);
};

const getErrorList = (diseaseTypeValidationError, testResultValidationError) => {
  return [
    diseaseTypeValidationError && {
      text: diseaseTypeValidationError,
      href: `#${DISEASE_TYPE_ELEMENT_ID}`,
    },
    testResultValidationError && {
      text: testResultValidationError,
      href: `#${TEST_RESULT_ELEMENT_ID}`,
    },
  ];
};

const isOfTypeObject = (value) => {
  return typeof value === "object";
};

const getEmptyItems = (items, itemType) => {
  return isOfTypeObject(items) ? getInvalidItemIndexes(items, itemType) : [];
};

const getHandler = {
  method: "GET",
  path: claimRoutes.sheepTestResults,
  options: {
    handler: async (request, h) => {
      const endemicsClaim = getSessionData(request, sessionEntryKeys.endemicsClaim);
      if (request.query?.diseaseType && endemicsClaim?.sheepTestResults) {
        const updatedSheepTestResults = endemicsClaim?.sheepTestResults.map((test) =>
          test.diseaseType === request?.query?.diseaseType
            ? { ...test, isCurrentPage: true }
            : { ...test, isCurrentPage: false },
        );

        await setSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.sheepTestResults,
          updatedSheepTestResults,
        );
      }

      const pageContent = getPageContent(request);
      const { previousPage } = routes(request);

      return h.view(claimViews.sheepTestResults, {
        ...pageContent,
        backLink: previousPage,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: claimRoutes.sheepTestResults,
  options: {
    handler: async (request, h) => {
      const { payload } = request;
      const { nextPage, previousPage } = routes(request);
      const { sheepTestResults } = getSessionData(request, sessionEntryKeys.endemicsClaim);
      const diseaseTypeIndex = sheepTestResults.findIndex((test) => test.isCurrentPage);
      const diseaseType = sheepTestResults[diseaseTypeIndex];
      const updatedSheepTestResults = [...sheepTestResults];

      if (diseaseType?.diseaseType !== "other") {
        const pageContent = getPageContent(request, { error: true });
        const backLink = previousPage;
        const errorList = [{ text: "Select a result", href: `#${TEST_RESULT_ELEMENT_ID}` }];

        if (!payload?.testResult) {
          return h
            .view(claimViews.sheepTestResults, { ...pageContent, backLink, errorList })
            .code(HttpStatus.BAD_REQUEST)
            .takeover();
        }

        diseaseType.result = payload.testResult;

        updatedSheepTestResults[diseaseTypeIndex] = diseaseType;

        await setSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.sheepTestResults,
          updatedSheepTestResults,
        );

        return h.redirect(nextPage);
      }

      if (payload?.delete) {
        payload.diseaseType = payload.diseaseType.filter(
          (_, index) => index !== Number(payload.delete),
        );
        payload.testResult = payload.testResult.filter(
          (_, index) => index !== Number(payload.delete),
        );
      }

      const results = getErrorResultString(payload, fieldValidator);
      const diseaseTypeValidationError = results?.diseaseType?.text;
      const testResultValidationError = results?.testResult?.text;

      if (hasError([diseaseTypeValidationError, testResultValidationError])) {
        const pageContent = getPageContent(request, results);

        return h
          .view(claimViews.sheepTestResults, {
            ...pageContent,
            backLink: previousPage,
            errorList: getErrorList(diseaseTypeValidationError, testResultValidationError),
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      const { newPayloadData: payloadData, newErrorMessage: newDiseaseTypeErrorMessage } =
        getErrorResultObject(payload, newDiseaseInTheListValidation);

      const diseaseTypeEmptyItems = getEmptyItems(payloadData.diseaseType, DISEASE_TYPE_ELEMENT_ID);
      const testResultEmptyItems = getEmptyItems(payloadData.testResult, TEST_RESULT_ELEMENT_ID);
      const duplicateItems = getDuplicatedItemIndexes(payloadData.diseaseType);

      const diseaseTypeErrorList = getDiseaseTypeErrorMessage(
        diseaseTypeEmptyItems,
        duplicateItems,
      );

      diseaseType.result = updateDiseaseType(
        diseaseTypeErrorList,
        testResultEmptyItems,
        payloadData,
      );

      updatedSheepTestResults[diseaseTypeIndex] = diseaseType;

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.sheepTestResults,
        updatedSheepTestResults,
      );

      if (
        hasError([
          diseaseTypeErrorList.length,
          testResultEmptyItems.length,
          newDiseaseTypeErrorMessage,
        ])
      ) {
        const pageContent = getPageContent(request, {
          diseaseType: newDiseaseTypeErrorMessage?.diseaseType,
          testResult: newDiseaseTypeErrorMessage?.testResult,
        });

        return h
          .view(claimViews.sheepTestResults, {
            ...pageContent,
            backLink: previousPage,
            errorList: [
              ...(diseaseTypeErrorList?.length
                ? diseaseTypeErrorList.map((error) => Object.values(error)[0])
                : []),
              ...(testResultEmptyItems?.length
                ? testResultEmptyItems.map((error) => Object.values(error)[0])
                : []),
              newDiseaseTypeErrorMessage?.diseaseType,
              newDiseaseTypeErrorMessage?.testResult,
            ],
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      if (payloadData?.submitButton === "continue") {
        return h.redirect(nextPage);
      }

      return h.view(claimViews.sheepTestResults, {
        ...getPageContent(request),
        backLink: previousPage,
      });
    },
  },
};

export const sheepTestResultsHandlers = [getHandler, postHandler];
