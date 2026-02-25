/**
 * Encoding detection and fallback decoding for text files.
 *
 * PDF-extracted markdown (e.g. from LlamaParse) may contain Latin-1 /
 * Windows-1252 bytes when the source document uses Spanish or other
 * Western-European languages. This module provides a zero-dependency
 * approach to detecting and handling these cases using the built-in
 * TextDecoder API.
 */

const utf8Decoder = new TextDecoder('utf-8', { fatal: true })
const win1252Decoder = new TextDecoder('windows-1252')

/**
 * Decode raw bytes, trying UTF-8 first and falling back to Windows-1252.
 *
 * Windows-1252 is a superset of ISO 8859-1 (Latin-1) and maps all 256
 * byte values to characters, so it never throws.
 */
export function decodeWithFallback(bytes: Uint8Array): string {
	try {
		return utf8Decoder.decode(bytes)
	} catch {
		return win1252Decoder.decode(bytes)
	}
}

/**
 * Check whether a string contains U+FFFD replacement characters,
 * which indicate that an upstream process (e.g. LlamaParse) already
 * produced corrupted output that was then saved as valid UTF-8.
 */
export function containsReplacementChars(text: string): boolean {
	return text.includes('\uFFFD')
}
