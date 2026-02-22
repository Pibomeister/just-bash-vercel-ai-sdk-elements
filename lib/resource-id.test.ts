// test/setup.ts mocks next/headers and provides the in-memory cookie store
import { cookies } from 'next/headers'
import { afterEach, describe, expect, it } from 'vitest'

import { getServerResourceId, requireResourceId } from './resource-id'

// The mocked cookies() jar from test/setup.ts — we interact with it via the
// mocked `cookies()` function to set/clear test state.
async function setCookie(name: string, value: string) {
	const jar = await cookies()
	jar.set(name, value)
}

async function deleteCookie(name: string) {
	const jar = await cookies()
	// The test setup Map is cleared afterEach, but we can simulate absence
	// by deleting mid-test via the delete helper
	jar.delete(name)
}

// -------------------------------------------------------------------------
// Helpers to create a valid signed cookie value without exposing internals.
// We do this by calling requireResourceId() which sets the cookie, then
// reading back the raw cookie value from the mock jar.
// -------------------------------------------------------------------------

async function getValidSignedCookie(): Promise<{
	id: string
	cookieValue: string
}> {
	const { resourceId } = await requireResourceId()
	const jar = await cookies()
	const raw = jar.get('_rid')?.value ?? ''
	return { id: resourceId, cookieValue: raw }
}

describe('resource-id', () => {
	afterEach(async () => {
		// Ensure the _rid cookie is cleared between tests
		// (test/setup.ts already clears cookieStore afterEach,
		// but explicit cleanup makes intent clear)
		await deleteCookie('_rid')
	})

	// -----------------------------------------------------------------------
	// getServerResourceId
	// -----------------------------------------------------------------------

	describe('getServerResourceId', () => {
		it('returns null when no _rid cookie is set', async () => {
			const result = await getServerResourceId()

			expect(result).toBeNull()
		})

		it('returns null when cookie has no dot separator', async () => {
			await setCookie('_rid', 'invalid-no-dot')

			const result = await getServerResourceId()

			expect(result).toBeNull()
		})

		it('returns null when signature is tampered', async () => {
			await setCookie('_rid', 'some-id.bad-signature')

			const result = await getServerResourceId()

			expect(result).toBeNull()
		})

		it('returns null when value part is empty', async () => {
			await setCookie('_rid', '.some-signature')

			const result = await getServerResourceId()

			expect(result).toBeNull()
		})

		it('returns null when signature part is empty', async () => {
			await setCookie('_rid', 'some-id.')

			const result = await getServerResourceId()

			expect(result).toBeNull()
		})

		it('returns the resourceId when cookie is valid and signed correctly', async () => {
			// Create a valid signed cookie via requireResourceId, then verify
			const { id } = await getValidSignedCookie()

			// The cookie is now set — call getServerResourceId to verify reading
			const result = await getServerResourceId()

			expect(result).toBe(id)
		})

		it('returns null when signature length differs from expected', async () => {
			// A truncated signature will fail the length check in verify()
			await setCookie('_rid', 'some-id.shortsig')

			const result = await getServerResourceId()

			expect(result).toBeNull()
		})
	})

	// -----------------------------------------------------------------------
	// requireResourceId
	// -----------------------------------------------------------------------

	describe('requireResourceId', () => {
		it('creates a new resourceId and cookie when none exists', async () => {
			const { resourceId, isNew } = await requireResourceId()

			expect(isNew).toBe(true)
			expect(typeof resourceId).toBe('string')
			expect(resourceId.length).toBeGreaterThan(0)
		})

		it('sets the _rid cookie with a signed value', async () => {
			await requireResourceId()

			const jar = await cookies()
			const raw = jar.get('_rid')?.value

			expect(raw).toBeDefined()
			// Signed cookie format: "<id>.<hmac-base64url>"
			expect(raw).toMatch(/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/)
		})

		it('returns isNew: false when a valid cookie already exists', async () => {
			// First call creates the cookie
			const first = await requireResourceId()
			expect(first.isNew).toBe(true)

			// Second call reads the existing cookie
			const second = await requireResourceId()
			expect(second.isNew).toBe(false)
			expect(second.resourceId).toBe(first.resourceId)
		})

		it('returns the same resourceId on repeated calls', async () => {
			const first = await requireResourceId()
			const second = await requireResourceId()
			const third = await requireResourceId()

			expect(second.resourceId).toBe(first.resourceId)
			expect(third.resourceId).toBe(first.resourceId)
		})

		it('generated resourceId is a non-empty string', async () => {
			const { resourceId } = await requireResourceId()

			expect(resourceId).toBeTruthy()
			expect(typeof resourceId).toBe('string')
		})

		it('creates a new id after cookie is cleared', async () => {
			const first = await requireResourceId()
			await deleteCookie('_rid')

			const second = await requireResourceId()

			expect(second.isNew).toBe(true)
			// Different id (nanoid is random — collision probability negligible)
			expect(second.resourceId).not.toBe(first.resourceId)
		})
	})
})
