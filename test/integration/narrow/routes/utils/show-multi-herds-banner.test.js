import { showMultiHerdsBanner } from "../../../../../app/routes/utils/show-multi-herds-banner";

beforeEach(() => {
  jest.resetAllMocks();
});

test("user has no applications, so we shouldn't show the banner", () => {
  const application = {};
  const claims = [];

  const result = showMultiHerdsBanner(application, claims);

  expect(result).toBe(false);
});

test("user applied before MH was released, and has no claims, so we should show the banner", () => {
  const application = { createdAt: "2025-06-25" };
  const claims = [];

  const result = showMultiHerdsBanner(application, claims);

  expect(result).toBe(true);
});

test("user applied before MH was released and their last claim was before MH was released, so we should show the banner", () => {
  const application = { createdAt: "2025-06-25" };
  const claims = [{ createdAt: "2025-06-25" }];

  const result = showMultiHerdsBanner(application, claims);

  expect(result).toBe(true);
});

test("user applied before MH was released and their most recent claim was after MH was released, so we shouldn't show the banner", () => {
  const application = { createdAt: "2025-06-25" };
  const claims = [{ createdAt: "2025-06-27" }];

  const result = showMultiHerdsBanner(application, claims);

  expect(result).toBe(false);
});

test("user applied after MH was released, and has no claims yet, so we shouldn't show the banner", () => {
  const application = { createdAt: "2025-06-26" };
  const claims = [];

  const result = showMultiHerdsBanner(application, claims);

  expect(result).toBe(false);
});
