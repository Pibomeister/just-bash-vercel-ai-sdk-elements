import { LibSQLStore } from '@mastra/libsql'
import { PostgresStore } from '@mastra/pg'

// HMR guard for Next.js hot reload — prevent duplicate initialization
const g = globalThis as typeof globalThis & {
	__mastraStorage?: LibSQLStore | PostgresStore
}

function createStorage(): LibSQLStore | PostgresStore {
	if (
		process.env.NODE_ENV === 'production' &&
		process.env.MASTRA_DATABASE_URL
	) {
		return new PostgresStore({
			id: 'mastra-memory-pg',
			connectionString: process.env.MASTRA_DATABASE_URL,
		})
	}
	return new LibSQLStore({
		id: 'mastra-memory-libsql',
		url: 'file:./mastra.db',
	})
}

export const memoryStorage: LibSQLStore | PostgresStore =
	g.__mastraStorage ?? (g.__mastraStorage = createStorage())
