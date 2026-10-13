// eslint.config.mjs
import tsparser from "@typescript-eslint/parser";
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

const nodeScripts = ["esbuild.config.mjs", "version-bump.mjs"];

export default defineConfig([
	{
		ignores: [
			"main.js",
			"node_modules/**",
			"dist/**",
			"*.js",
			"scripts/**",
			".ref/**",
		],
	},
	...obsidianmd.configs.recommended.map((config) => ({
		...config,
		ignores: [...(config.ignores ?? []), ...nodeScripts],
	})),
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				project: "./tsconfig.json",
				sourceType: "module",
			},
			globals: {
				...globals.browser,
				DomElementInfo: "readonly",
				SvgElementInfo: "readonly",
				activeDocument: "readonly",
				activeWindow: "readonly",
				ajax: "readonly",
				ajaxPromise: "readonly",
				createDiv: "readonly",
				createEl: "readonly",
				createFragment: "readonly",
				createSpan: "readonly",
				createSvg: "readonly",
				fish: "readonly",
				fishAll: "readonly",
				isBoolean: "readonly",
				nextFrame: "readonly",
				ready: "readonly",
				sleep: "readonly",
			},
		},
		// Custom rule overrides
		rules: {
			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/no-empty-function": "off",
			"no-prototype-builtins": "off",
			"@typescript-eslint/no-misused-promises": [
				"error",
				{
					checksVoidReturn: {
						attributes: false,
						properties: false,
						returns: false,
						variables: false,
					},
				},
			],
			// Disable sample code rules for template repository
			// These are intentional placeholder names and sample code that users should customize
			"obsidianmd/sample-names": "off",
			"obsidianmd/no-sample-code": "off",
			// Console rules: Match Obsidian bot requirements (only warn/error/debug allowed)
			"no-console": ["error", { allow: ["warn", "error", "debug"] }],
			// Require await in async functions (matches Obsidian bot)
			"@typescript-eslint/require-await": "error",
		},
	},
	{
		// Build and release scripts use Node.js rules instead of plugin runtime rules.
		files: nodeScripts,
		extends: [js.configs.recommended],
		languageOptions: {
			globals: globals.node,
		},
	},
]);
