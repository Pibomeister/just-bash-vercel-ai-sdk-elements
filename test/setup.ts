import { afterEach } from 'vitest'

afterEach(() => {
	vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Mock next/headers — not available outside the Next.js request scope in tests
// ---------------------------------------------------------------------------

// In-memory cookie store shared across calls within a single test
const cookieStore: Map<string, string> = new Map()

vi.mock('next/headers', () => ({
	cookies: vi.fn(async () => ({
		get: (name: string) => {
			const value = cookieStore.get(name)
			return value ? { name, value } : undefined
		},
		set: (name: string, value: string) => {
			cookieStore.set(name, value)
		},
		delete: (name: string) => {
			cookieStore.delete(name)
		},
	})),
}))

// Reset cookie store between tests so state doesn't bleed across tests
afterEach(() => {
	cookieStore.clear()
})
