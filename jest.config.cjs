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
    "<rootDir>/rename.js",
    "<rootDir>/jest.config.cjs",
    "<rootDir>/webpack.config.js",
  ],
  modulePathIgnorePatterns: ["node_modules"],
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
  restoreMocks: true,
  testEnvironment: "node",
  testPathIgnorePatterns: [],
  verbose: true,
  setupFilesAfterEnv: ["<rootDir>/test/setup.js"],
  transform: {
    "^.+\\.[j]sx?$": "babel-jest",
  },
  transformIgnorePatterns: ["/node_modules/(?!(ffc-ahwr-common-library)/)"],
};
