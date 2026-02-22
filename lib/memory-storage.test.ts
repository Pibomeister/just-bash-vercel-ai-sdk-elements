import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @mastra/libsql and @mastra/pg so constructors don't open real connections
// ---------------------------------------------------------------------------

const MockLibSQLStore = vi.fn()
const MockPostgresStore = vi.fn()

vi.mock('@mastra/libsql', () => ({ LibSQLStore: MockLibSQLStore }))
vi.mock('@mastra/pg', () => ({ PostgresStore: MockPostgresStore }))

describe('memory-storage', () => {
	beforeEach(() => {
		// Reset the HMR guard so each test gets a fresh singleton evaluation
		const g = globalThis as Record<string, unknown>
		delete g.__mastraStorage

		vi.clearAllMocks()
		vi.resetModules()
	})

	afterEach(() => {
		const g = globalThis as Record<string, unknown>
		delete g.__mastraStorage
	})

	it('creates a LibSQLStore in development (NODE_ENV != production)', async () => {
		vi.stubEnv('NODE_ENV', 'development')
		vi.stubEnv('MASTRA_DATABASE_URL', '')

		const { memoryStorage } = await import('./memory-storage')

		expect(MockLibSQLStore).toHaveBeenCalledWith({
			id: 'mastra-memory-libsql',
			url: 'file:./mastra.db',
		})
		expect(MockPostgresStore).not.toHaveBeenCalled()
		expect(memoryStorage).toBeInstanceOf(MockLibSQLStore)
	})

	it('creates a PostgresStore in production when MASTRA_DATABASE_URL is set', async () => {
		vi.stubEnv('NODE_ENV', 'production')
		vi.stubEnv(
			'MASTRA_DATABASE_URL',
			'postgresql://user:pass@localhost:5432/db',
		)

		const { memoryStorage } = await import('./memory-storage')

		expect(MockPostgresStore).toHaveBeenCalledWith({
			id: 'mastra-memory-pg',
			connectionString: 'postgresql://user:pass@localhost:5432/db',
		})
		expect(MockLibSQLStore).not.toHaveBeenCalled()
		expect(memoryStorage).toBeInstanceOf(MockPostgresStore)
	})

	it('falls back to LibSQLStore in production when MASTRA_DATABASE_URL is not set', async () => {
		vi.stubEnv('NODE_ENV', 'production')
		vi.stubEnv('MASTRA_DATABASE_URL', '')

		const { memoryStorage } = await import('./memory-storage')

		expect(MockLibSQLStore).toHaveBeenCalled()
		expect(MockPostgresStore).not.toHaveBeenCalled()
		expect(memoryStorage).toBeInstanceOf(MockLibSQLStore)
	})

	it('returns the same instance on repeated imports (HMR guard)', async () => {
		vi.stubEnv('NODE_ENV', 'development')

		const { memoryStorage: first } = await import('./memory-storage')

		// Reset modules to simulate re-import, but the globalThis guard should
		// return the same instance
		vi.resetModules()
		// Re-set the guard manually to simulate HMR re-evaluation reusing the singleton
		const g = globalThis as Record<string, unknown>
		g.__mastraStorage = first

		const { memoryStorage: second } = await import('./memory-storage')

		expect(second).toBe(first)
		// Constructor should only have been called once
		expect(MockLibSQLStore).toHaveBeenCalledTimes(1)
	})
})
