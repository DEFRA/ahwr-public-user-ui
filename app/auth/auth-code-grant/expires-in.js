export const toISOString = (expiresIn) => {
  const now = new Date();
  now.setSeconds(now.getSeconds() + expiresIn);
  return now.toISOString();
};
