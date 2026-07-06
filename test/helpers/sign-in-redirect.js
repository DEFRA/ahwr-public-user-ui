export const testRedirectsToSignInWhenLoggedOut = ({ getResponse }) => {
  test("when not logged in redirects to /sign-in", async () => {
    const res = await getResponse();

    expect(res.statusCode).toBe(302);
    expect(res.headers.location.toString()).toEqual("/sign-in");
  });
};
