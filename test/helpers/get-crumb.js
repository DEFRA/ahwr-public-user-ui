export const getCrumbFromSetCookie = (setCookie) => {
  const crumbCookie = setCookie.find((cookie) => cookie.startsWith("crumb="));

  const [crumbString] = crumbCookie.split(";");
  const [, crumb] = crumbString.split("=");

  return { crumb };
};

export const getCrumb = async (server, url) => {
  const res = await server.inject({
    url,
    auth: {
      credentials: {},
      strategy: "cookie",
    },
  });

  return getCrumbFromSetCookie(res.headers["set-cookie"]);
};
