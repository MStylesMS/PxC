module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
    jest: true
  },
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'no-undef': 'warn'
  }
};
