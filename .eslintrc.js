module.exports = {
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint'],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
	],
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'module',
	},
	rules: {
		// TypeScript specific rules
		'@typescript-eslint/no-unused-vars': 'error',
		'@typescript-eslint/no-explicit-any': 'warn',
		'@typescript-eslint/explicit-function-return-type': 'off',
		'@typescript-eslint/no-non-null-assertion': 'warn',
		
		// General code quality rules
		'indent': ['error', 2],
		'quotes': ['error', 'single'],
		'semi': ['error', 'always'],
		'no-console': 'off',
		'no-trailing-spaces': 'error',
		'eol-last': 'error',
		'comma-dangle': ['error', 'always-multiline'],
		'object-curly-spacing': ['error', 'never'],
		'array-bracket-spacing': ['error', 'never'],
		'space-before-function-paren': ['error', 'never'],
		'keyword-spacing': 'error',
		'space-infix-ops': 'error',
		'no-multiple-empty-lines': ['error', {max: 2, maxEOF: 1}],
	},
	env: {
		node: true,
		es2020: true,
	},
};