import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    cache: false, // disabled caching to prevent old Tact files from being used after a rebuild
    testEnvironment: '@ton/sandbox/jest-environment',
    testPathIgnorePatterns: ['/node_modules/', '/dist/', '/libs/'],
    reporters: ['default', ['@ton/sandbox/jest-reporter', {}]],
};

export default config;
