import { containsReplacementChars, decodeWithFallback } from '@/lib/encoding'

describe('decodeWithFallback', () => {
	it('decodes valid UTF-8 bytes correctly', () => {
		const encoder = new TextEncoder()
		const bytes = encoder.encode('Hello, world!')
		expect(decodeWithFallback(bytes)).toBe('Hello, world!')
	})

	it('falls back to Windows-1252 for invalid UTF-8 bytes', () => {
		// 0xE9 is not a valid single-byte UTF-8 sequence,
		// but in Windows-1252 it maps to the character 'e' with acute accent
		const bytes = new Uint8Array([0x63, 0x61, 0x66, 0xe9])
		expect(decodeWithFallback(bytes)).toBe('caf\u00E9')
	})

	it('handles empty input', () => {
		const bytes = new Uint8Array([])
		expect(decodeWithFallback(bytes)).toBe('')
	})
})

describe('containsReplacementChars', () => {
	it('returns true for strings containing U+FFFD', () => {
		expect(containsReplacementChars('hello \uFFFD world')).toBe(true)
	})

	it('returns false for clean strings without replacement chars', () => {
		expect(containsReplacementChars('hello world')).toBe(false)
	})
})
