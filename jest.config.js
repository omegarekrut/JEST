module.exports = {
  preset: "ts-jest", // Use the 'ts-jest' preset for handling TypeScript files
  testEnvironment: "node", // Set the test environment to node
  transform: {
    "^.+\\.(t|j)sx?$": "babel-jest", // Use babel-jest to transform files with these extensions
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1", // Handle path mapping
  },
  transformIgnorePatterns: [
    "node_modules/(?!your-es-modules)", // You can specify node_modules to be ignored except for some
  ],
};
