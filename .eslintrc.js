module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: [
    'plugin:vue/essential',
    '@vue/standard',
    '@vue/typescript/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020
  },
  rules: {
    // 'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    semi: ['error', 'always'],
    'comma-dangle': ['error', 'only-multiline'],

    '@typescript-eslint/no-unused-vars': 'off',
    'import/extensions': 'off',
    'camelcase': 'off',
    'max-classes-per-file': 'off',
    'no-underscore-dangle': 'off',
    'no-async-promise-executor': 'off',
    'no-console': 'off',
    // 'comma-dangle': ['error', 'never'],
    'no-cond-assign': 'off',
    'max-len': 'off',
    'quotes': ['error', 'single']
  },
  ignorePatterns: [
    'packages/common/lib'
  ],
};
