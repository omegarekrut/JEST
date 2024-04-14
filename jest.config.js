module.exports = {
  preset: "ts-jest", 
  testEnvironment: "node", 
  transform: {
    "^.+\\.(t|j)sx?$": "babel-jest", 
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1", 
  },
  transformIgnorePatterns: [
    "node_modules/(?!your-es-modules)", 
  ],
};
