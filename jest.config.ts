import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",

  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],

  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  moduleFileExtensions: ["ts", "js", "json"],

  setupFilesAfterEnv: ["<rootDir>/tests/test-utils/setup.ts"],
};

export default config;
