export const getCrumbs = async (
  server,
  options = { url: "/cookies", crumbKey: "crumb" },
  mockForRequest = () => {},
) => {
  mockForRequest();
  const { crumbKey, url } = options;
  const res = await server.inject({ method: "GET", url });
  const cookieHeader = res.headers["set-cookie"];

  const regex = new RegExp(`${crumbKey}=([^",;\\\x7F]*)`);
  const crumb = cookieHeader[0].match(regex)[1];
  if (!crumb) {
    throw Error(`Crumb was not found, ensure name of cookie key is set to '${crumbKey}'.`);
  }
  return crumb;
};
