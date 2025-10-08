import { showMultiHerdsBanner } from "../../../../../app/routes/utils/show-multi-herds-banner";
import { config } from "../../../../../app/config/index.js";

const { multiHerds } = config;

jest.mock("../../../../../app/config/index");
multiHerds.enabled = true;
beforeEach(() => {
  jest.resetAllMocks();
});

test("user has no applications, so we shouldn't show the banner", () => {
  const applications = [];
  const claims = [];

  const result = showMultiHerdsBanner(applications, claims);

  expect(result).toBe(false);
});

test("user applied before MH was released, and has no claims, so we should show the banner", () => {
  jest.replaceProperty(multiHerds, "releaseDate", "2024-12-04");

  const applications = [{ createdAt: "2024-12-03" }];
  const claims = [];

  const result = showMultiHerdsBanner(applications, claims);

  expect(result).toBe(true);
});

test("user applied before MH was released and their last claim was before MH was released, so we should show the banner", () => {
  jest.replaceProperty(multiHerds, "releaseDate", "2024-12-04");

  const applications = [{ createdAt: "2024-12-03" }];
  const claims = [{ createdAt: "2024-12-03" }];

  const result = showMultiHerdsBanner(applications, claims);

  expect(result).toBe(true);
});

test("user applied before MH was released and their most recent claim was after MH was released, so we shouldn't show the banner", () => {
  jest.replaceProperty(multiHerds, "releaseDate", "2024-12-04");

  const applications = [{ createdAt: "2024-12-03" }];
  const claims = [{ createdAt: "2024-12-05" }];

  const result = showMultiHerdsBanner(applications, claims);

  expect(result).toBe(false);
});

test("user applied after MH was released, and has no claims yet, so we shouldn't show the banner", () => {
  jest.replaceProperty(multiHerds, "releaseDate", "2024-12-04");

  const applications = [{ createdAt: "2024-12-05" }];
  const claims = [];

  const result = showMultiHerdsBanner(applications, claims);

  expect(result).toBe(false);
});
