import { createServer } from "../../../../app/server.js";
import { getByRole } from "@testing-library/dom";
import globalJsdom from "global-jsdom";

test("get /update-details", async () => {
  const server = await createServer();

  const { payload } = await server.inject({
    url: "/update-details",
    auth: {
      credentials: {},
      strategy: "cookie",
    },
  });
  globalJsdom(payload);

  expect(
    getByRole(document.body, "link", {
      name: "Sign in to the Rural Payments service",
    }),
  ).toHaveProperty("href", "https://www.gov.uk/claim-rural-payments");
});
