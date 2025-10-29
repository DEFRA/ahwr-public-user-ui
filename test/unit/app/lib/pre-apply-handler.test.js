import { getApplicationsBySbi } from "../../../../app/api-requests/application-api";
import { userType } from "../../../../app/constants/constants";
import { preApplyHandler } from "../../../../app/lib/pre-apply-handler";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../../app/session";
import { when } from "jest-when";

jest.mock("../../../../app/session");
jest.mock("../../../../app/api-requests/application-api");

const mockSetBindings = jest.fn();

const getRequest = {
  method: "get",
  logger: {
    setBindings: mockSetBindings,
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

  test("sends an API request to get applications if they arent in the session, but organisation is in the session", async () => {
    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.farmerApplyData,
        sessionKeys.farmerApplyData.organisation,
      )
      .mockReturnValue(organisation);

    const closedNewWorldApplications = [
      {
        sbi: 112231312,
        type: "EE",
        reference: "IAHW-1111-2222",
        redacted: false,
        status: "CLOSED",
      },
    ];

    getApplicationsBySbi.mockResolvedValue(closedNewWorldApplications);

    await preApplyHandler(getRequest, h);

    expect(getApplicationsBySbi).toHaveBeenCalled();
    expect(setSessionData).toHaveBeenCalledWith(
      getRequest,
      sessionEntryKeys.application,
      sessionKeys.application,
      closedNewWorldApplications[0],
    );
  });

  test("does not send an API request to get applications if the application is already in the session", async () => {
    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.farmerApplyData,
        sessionKeys.farmerApplyData.organisation,
      )
      .mockReturnValue(organisation);

    const closedNewWorldApplication = {
      sbi: 112231312,
      type: "EE",
      reference: "IAHW-1111-2222",
      redacted: false,
      status: "CLOSED",
    };

    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.application)
      .mockReturnValue(closedNewWorldApplication);

    await preApplyHandler(getRequest, h);

    expect(getApplicationsBySbi).not.toHaveBeenCalled();
    expect(setSessionData).not.toHaveBeenCalled();
  });
});
