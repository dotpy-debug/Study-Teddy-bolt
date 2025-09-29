module.exports = {
  plugins: {
    'tailwindcss': {},
    'autoprefixer': {},
    // CSS optimization plugins
    'postcss-import': {},
    'postcss-flexbugs-fixes': {},
    'postcss-preset-env': {
      autoprefixer: {
        flexbox: 'no-2009',
      },
      stage: 3,
      features: {
        'custom-properties': false,
      },
    },
    // Production optimizations
    ...(process.env.NODE_ENV === 'production' && {
      'cssnano': {
        preset: [
          'advanced',
          {
            // Aggressive CSS minification
            discardComments: {
              removeAll: true,
            },
            discardDuplicates: true,
            discardEmpty: true,
            discardOverridden: true,
            mergeIdents: true,
            mergeRules: true,
            minifyFontValues: true,
            minifyGradients: true,
            minifyParams: true,
            minifySelectors: true,
            normalizeCharset: true,
            normalizeDisplayValues: true,
            normalizePositions: true,
            normalizeRepeatStyle: true,
            normalizeString: true,
            normalizeTimingFunctions: true,
            normalizeUnicode: true,
            normalizeUrl: true,
            normalizeWhitespace: true,
            orderedValues: true,
            reduceIdents: true,
            reduceInitial: true,
            reduceTransforms: true,
            svgo: true,
            uniqueSelectors: true,
            // Advanced optimizations
            calc: true,
            colormin: true,
            convertValues: true,
            discardUnused: true,
            mergeRules: true,
            mergeLonghand: true,
            zindex: false, // Don't rebase z-index
          },
        ],
      },
      '@fullhuman/postcss-purgecss': {
        content: [
          './app/**/*.{js,ts,jsx,tsx,mdx}',
          './components/**/*.{js,ts,jsx,tsx,mdx}',
          './lib/**/*.{js,ts,jsx,tsx,mdx}',
          './features/**/*.{js,ts,jsx,tsx,mdx}',
        ],
        defaultExtractor: content => {
          // Tailwind CSS extractor
          const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || []
          const innerMatches = content.match(/[^<>"'`\s.()]*[^<>"'`\s.():]/g) || []
          return broadMatches.concat(innerMatches)
        },
        safelist: {
          standard: [
            /^(bg|text|border)-/,
            /^(hover|focus|active|disabled):/,
            /^(sm|md|lg|xl|2xl):/,
            /^animate-/,
            'html',
            'body',
          ],
          deep: [
            /^nprogress/,
            /^Toastify/,
          ],
          greedy: [
            /data-/,
          ],
        },
        fontFace: true,
        keyframes: true,
        variables: true,
      },
    }),
  },
}