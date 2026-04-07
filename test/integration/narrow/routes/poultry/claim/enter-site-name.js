import { when } from "jest-when";
import { createServer } from "../../../../../../app/server.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../../../../app/session/index.js";

const auth = { credentials: {}, strategy: "cookie" };
const url = "/poultry/enter-site-name";

describe("GET /poultry/enter-site-name", () => {
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
