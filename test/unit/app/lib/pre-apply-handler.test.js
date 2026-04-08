import { getApplicationsBySbi } from "../../../../app/api-requests/application-api.js";
import { userType } from "../../../../app/constants/constants.js";
import { preApplyHandler } from "../../../../app/lib/pre-apply-handler.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionEntry,
} from "../../../../app/session/index.js";
import { when } from "jest-when";

jest.mock("../../../../app/session");
jest.mock("../../../../app/api-requests/application-api");

const mockSetBindings = jest.fn();
const error = jest.fn();

const getRequest = {
  method: "get",
  logger: {
    setBindings: mockSetBindings,
    error,
  },
};

const postRequest = {
  method: "post",
  logger: {
    setBindings: mockSetBindings,
  },
};

const mockContinue = jest.fn();

const h = {
  continue: mockContinue,
  redirect: jest.fn().mockReturnThis(),
  takeover: jest.fn(),
};

const organisation = {
  id: "organisation",
  name: "org-name",
  address: "1 fake street, fakerton, FA1 2DA",
  sbi: "0123456789",
  userType: userType.NEW_USER,
};

describe("preApplyHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock setup for generateApplicationEvent
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.application)
      .mockReturnValue(null);

    getApplicationsBySbi.mockResolvedValue([]);
  });

  test("nothing happens if the request is not a GET", async () => {
    await preApplyHandler(postRequest, h);

    expect(getSessionData).not.toHaveBeenCalled();
  });

  test("throws an error if the post request has no organisation in the session", async () => {
    try {
      await preApplyHandler(getRequest, h);
    } catch (error) {
      expect(error.message).toEqual("No organisation found in session");
    }

    expect(getSessionData).toHaveBeenCalled();
  });

  test("allows apply journey when latestEndemicsApplication is undefined", async () => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.organisation)
      .mockReturnValue(organisation);

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.latestEndemicsApplication,
      )
      .mockReturnValue(undefined);

    const result = await preApplyHandler(getRequest, h);

    expect(result).toBe(mockContinue);
    expect(h.redirect).not.toHaveBeenCalled();
  });

  test("allows apply journey when latestEndemicsApplication has non-AGREED status", async () => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.organisation)
      .mockReturnValue(organisation);

    const closedApplication = {
      sbi: 112231312,
      type: "EE",
      reference: "IAHW-1111-2222",
      redacted: false,
      status: "CLOSED",
    };

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.latestEndemicsApplication,
      )
      .mockReturnValue(closedApplication);

    const result = await preApplyHandler(getRequest, h);

    expect(result).toBe(mockContinue);
    expect(h.redirect).not.toHaveBeenCalled();
  });

  test("returns a redirect if user already has an agreed agreement", async () => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.organisation)
      .mockReturnValue(organisation);

    const agreedApplication = {
      sbi: 112231312,
      type: "EE",
      reference: "IAHW-1111-2222",
      redacted: false,
      status: "AGREED",
    };

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.latestEndemicsApplication,
      )
      .mockReturnValue(agreedApplication);

    await preApplyHandler(getRequest, h);

    expect(error).toHaveBeenCalledWith(
      {
        error: expect.any(Error),
        event: {
          category: "user-action",
          type: "exception",
        },
      },
      "User attempted to use apply journey despite already having an agreed agreement.",
    );
    expect(h.redirect).toHaveBeenCalledWith("/vet-visits");
  });

  test("allows apply journey if application is agreed but redacted", async () => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.organisation)
      .mockReturnValue(organisation);

    const redactedApplication = {
      sbi: 112231312,
      type: "EE",
      reference: "IAHW-1111-2222",
      redacted: true,
      status: "AGREED",
    };

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.latestEndemicsApplication,
      )
      .mockReturnValue(redactedApplication);

    const result = await preApplyHandler(getRequest, h);

    expect(result).toBe(mockContinue);
    expect(h.redirect).not.toHaveBeenCalled();
  });

  describe("generateApplicationEvent", () => {
    test("fetches from API and sets application in session when not cached", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.organisation)
        .mockReturnValue(organisation);

      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.latestEndemicsApplication,
        )
        .mockReturnValue(undefined);

      const apiApplication = {
        sbi: 112231312,
        type: "EE",
        reference: "IAHW-1111-2222",
        status: "CLOSED",
      };

      getApplicationsBySbi.mockResolvedValue([apiApplication]);

      await preApplyHandler(getRequest, h);

      expect(getApplicationsBySbi).toHaveBeenCalledWith(organisation.sbi);
      expect(setSessionEntry).toHaveBeenCalledWith(
        getRequest,
        sessionEntryKeys.application,
        apiApplication,
        { journey: "apply" },
      );
    });

    test("does not fetch from API when application is already cached", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.organisation)
        .mockReturnValue(organisation);

      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.latestEndemicsApplication,
        )
        .mockReturnValue(undefined);

      const cachedApplication = {
        sbi: 112231312,
        type: "EE",
        reference: "IAHW-1111-2222",
        status: "CLOSED",
      };

      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.application)
        .mockReturnValue(cachedApplication);

      await preApplyHandler(getRequest, h);

      expect(getApplicationsBySbi).not.toHaveBeenCalled();
      expect(setSessionEntry).not.toHaveBeenCalled();
    });

    test("sets application to null when API returns no ENDEMICS applications", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.organisation)
        .mockReturnValue(organisation);

      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.latestEndemicsApplication,
        )
        .mockReturnValue(undefined);

      const poultryApplication = {
        sbi: 112231312,
        type: "POUL",
        reference: "POUL-1111-2222",
        status: "AGREED",
      };

      getApplicationsBySbi.mockResolvedValue([poultryApplication]);

      await preApplyHandler(getRequest, h);

      expect(setSessionEntry).toHaveBeenCalledWith(getRequest, sessionEntryKeys.application, null, {
        journey: "apply",
      });
    });
  });
});
