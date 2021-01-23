module.exports = {
  preset: 'ts-jest',
  collectCoverage: true,
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
