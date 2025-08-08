const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  // Optimization configuration for category module
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Category core chunk
        categoryCore: {
          name: 'category-core',
          test: /[\\/]src[\\/]app[\\/]features[\\/]categories[\\/](services|models|guards)[\\/]/,
          chunks: 'all',
          priority: 20,
          enforce: true
        },
        
        // Category components chunk
        categoryComponents: {
          name: 'category-components',
          test: /[\\/]src[\\/]app[\\/]features[\\/]categories[\\/]components[\\/](category-list|category-form|category-card)[\\/]/,
          chunks: 'all',
          priority: 15,
          enforce: true
        },
        
        // Category analytics chunk (lazy loaded)
        categoryAnalytics: {
          name: 'category-analytics',
          test: /[\\/]src[\\/]app[\\/]features[\\/]categories[\\/](components[\\/]category-analytics|services[\\/]category-analytics|services[\\/]category-chart)[\\/]/,
          chunks: 'async',
          priority: 25,
          enforce: true
        },
        
        // Category import/export chunk (lazy loaded)
        categoryImportExport: {
          name: 'category-import-export',
          test: /[\\/]src[\\/]app[\\/]features[\\/]categories[\\/](components[\\/]category-import-export|services[\\/]category-import|services[\\/]category-export)[\\/]/,
          chunks: 'async',
          priority: 25,
          enforce: true
        },
        
        // Category offline chunk (lazy loaded)
        categoryOffline: {
          name: 'category-offline',
          test: /[\\/]src[\\/]app[\\/]features[\\/]categories[\\/]services[\\/]category-offline/,
          chunks: 'async',
          priority: 25,
          enforce: true
        },
        
        // Category performance chunk (lazy loaded)
        categoryPerformance: {
          name: 'category-performance',
          test: /[\\/]src[\\/]app[\\/]features[\\/]categories[\\/]services[\\/]category-performance/,
          chunks: 'async',
          priority: 25,
          enforce: true
        },
        
        // Angular CDK virtual scrolling
        cdkScrolling: {
          name: 'cdk-scrolling',
          test: /[\\/]node_modules[\\/]@angular[\\/]cdk[\\/]scrolling/,
          chunks: 'async',
          priority: 30,
          enforce: true
        },
        
        // RxJS operators used by categories
        rxjsOperators: {
          name: 'rxjs-operators',
          test: /[\\/]node_modules[\\/]rxjs[\\/]operators/,
          chunks: 'all',
          priority: 10,
          minChunks: 2
        }
      }
    },
    
    // Tree shaking configuration
    usedExports: true,
    sideEffects: false,
    
    // Minimize configuration
    minimize: true,
    minimizer: [
      // Terser for JS minification with tree shaking
      new (require('terser-webpack-plugin'))({
        terserOptions: {
          compress: {
            drop_console: true, // Remove console.log in production
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug'],
            passes: 2 // Multiple passes for better optimization
          },
          mangle: {
            safari10: true // Fix Safari 10 issues
          },
          format: {
            comments: false // Remove comments
          }
        },
        extractComments: false
      }),
      
      // CSS optimization
      new (require('css-minimizer-webpack-plugin'))({
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
              normalizeWhitespace: true,
              colormin: true,
              convertValues: true,
              discardDuplicates: true,
              discardEmpty: true,
              mergeRules: true,
              minifySelectors: true
            }
          ]
        }
      })
    ]
  },
  
  // Performance budgets
  performance: {
    maxAssetSize: 250000, // 250KB
    maxEntrypointSize: 250000, // 250KB
    hints: 'warning',
    assetFilter: function(assetFilename) {
      // Only check category-related assets
      return assetFilename.includes('category') || assetFilename.endsWith('.js');
    }
  },
  
  // Plugins for optimization analysis
  plugins: [
    // Bundle analyzer (only in analyze mode)
    ...(process.env.ANALYZE ? [
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
        reportFilename: 'category-bundle-report.html',
        generateStatsFile: true,
        statsFilename: 'category-bundle-stats.json'
      })
    ] : []),
    
    // Gzip compression
    new CompressionPlugin({
      filename: '[path][base].gz',
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192, // Only compress files larger than 8KB
      minRatio: 0.8,
      compressionOptions: {
        level: 9 // Maximum compression
      }
    }),
    
    // Brotli compression (better than gzip)
    new CompressionPlugin({
      filename: '[path][base].br',
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8,
      compressionOptions: {
        level: 11 // Maximum compression
      }
    })
  ],
  
  // Module resolution optimizations
  resolve: {
    // Prefer ES modules for better tree shaking
    mainFields: ['es2015', 'module', 'main'],
    
    // Alias for commonly used category modules
    alias: {
      '@category-core': path.resolve(__dirname, 'src/app/features/categories/services'),
      '@category-components': path.resolve(__dirname, 'src/app/features/categories/components'),
      '@category-models': path.resolve(__dirname, 'src/app/features/categories/models')
    }
  },
  
  // Module rules for optimization
  module: {
    rules: [
      // TypeScript optimization
      {
        test: /\.ts$/,
        include: path.resolve(__dirname, 'src/app/features/categories'),
        use: [
          {
            loader: '@angular-devkit/build-angular/src/babel/webpack-loader',
            options: {
              cacheDirectory: true,
              compact: true
            }
          },
          {
            loader: '@ngtools/webpack',
            options: {
              // Enable Ivy renderer optimizations
              enableIvy: true,
              // Enable strict mode for better tree shaking
              strictMode: true
            }
          }
        ]
      },
      
      // SCSS optimization for category styles
      {
        test: /\.scss$/,
        include: path.resolve(__dirname, 'src/app/features/categories'),
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 2,
              sourceMap: false // Disable source maps in production
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  require('autoprefixer'),
                  require('cssnano')({
                    preset: 'default'
                  })
                ]
              }
            }
          },
          'sass-loader'
        ]
      }
    ]
  },
  
  // Stats configuration for bundle analysis
  stats: {
    chunks: true,
    chunkModules: true,
    chunkOrigins: true,
    modules: false,
    reasons: true,
    usedExports: true,
    providedExports: true,
    optimizationBailout: true,
    errorDetails: true,
    colors: true,
    hash: false,
    version: false,
    timings: true,
    assets: true,
    entrypoints: true
  }
};

// Export configuration function for different environments
module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const isAnalyze = env && env.analyze;
  
  const config = module.exports;
  
  if (isProduction) {
    // Production-specific optimizations
    config.devtool = false; // Disable source maps
    config.optimization.concatenateModules = true; // Enable module concatenation
  } else {
    // Development optimizations
    config.devtool = 'eval-source-map';
    config.optimization.minimize = false;
  }
  
  if (isAnalyze) {
    // Enable bundle analyzer
    process.env.ANALYZE = 'true';
  }
  
  return config;
};