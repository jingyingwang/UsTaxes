const path = require('path')
module.exports = {
  webpack: {
    alias: {
      ustaxes: path.resolve(__dirname, './src')
    }
  },
  jest: {
    configure: {
      moduleNameMapper: {
        '^ustaxes/(.*)$': '<rootDir>/src/$1'
      }
    }
  }
}
