import { getPersonSummary } from "../../../../../../app/api-requests/rpa-api/person.js";
import { sendRPAGetRequest } from "../../../../../../app/api-requests/rpa-api/send-get-request.js";

jest.mock("../../../../../../app/api-requests/rpa-api/send-get-request.js");

describe("getPersonSummary", () => {
  let logger;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = { setBindings: jest.fn() };
  });

  it("calls sendRPAGetRequest with correct arguments", async () => {
    const fakePerson = {
      id: "123",
      firstName: "John",
      middleName: "The",
      lastName: "Farmer",
    };

    sendRPAGetRequest.mockResolvedValueOnce({ _data: fakePerson });

    const apimAccessToken = "apim-token";
    const defraIdAccessToken = "defra-id-token";
    const crn = "1234567";

    const result = await getPersonSummary({
      apimAccessToken,
      crn,
      defraIdAccessToken,
      logger,
    });

    expect(sendRPAGetRequest).toHaveBeenCalledWith({
      url: "http://rpa.com",
      defraIdAccessToken,
      headers: {
        crn,
        Authorization: apimAccessToken,
      },
    });

    expect(logger.setBindings).toHaveBeenCalledWith({
      personSummaryId: "123",
    });

    expect(result).toEqual({
      ...fakePerson,
      name: "John The Farmer",
    });
  });

  it("formats the name correctly when middleName is missing", async () => {
    const fakePerson = {
      id: "999",
      firstName: "Alice",
      middleName: null,
      lastName: "Smith",
    };

    sendRPAGetRequest.mockResolvedValueOnce({ _data: fakePerson });

    const request = {
      apimAccessToken: "token",
      crn: "4321",
      defraIdAccessToken: "defra",
      logger,
    };

    const result = await getPersonSummary(request);

    expect(result.name).toBe("Alice Smith");
  });
});
