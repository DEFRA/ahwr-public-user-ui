export const getLatestApplication = (latestApplicationsForSbi) => {
  return latestApplicationsForSbi.reduce((a, b) => {
    return new Date(a.createdAt) > new Date(b.createdAt) ? a : b;
  });
};

export const isWithin10Months = (d) => {
  const date = new Date(d);
  const datePlus10Months = date.setMonth(date.getMonth() + 10);
  return datePlus10Months >= Date.now();
};
