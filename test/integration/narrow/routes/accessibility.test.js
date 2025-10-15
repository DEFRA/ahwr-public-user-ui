import { createServer } from "../../../../app/server";
import { getByText, queryByText } from "@testing-library/dom";
import globalJsdom from "global-jsdom";
import "@testing-library/jest-dom";

describe("GET /accessibility", () => {
  let server;
  let cleanupJsdom;

  beforeAll(async () => {
    jest.resetAllMocks();
    jest.resetModules();

    server = await createServer();
    await server.initialize();

    jest.mock("../../../../app/session");
  });

  afterAll(async () => {
    await server.stop();
    if (cleanupJsdom) cleanupJsdom();
  });

  test("returns 200 when not logged in", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/accessibility",
    });

    expect(res.statusCode).toBe(200);

    cleanupJsdom = globalJsdom(res.payload);

    const heading = getByText(
      document.body,
      /Accessibility statement for Get funding to improve animal health and welfare/i,
    );
    expect(heading).toBeInTheDocument();

    const title = document.querySelector("title");
    expect(title?.textContent).toMatch(
      "Accessibility statement - Get funding to improve animal health and welfare - GOV.UK",
    );

    // Section titles
    const sections = [
      "How accessible this website is",
      "Feedback and contact information",
      "Enforcement procedure",
      "Technical information about this website’s accessibility",
      "Compliance status",
      "Non-accessible content",
      "What we’re doing to improve accessibility",
      "Preparation of this accessibility statement",
    ];
    sections.forEach((title) => {
      expect(queryByText(document.body, title)).toBeTruthy();
    });
  });
});
