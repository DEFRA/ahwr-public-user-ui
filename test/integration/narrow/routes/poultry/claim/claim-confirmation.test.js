import * as cheerio from "cheerio";
import { axe } from "../../../../../helpers/axe-helper.js";
import { createServer } from "../../../../../../app/server.js";
import {
  clearPoultryClaim,
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../../../../app/session/index.js";
import { when } from "jest-when";

jest.mock("../../../../../../app/session");

describe("Claim confirmation", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.reference,
      )
      .mockReturnValue("POUL-1LZ5-ELVQ");
  });

  afterAll(async () => {
    await server.stop();
  });

  const reference = "TBD-F021-723B";
  const auth = { credentials: {}, strategy: "cookie" };
  const url = `/poultry/claim-confirmation`;

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("GET endemicsConfirmation route %s", async () => {
    const options = {
      method: "GET",
      url,
      auth,
    };

    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
      .mockReturnValue({
        reference,
        amount: 430,
      });

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

    const res = await server.inject(options);

    expect(await axe(res.payload)).toHaveNoViolations();

    const $ = cheerio.load(res.payload);

    expect(res.statusCode).toBe(200);
    expect($("#amount").text()).toContain("430");
    expect($("#reference").text().trim()).toEqual(reference);
    expect($("#message").text().trim()).toContain("poultry biosecurity review");
    expect(clearPoultryClaim).toHaveBeenCalled();
    const guidanceLink = $("p:contains('poultry biosecurity review') a.govuk-link");
    expect(guidanceLink.attr("href")).toBe(
      "https://www.gov.uk/guidance/poultry-biosecurity-review-funding-guidance-for-poultry-keepers-and-vets#how-to-have-a-poultry-biosecurity-review",
    );
    expect(guidanceLink.text()).toContain("read the guidance");
  });
});
