const path = require('path');

module.exports = {
  mode: 'production',
  optimization: {
    usedExports: true,
    sideEffects: false,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
          reuseExistingChunk: true,
          enforce: true
        },
        angular: {
          test: /[\\/]node_modules[\\/]@angular[\\/]/,
          name: 'angular',
          chunks: 'all',
          priority: 20,
          reuseExistingChunk: true,
          enforce: true
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true,
          enforce: true
        }
      }
    }
  },
  resolve: {
    alias: {
      '@features': path.resolve(__dirname, 'src/app/features'),
      '@core': path.resolve(__dirname, 'src/app/core'),
      '@shared': path.resolve(__dirname, 'src/app/shared'),
      '@styles': path.resolve(__dirname, 'src/styles')
    }
  }
};