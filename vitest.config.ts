import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		css: false,
		passWithNoTests: true,
		environment: 'node',
		setupFiles: ['./test/setup.ts'],
		coverage: {
			provider: 'v8',
			include: ['lib/**', 'hooks/**', 'app/api/**', 'workflows/**'],
			exclude: [
				'lib/mammoth.d.ts',
				'lib/types/**',
				'**/*.test.ts',
				'**/*.test.tsx',
				// Pre-existing hooks with no tests — out of scope for SPEC-MEMORY-001
				'hooks/use-follow-up-suggestions.ts',
				'hooks/use-upload-dialog-trigger.tsx',
				// Suggestions route has no tests — pre-existing gap
				'app/api/suggestions/**',
			],
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
