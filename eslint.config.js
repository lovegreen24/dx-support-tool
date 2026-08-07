export default [
  {
    rules: {
      'max-len': ['warn', { code: 120 }],
      'max-lines-per-function': ['warn', { max: 100 }],
      'max-lines': ['warn', { max: 700 }],
      complexity: ['warn', 10],
    },
  },
];
