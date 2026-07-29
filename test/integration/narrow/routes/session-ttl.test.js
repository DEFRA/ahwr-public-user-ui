import { createServer } from "../../../../app/server.js";

const getSetCookie = (res, name) => {
  return (res.headers["set-cookie"] ?? []).find((cookie) => cookie.startsWith(`${name}=`));
};

const getMaxAge = (setCookieValue) => {
  const match = /Max-Age=(\d+)/i.exec(setCookieValue);
  return match ? Number.parseInt(match[1], 10) : undefined;
};

describe("session TTL", () => {
  let server;
  let response;

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();
    response = await server.inject({ method: "GET", url: "/accessibility" });
  });

  afterAll(async () => {
    await server.stop();
  });

  test("the session cookie is issued with a 30 minute max-age", () => {
    const authCookie = getSetCookie(response, "ahwr_session");

    expect(authCookie).toBeDefined();
    expect(getMaxAge(authCookie)).toBe(1800);
  });
});
