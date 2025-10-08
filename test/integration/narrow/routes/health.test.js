import { createServer } from "../../../../app/server.js";

jest.mock("../../../../app/constants/claim-statuses.js", () => ({
  closedViewStatuses: [2, 10, 7, 9, 8],
}));

test("get /health", async () => {
  const server = await createServer();
  const res = await server.inject({
    url: "/health",
  });

  expect(res.statusCode).toBe(200);
});

