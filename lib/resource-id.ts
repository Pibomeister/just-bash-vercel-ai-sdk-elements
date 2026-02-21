import { createHmac, timingSafeEqual } from 'crypto'
import { nanoid } from 'nanoid'
import { cookies } from 'next/headers'

const RAW_SECRET = process.env.RESOURCE_ID_SECRET
if (!RAW_SECRET && process.env.NODE_ENV === 'production') {
	throw new Error(
		'[resource-id] RESOURCE_ID_SECRET environment variable is required in production. ' +
			'Set it to a random 32+ character string.',
	)
}
const SECRET = RAW_SECRET ?? 'dev-secret-change-in-production'

function sign(value: string): string {
	return createHmac('sha256', SECRET).update(value).digest('base64url')
}

function verify(value: string, sig: string): boolean {
	const expected = sign(value)
	const a = Buffer.from(sig)
	const b = Buffer.from(expected)
	if (a.length !== b.length) return false
	return timingSafeEqual(a, b)
}

/**
 * Returns the server-authoritative resourceId for the current request.
 * Reads from signed HttpOnly cookie `_rid`.
 * Does NOT generate one — call `requireResourceId()` to create one if missing.
 * Returns null if no valid cookie exists.
 */
export async function getServerResourceId(): Promise<string | null> {
	const jar = await cookies()
	const raw = jar.get('_rid')?.value
	if (!raw) return null
	const [value, sig] = raw.split('.')
	if (!value || !sig || !verify(value, sig)) return null
	return value
}

/**
 * Returns the resourceId from the signed cookie, or creates a new one
 * and sets it on the response. Use in API routes that need a valid resourceId.
 */
export async function requireResourceId(): Promise<{
	resourceId: string
	isNew: boolean
}> {
	const existing = await getServerResourceId()
	if (existing) return { resourceId: existing, isNew: false }

	const jar = await cookies()
	const newId = nanoid()
	const signed = `${newId}.${sign(newId)}`
	jar.set('_rid', signed, {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 365, // 1 year
		path: '/',
	})
	return { resourceId: newId, isNew: true }
}
