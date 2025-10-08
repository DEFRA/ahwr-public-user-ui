import { createServer } from "../../../../app/server.js";

jest.mock("../../../../app/constants/claim-statuses.js", () => ({
  closedViewStatuses: [2, 10, 7, 9, 8],
}));

test("get /healthy", async () => {
  const server = await createServer();
  const res = await server.inject({
    url: "/healthy",
  });

  expect(res.statusCode).toBe(200);
});

test("get /healthz", async () => {
  const server = await createServer();
  const res = await server.inject({
    url: "/healthz",
  });

  expect(res.statusCode).toBe(200);
});
