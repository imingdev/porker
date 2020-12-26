// https://eslint.org/docs/user-guide/configuring
module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es6: true,
    commonjs: true
  },
  extends: 'airbnb',
  // add your custom rules here
  rules: {
    'prefer-spread': 'off',
    'import/no-unresolved': 'off',
    'comma-dangle': ['error', 'never'],
    'dot-notation': 0,
    'no-param-reassign': 0,
    'no-underscore-dangle': 'off',
    'react/prop-types': 0,
    'react/jsx-props-no-spreading': 'off',
    'jsx-a11y/html-has-lang': 'off',
    'jsx-a11y/click-events-have-key-events': 'off',
    'jsx-a11y/no-noninteractive-element-interactions': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
    'react/forbid-prop-types': 0,
    'consistent-return': 'off',
    'object-curly-newline': 0,
    'import/no-extraneous-dependencies': 'off'
  }
};
