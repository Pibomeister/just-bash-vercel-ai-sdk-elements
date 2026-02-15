import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		css: false,
		passWithNoTests: true,
		environment: 'node',
		environmentMatchGlobs: [['hooks/**/*.test.ts*', 'jsdom']],
		setupFiles: ['./test/setup.ts'],
		coverage: {
			provider: 'v8',
			include: ['lib/**', 'hooks/**', 'app/api/**', 'workflows/**'],
			exclude: ['lib/mammoth.d.ts', 'lib/types/**', '**/*.test.ts', '**/*.test.tsx'],
			thresholds: {
				lines: 85,
				functions: 85,
				branches: 85,
				statements: 85,
			},
		},
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, '.'),
		},
	},
})
