import { config } from "../../../../../../app/config/index.js";
import { createServer } from "../../../../../../app/server.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../../../../app/session/index.js";
import { when } from "jest-when";

jest.mock("../../../../../../app/session");

config.poultry.enabled = true;

const auth = { credentials: {}, strategy: "cookie" };
const url = "/poultry/date-of-review";

describe("GET /poultry/date-of-review", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();

    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
      .mockReturnValue({});

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.latestPoultryApplication,
      )
      .mockReturnValue({ status: "AGREED" });

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.confirmedDetails,
        sessionKeys.confirmedDetails,
      )
      .mockReturnValue(true);
  });

  afterAll(async () => {
    await server.stop();
    jest.resetAllMocks();
  });

  const options = {
    method: "GET",
    url,
    auth,
  };

  test("If there is no agreement, it gets redirected to create one", async () => {
    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.latestPoultryApplication,
      )
      .mockReturnValue({});
    const res = await server.inject(options);
    expect(res.statusCode).toBe(302);
    expect(res.headers.location.toString()).toEqual(`/poultry/you-can-claim-multiple`);
  });
});
