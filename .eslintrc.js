module.exports = {
	root: true,
	env: {
		browser: true,
		commonjs: true
	},
	extends: ['standard'],
	overrides: [],
	parserOptions: {
		ecmaVersion: 'latest'
	},
	plugins: ['vue'],
	rules: {
		semi: ['error', 'never'], // 禁止使用分号作为语句的结尾。
		indent: ['error', 'tab', { SwitchCase: 1 }], // 使用制表符缩进，switch 语句中的 case 子句缩进级别为1。
		eqeqeq: 'off', // 要求使用全等操作符（===）而不是相等操作符（==）。
		camelcase: 'off', // 允许使用非驼峰命名的变量名。
		'no-tabs': 'off', // 允许使用制表符。
		'no-empty-pattern': 'off', // 允许空的解构模式。
		'no-useless-escape': 'off', // 允许在字符串中使用不必要的转义字符。
		'no-new': 'off', // 允许通过 new 操作符创建实例。
		'no-prototype-builtins': 'off', // 允许直接使用 Object.prototype 的内置方法，如 hasOwnProperty()。
		'brace-style': 'off', // 允许花括号的风格任意。
		'new-cap': 0, // 允许不使用大写字母开头���构造函数。
		'default-case': 'off', // 不强制 switch 语句中必须有 default 分支。
		'no-debugger': 'warn', // 警告程序中出现 debugger 语句。
		'no-console': 'warn', // 警告程序中出现 console 语句。
		'no-eval': 'off', //
		'no-case-declarations': 'off',
		quotes: ['error', 'single'], // 使用单引号定义字符串。
		'max-len': [
			// 每行最多200个字符，忽略URL、注释和正则表达式等特定情况。
			'error',
			{
				code: 250,
				ignoreUrls: true,
				ignoreStrings: false,
				ignoreTemplateLiterals: false,
				ignoreRegExpLiterals: false,
				ignoreComments: true,
				ignoreTrailingComments: true,
				tabWidth: 4
			}
		]
	},
	globals: {
		$log: true,
		$service: true,
		$builder: true,
		$pool: true,
		$catch_all: true,
		$sleep: true,
		$menu: true,
		$rechargeUrl: true
	}
}
