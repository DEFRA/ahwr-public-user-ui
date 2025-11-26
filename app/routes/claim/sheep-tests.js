import HttpStatus from "http-status-codes";
import { claimRoutes, claimViews } from "../../constants/routes.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../session/index.js";
import { sheepTestTypes } from "../../constants/claim-constants.js";

const getHandler = {
  method: "GET",
  path: claimRoutes.sheepTests,
  options: {
    handler: async (request, h) => {
      const sessionEndemicsClaim = getSessionData(request, sessionEntryKeys.endemicsClaim);
      const sheepTestCheckboxItems = sheepTestTypes[sessionEndemicsClaim?.sheepEndemicsPackage].map(
        (test) => ({ ...test, checked: sessionEndemicsClaim.sheepTests?.includes(test.value) }),
      );

      return h.view(claimViews.sheepTests, {
        sheepTestCheckboxItems,
        backLink: claimRoutes.sheepEndemicsPackage,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: claimRoutes.sheepTests,
  options: {
    handler: async (request, h) => {
      const { sheepTests } = request.payload;
      const session = getSessionData(request, sessionEntryKeys.endemicsClaim);
      // TODO: Should emit event
      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.sheepTests,
        sheepTests,
      );

      if (!sheepTests) {
        // TODO: Should emit event
        await setSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.sheepTestResults,
          undefined,
        );
        const sheepTestCheckboxItems = sheepTestTypes[session?.sheepEndemicsPackage].map(
          (test) => ({ ...test, checked: sheepTests?.includes(test.value) }),
        );

        return h
          .view(claimViews.sheepTests, {
            sheepTestCheckboxItems,
            backLink: claimRoutes.sheepEndemicsPackage,
            errorMessage: {
              text: "Select a disease or condition",
              href: "#sheepTests",
            },
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      if (sheepTests === "other") {
        const sheepTestCheckboxItems = sheepTestTypes[session?.sheepEndemicsPackage].map(
          (test) => ({ ...test, checked: sheepTests?.includes(test.value) }),
        );

        return h
          .view(claimViews.sheepTests, {
            sheepTestCheckboxItems,
            backLink: claimRoutes.sheepEndemicsPackage,
            errorMessage: {
              text: "Select all diseases or conditions tested for in this package",
              href: "#sheepTests",
            },
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      const sheepTestResultValue = [
        ...(typeof sheepTests === "object" ? sheepTests : [sheepTests]),
      ].map((test, index) => ({
        diseaseType: test,
        result: session?.sheepTestResults?.find((item) => item.diseaseType === test)?.result || "",
        isCurrentPage: index === 0,
      }));
      // TODO: Should emit event
      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.sheepTestResults,
        sheepTestResultValue,
      );
      return h.redirect(claimRoutes.sheepTestResults);
    },
  },
};

export const sheepTestsHandlers = [getHandler, postHandler];
