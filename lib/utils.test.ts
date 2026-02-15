import { cn, sanitizeHref } from '@/lib/utils'

describe('cn', () => {
	it('merges multiple class strings', () => {
		expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz')
	})

	it('handles conditional classes with falsy values', () => {
		expect(cn('base', false && 'hidden', null, undefined, 0, 'visible')).toBe(
			'base visible',
		)
	})

	it('resolves Tailwind conflicts by keeping the last value', () => {
		expect(cn('p-2', 'p-4')).toBe('p-4')
		expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
	})
})

describe('sanitizeHref', () => {
	it('returns valid http:// URLs unchanged', () => {
		expect(sanitizeHref('http://example.com')).toBe('http://example.com')
	})

	it('returns valid https:// URLs unchanged', () => {
		expect(sanitizeHref('https://example.com/path?q=1')).toBe(
			'https://example.com/path?q=1',
		)
	})

	it('returns undefined for javascript: URLs', () => {
		expect(sanitizeHref('javascript:alert(1)')).toBeUndefined()
	})

	it('returns undefined for data: URLs', () => {
		expect(sanitizeHref('data:text/html,<h1>hi</h1>')).toBeUndefined()
	})

	it('returns undefined for empty string input', () => {
		expect(sanitizeHref('')).toBeUndefined()
	})

	it('returns undefined for undefined input', () => {
		expect(sanitizeHref(undefined)).toBeUndefined()
	})

	it('returns relative paths as-is since they parse under https: base', () => {
		expect(sanitizeHref('/about')).toBe('/about')
		expect(sanitizeHref('docs/guide')).toBe('docs/guide')
	})

	it('returns undefined for malformed URLs with unsupported protocols', () => {
		expect(sanitizeHref('ftp://files.example.com')).toBeUndefined()
		expect(sanitizeHref('file:///etc/passwd')).toBeUndefined()
	})

	it('returns undefined when URL constructor throws on malformed input', () => {
		expect(sanitizeHref('http://[::1')).toBeUndefined()
	})
})
