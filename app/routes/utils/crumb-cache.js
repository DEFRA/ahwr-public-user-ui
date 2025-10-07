export const lookupSubmissionCrumb = async (request) => {
  const { submissionCrumbCache } = request.server.app;
  return (await submissionCrumbCache.get(request.plugins.crumb)) ?? {};
};

export const cacheSubmissionCrumb = async (request) => {
  const { submissionCrumbCache } = request.server.app;
  const crumb = request.plugins.crumb;
  await submissionCrumbCache.set(crumb, { crumb });
};

export const generateNewCrumb = async (request, h) => {
  request.plugins.crumb = null;
  await request.server.plugins.crumb.generate(request, h);
};
