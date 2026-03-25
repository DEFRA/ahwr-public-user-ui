const sharedConfig = {
  restoreMocks: true,
  setupFilesAfterEnv: ["<rootDir>/test/setup.js"],
  transform: {
    "^.+\\.[j]sx?$": "babel-jest",
  },
  transformIgnorePatterns: ["/node_modules/@defra/(?!(hapi-tracing)/)"],
  modulePathIgnorePatterns: ["node_modules"],
  watchPathIgnorePatterns: ["\\.#"],
};

module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ["**/*.js", "!**/*.test.js"],
  coverageDirectory: "test-output",
  coverageReporters: ["text-summary", "lcov"],
  coveragePathIgnorePatterns: [
    "<rootDir>/app/frontend/",
    "<rootDir>/node_modules/",
    "<rootDir>/test-output/",
    "<rootDir>/test/",
    "<rootDir>/jest.config.cjs",
    "<rootDir>/webpack.config.js",
  ],
  reporters: [
    "default",
    [
      "jest-junit",
      {
        suiteName: "jest tests",
        outputDirectory: "test-output",
        outputName: "junit.xml",
      },
    ],
  ],
  verbose: true,
  projects: [
    {
      ...sharedConfig,
      displayName: "unit",
      testMatch: ["<rootDir>/test/unit/**/*.test.js"],
      testEnvironment: "node",
    },
    {
      ...sharedConfig,
      displayName: "integration",
      testMatch: ["<rootDir>/test/integration/**/*.test.js"],
      testEnvironment: "<rootDir>/test/environments/jsdom-with-node-globals.cjs",
      setupFilesAfterEnv: ["<rootDir>/test/setup.js", "<rootDir>/test/integration-setup.js"],
    },
  ],
};
