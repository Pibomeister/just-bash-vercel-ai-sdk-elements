import {
	base64ToArrayBuffer,
	base64ToDataUri,
	detectFileCategory,
	detectLanguage,
	getMimeType,
	isBase64Content,
} from '@/lib/file-types'

describe('detectFileCategory', () => {
	it('maps .ts to code', () => {
		expect(detectFileCategory('main.ts')).toBe('code')
	})

	it('maps .py to code', () => {
		expect(detectFileCategory('script.py')).toBe('code')
	})

	it('maps .html to code', () => {
		expect(detectFileCategory('index.html')).toBe('code')
	})

	it('maps .md to markdown', () => {
		expect(detectFileCategory('README.md')).toBe('markdown')
	})

	it('maps .png to image', () => {
		expect(detectFileCategory('photo.png')).toBe('image')
	})

	it('maps .jpg to image', () => {
		expect(detectFileCategory('photo.jpg')).toBe('image')
	})

	it('maps .pdf to pdf', () => {
		expect(detectFileCategory('document.pdf')).toBe('pdf')
	})

	it('maps .docx to docx', () => {
		expect(detectFileCategory('report.docx')).toBe('docx')
	})

	it('maps .xlsx to spreadsheet', () => {
		expect(detectFileCategory('data.xlsx')).toBe('spreadsheet')
	})

	it('returns unknown for unrecognized extensions', () => {
		expect(detectFileCategory('archive.rar')).toBe('unknown')
	})

	it('handles files with no extension', () => {
		expect(detectFileCategory('Makefile')).toBe('unknown')
	})

	it('handles case-insensitive extensions via lowercase normalization', () => {
		expect(detectFileCategory('app.TS')).toBe('code')
	})
})

describe('detectLanguage', () => {
	it('maps .ts to typescript', () => {
		expect(detectLanguage('index.ts')).toBe('typescript')
	})

	it('maps .py to python', () => {
		expect(detectLanguage('main.py')).toBe('python')
	})

	it('maps .tsx to tsx', () => {
		expect(detectLanguage('component.tsx')).toBe('tsx')
	})

	it('maps .rs to rust', () => {
		expect(detectLanguage('lib.rs')).toBe('rust')
	})

	it('maps .yml to yaml', () => {
		expect(detectLanguage('config.yml')).toBe('yaml')
	})

	it('falls back to shellscript for unknown extensions', () => {
		expect(detectLanguage('data.xyz')).toBe('shellscript')
	})

	it('falls back to shellscript for files with no extension', () => {
		expect(detectLanguage('Dockerfile')).toBe('shellscript')
	})
})

describe('getMimeType', () => {
	it('maps .png to image/png', () => {
		expect(getMimeType('photo.png')).toBe('image/png')
	})

	it('maps .jpg to image/jpeg', () => {
		expect(getMimeType('photo.jpg')).toBe('image/jpeg')
	})

	it('maps .svg to image/svg+xml', () => {
		expect(getMimeType('icon.svg')).toBe('image/svg+xml')
	})

	it('maps .pdf to application/pdf', () => {
		expect(getMimeType('doc.pdf')).toBe('application/pdf')
	})

	it('falls back to application/octet-stream for unknown extensions', () => {
		expect(getMimeType('file.bin')).toBe('application/octet-stream')
	})
})

describe('base64ToArrayBuffer', () => {
	it('correctly decodes a known base64 string to bytes', () => {
		// "Hello" in base64 is "SGVsbG8="
		const buffer = base64ToArrayBuffer('SGVsbG8=')
		const bytes = new Uint8Array(buffer)
		expect(bytes).toEqual(new Uint8Array([72, 101, 108, 108, 111]))
	})

	it('handles empty base64 string', () => {
		const buffer = base64ToArrayBuffer('')
		expect(new Uint8Array(buffer).length).toBe(0)
	})
})

describe('base64ToDataUri', () => {
	it('formats data:{mime};base64,{data} correctly', () => {
		const result = base64ToDataUri('SGVsbG8=', 'image/png')
		expect(result).toBe('data:image/png;base64,SGVsbG8=')
	})

	it('works with application/pdf mime type', () => {
		const result = base64ToDataUri('AAAA', 'application/pdf')
		expect(result).toBe('data:application/pdf;base64,AAAA')
	})
})

describe('isBase64Content', () => {
	it('returns true for valid base64 strings', () => {
		// "SGVsbG8=" is "Hello" encoded
		expect(isBase64Content('SGVsbG8=')).toBe(true)
	})

	it('returns true for valid base64 without padding', () => {
		// 8 chars, divisible by 4, all valid characters
		expect(isBase64Content('AAAAAAAA')).toBe(true)
	})

	it('returns false for strings shorter than 4 characters', () => {
		expect(isBase64Content('AB')).toBe(false)
		expect(isBase64Content('ABC')).toBe(false)
		expect(isBase64Content('')).toBe(false)
	})

	it('returns false for strings containing newlines', () => {
		expect(isBase64Content('AAAA\nBBBB')).toBe(false)
	})

	it('returns false for strings containing carriage returns', () => {
		expect(isBase64Content('AAAA\rBBBB')).toBe(false)
	})

	it('returns false for strings with length % 4 equal to 2', () => {
		// 6 chars: 6 % 4 = 2, which is > 1
		expect(isBase64Content('AAAAAA')).toBe(false)
	})

	it('returns false for strings with length % 4 equal to 3', () => {
		// 7 chars: 7 % 4 = 3, which is > 1
		expect(isBase64Content('AAAAAAA')).toBe(false)
	})

	it('returns false for strings with invalid characters', () => {
		expect(isBase64Content('AAA!')).toBe(false)
		expect(isBase64Content('A A A A A')).toBe(false)
	})

	it('accepts strings with length % 4 equal to 1', () => {
		// 5 chars: 5 % 4 = 1, which is not > 1, so passes modulo check
		expect(isBase64Content('AAAAA')).toBe(true)
	})

	it('accepts valid base64 with padding characters', () => {
		expect(isBase64Content('YQ==')).toBe(true)
		expect(isBase64Content('YWI=')).toBe(true)
	})
})
