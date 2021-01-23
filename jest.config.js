module.exports = {
  preset: 'ts-jest',
  collectCoverage: true,
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage',
        outputName: 'junit.xml'
      }
    ]
  ],
  coverageReporters: ['cobertura']
};
