import {
  lookupSubmissionCrumb,
  cacheSubmissionCrumb,
  generateNewCrumb,
} from "../../../../../app/routes/utils/crumb-cache";

describe("Crumb Functions", () => {
  let request;
  let h;

  beforeEach(() => {
    request = {
      server: {
        app: {
          submissionCrumbCache: {
            get: jest.fn(),
            set: jest.fn().mockResolvedValue(undefined),
          },
        },
        plugins: {
          crumb: {
            generate: jest.fn(),
          },
        },
      },
      plugins: {
        crumb: "test-crumb",
      },
    };

    h = {}; // Mock response toolkit if needed
  });

  test("lookupSubmissionCrumb returns cached crumb", async () => {
    request.server.app.submissionCrumbCache.get.mockResolvedValue({
      crumb: "test-crumb",
    });

    const result = await lookupSubmissionCrumb(request);

    expect(request.server.app.submissionCrumbCache.get).toHaveBeenCalledWith("test-crumb");
    expect(result).toEqual({ crumb: "test-crumb" });
  });

  test("lookupSubmissionCrumb returns empty object if crumb not found", async () => {
    request.server.app.submissionCrumbCache.get.mockResolvedValue(null);

    const result = await lookupSubmissionCrumb(request);

    expect(request.server.app.submissionCrumbCache.get).toHaveBeenCalledWith("test-crumb");
    expect(result).toEqual({});
  });

  test("cacheSubmissionCrumb caches the crumb", async () => {
    await cacheSubmissionCrumb(request);

    expect(request.server.app.submissionCrumbCache.set).toHaveBeenCalledWith("test-crumb", {
      crumb: "test-crumb",
    });
  });

  test("generateNewCrumb generates and logs a new crumb", async () => {
    const newCrumb = "new-crumb";
    request.server.plugins.crumb.generate.mockResolvedValue(newCrumb);

    await generateNewCrumb(request, h);

    expect(request.server.plugins.crumb.generate).toHaveBeenCalledWith(request, h);
  });
});
