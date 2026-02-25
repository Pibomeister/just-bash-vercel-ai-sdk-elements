#!/usr/bin/env node

import { execSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const LINTABLE_EXTENSIONS = new Set([
	'.js',
	'.jsx',
	'.mjs',
	'.cjs',
	'.ts',
	'.tsx',
	'.mts',
	'.cts',
])

function run(command, args) {
	const result = spawnSync(command, args, {
		stdio: 'inherit',
		shell: process.platform === 'win32',
	})

	if (result.error) {
		throw result.error
	}

	if (result.status !== 0) {
		process.exit(result.status ?? 1)
	}
}

function readLines(command) {
	try {
		const output = execSync(command, {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		})

		return output
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean)
	} catch {
		return []
	}
}

function getChangedFiles() {
	const files = new Set([
		...readLines('git diff --name-only --diff-filter=ACMRTUXB'),
		...readLines('git diff --cached --name-only --diff-filter=ACMRTUXB'),
		...readLines('git ls-files --others --exclude-standard'),
	])

	return [...files].filter((file) => existsSync(file))
}

function isLintableFile(filePath) {
	return LINTABLE_EXTENSIONS.has(path.extname(filePath).toLowerCase())
}

const changedFiles = getChangedFiles()
const lintableChangedFiles = changedFiles.filter(isLintableFile)

if (lintableChangedFiles.length > 0) {
	console.log(
		`Running Biome on ${lintableChangedFiles.length} changed file(s)...`,
	)
	run('pnpm', ['exec', 'biome', 'check', ...lintableChangedFiles])

	console.log(
		`Running ESLint on ${lintableChangedFiles.length} changed file(s)...`,
	)
	run('pnpm', ['exec', 'eslint', '--max-warnings=0', ...lintableChangedFiles])
} else {
	console.log('No changed JS/TS files found. Skipping Biome and ESLint.')
}

console.log('Running full TypeScript typecheck...')
run('pnpm', ['exec', 'tsc', '--noEmit'])
