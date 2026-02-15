import { isFileListingCommand, parseFileTreeOutput } from './parse-file-tree'

// ---------------------------------------------------------------------------
// isFileListingCommand
// ---------------------------------------------------------------------------

describe('isFileListingCommand', () => {
	it('detects bare ls command', () => {
		expect(isFileListingCommand('ls')).toBe(true)
	})

	it('detects ls with flags and arguments', () => {
		expect(isFileListingCommand('ls -la src')).toBe(true)
	})

	it('detects find command', () => {
		expect(isFileListingCommand('find . -name "*.ts"')).toBe(true)
	})

	it('detects tree command', () => {
		expect(isFileListingCommand('tree -if')).toBe(true)
	})

	it('detects piped commands where first segment is a listing command', () => {
		expect(isFileListingCommand('find . | grep ts')).toBe(true)
	})

	it('detects piped commands where last segment is a listing command', () => {
		expect(isFileListingCommand('echo foo | ls')).toBe(true)
	})

	it('returns false for non-listing commands', () => {
		expect(isFileListingCommand('cat README.md')).toBe(false)
		expect(isFileListingCommand('echo hello')).toBe(false)
		expect(isFileListingCommand('grep -r "foo" .')).toBe(false)
	})

	it('handles leading and trailing whitespace', () => {
		expect(isFileListingCommand('  ls -la  ')).toBe(true)
	})
})

// ---------------------------------------------------------------------------
// parseFileTreeOutput
// ---------------------------------------------------------------------------

describe('parseFileTreeOutput', () => {
	it('returns empty array for empty input', () => {
		expect(parseFileTreeOutput('')).toEqual([])
	})

	it('returns empty array for whitespace-only input', () => {
		expect(parseFileTreeOutput('  \n  \n  ')).toEqual([])
	})

	it('parses simple newline-separated paths into a flat tree', () => {
		const stdout = 'file-a.ts\nfile-b.ts\nfile-c.ts'
		const result = parseFileTreeOutput(stdout)

		expect(result).toEqual([
			{
				name: 'file-a.ts',
				path: 'file-a.ts',
				type: 'file',
				children: undefined,
			},
			{
				name: 'file-b.ts',
				path: 'file-b.ts',
				type: 'file',
				children: undefined,
			},
			{
				name: 'file-c.ts',
				path: 'file-c.ts',
				type: 'file',
				children: undefined,
			},
		])
	})

	it('handles ./ prefix normalization', () => {
		const stdout = './src/index.ts\n./README.md'
		const result = parseFileTreeOutput(stdout)

		const readme = result.find((n) => n.name === 'README.md')
		expect(readme).toBeDefined()
		expect(readme!.path).toBe('README.md')

		const src = result.find((n) => n.name === 'src')
		expect(src).toBeDefined()
		expect(src!.type).toBe('folder')
		expect(src!.children).toEqual([
			{
				name: 'index.ts',
				path: 'src/index.ts',
				type: 'file',
				children: undefined,
			},
		])
	})

	it('handles trailing / as folder indicator', () => {
		const stdout = 'src/\nlib/'
		const result = parseFileTreeOutput(stdout)

		expect(result).toEqual([
			{ name: 'lib', path: 'lib', type: 'folder', children: undefined },
			{ name: 'src', path: 'src', type: 'folder', children: undefined },
		])
	})

	it('builds nested directory tree correctly', () => {
		const stdout = 'src/utils/helpers.ts\nsrc/index.ts\nREADME.md'
		const result = parseFileTreeOutput(stdout)

		// Folders first, then files, alphabetically within each group
		expect(result[0].name).toBe('src')
		expect(result[0].type).toBe('folder')
		expect(result[1].name).toBe('README.md')
		expect(result[1].type).toBe('file')

		// Nested children
		const src = result[0]
		expect(src.children).toHaveLength(2)
		// folders first: utils, then file: index.ts
		expect(src.children![0].name).toBe('utils')
		expect(src.children![0].type).toBe('folder')
		expect(src.children![1].name).toBe('index.ts')
		expect(src.children![1].type).toBe('file')

		// Deeply nested
		const utils = src.children![0]
		expect(utils.children).toHaveLength(1)
		expect(utils.children![0]).toEqual({
			name: 'helpers.ts',
			path: 'src/utils/helpers.ts',
			type: 'file',
			children: undefined,
		})
	})

	it('sorts folders before files, alphabetically within each group', () => {
		const stdout = 'zebra.ts\nalpha/\nbeta.ts\nmango/'
		const result = parseFileTreeOutput(stdout)

		expect(result.map((n) => n.name)).toEqual([
			'alpha',
			'mango',
			'beta.ts',
			'zebra.ts',
		])
	})

	it('parses ls -la long format, stripping permissions and metadata', () => {
		const stdout = [
			'total 32',
			'drwxr-xr-x  5 user staff  160 Jan 10 10:00 .',
			'drwxr-xr-x 10 user staff  320 Jan 10 09:00 ..',
			'drwxr-xr-x  3 user staff   96 Jan 10 10:00 src',
			'-rw-r--r--  1 user staff 1234 Jan 10 10:00 package.json',
			'-rw-r--r--  1 user staff  567 Jan 10 10:00 tsconfig.json',
		].join('\n')

		const result = parseFileTreeOutput(stdout)

		// . and .. should be filtered out
		const names = result.map((n) => n.name)
		expect(names).not.toContain('.')
		expect(names).not.toContain('..')

		// "total" line should be stripped
		expect(names).not.toContain('total')

		// Names extracted from ls -l are flat (no trailing /), so the tree
		// builder treats them all as files sorted alphabetically
		expect(names).toEqual(['package.json', 'src', 'tsconfig.json'])
	})

	it('strips total line from ls -l output', () => {
		const stdout = [
			'total 8',
			'-rw-r--r--  1 user staff  100 Jan 10 10:00 a.txt',
		].join('\n')

		const result = parseFileTreeOutput(stdout)
		expect(result).toHaveLength(1)
		expect(result[0].name).toBe('a.txt')
	})

	it('ignores malformed ls -l rows with fewer than 9 columns', () => {
		const stdout = [
			'drwxr-xr-x 2 user staff',
			'-rw-r--r--  1 user staff  100 Jan 10 10:00 valid.ts',
		].join('\n')

		const result = parseFileTreeOutput(stdout)

		expect(result).toEqual([
			{
				name: 'valid.ts',
				path: 'valid.ts',
				type: 'file',
				children: undefined,
			},
		])
	})

	it('strips symlink targets from ls -la output', () => {
		const stdout = [
			'lrwxr-xr-x  1 user staff   10 Jan 10 10:00 link -> target',
			'-rw-r--r--  1 user staff  100 Jan 10 10:00 regular.ts',
		].join('\n')

		const result = parseFileTreeOutput(stdout)
		const names = result.map((n) => n.name)
		expect(names).toContain('link')
		expect(names).toContain('regular.ts')
		// Symlink target should not leak into the name
		expect(names).not.toContain('link -> target')
	})

	it('handles . and .. entries from ls -la by filtering them out', () => {
		const stdout = [
			'drwxr-xr-x  2 user staff  64 Jan 10 10:00 .',
			'drwxr-xr-x  5 user staff 160 Jan 10 10:00 ..',
			'-rw-r--r--  1 user staff  42 Jan 10 10:00 file.ts',
		].join('\n')

		const result = parseFileTreeOutput(stdout)
		expect(result).toHaveLength(1)
		expect(result[0].name).toBe('file.ts')
	})

	it('prepends ls target directory when command is provided', () => {
		const stdout = 'index.ts\nutils.ts'
		const result = parseFileTreeOutput(stdout, 'ls src')

		// The prefix "src" is prepended to each path (e.g. "src/index.ts"),
		// and buildTree splits on "/" creating a nested folder structure.
		expect(result).toHaveLength(1)
		expect(result[0].name).toBe('src')
		expect(result[0].type).toBe('folder')
		expect(result[0].path).toBe('src')
		expect(result[0].children).toEqual([
			{
				name: 'index.ts',
				path: 'src/index.ts',
				type: 'file',
				children: undefined,
			},
			{
				name: 'utils.ts',
				path: 'src/utils.ts',
				type: 'file',
				children: undefined,
			},
		])
	})

	it('prepends ls target directory for ls -la with subdirectory', () => {
		const stdout = [
			'total 16',
			'-rw-r--r--  1 user staff  100 Jan 10 10:00 helpers.ts',
			'-rw-r--r--  1 user staff  200 Jan 10 10:00 index.ts',
		].join('\n')

		const result = parseFileTreeOutput(stdout, 'ls -la src/utils')

		// Prefix "src/utils" creates nested folder structure via buildTree
		expect(result).toHaveLength(1)
		const src = result[0]
		expect(src.name).toBe('src')
		expect(src.type).toBe('folder')

		const utils = src.children![0]
		expect(utils.name).toBe('utils')
		expect(utils.type).toBe('folder')
		expect(utils.children).toEqual([
			{
				name: 'helpers.ts',
				path: 'src/utils/helpers.ts',
				type: 'file',
				children: undefined,
			},
			{
				name: 'index.ts',
				path: 'src/utils/index.ts',
				type: 'file',
				children: undefined,
			},
		])
	})

	it('does not prepend directory when ls targets cwd (no dir argument)', () => {
		const stdout = 'file.ts'
		const result = parseFileTreeOutput(stdout, 'ls -la')

		expect(result[0].path).toBe('file.ts')
	})

	it('ignores entries that normalize to an empty path', () => {
		const stdout = './\n./src/index.ts'
		const result = parseFileTreeOutput(stdout)

		expect(result).toHaveLength(1)
		expect(result[0].name).toBe('src')
		expect(result[0].children?.[0]).toEqual({
			name: 'index.ts',
			path: 'src/index.ts',
			type: 'file',
			children: undefined,
		})
	})

	it('promotes an existing file node to folder when explicit directory path appears', () => {
		const stdout = 'entry\nentry/'
		const result = parseFileTreeOutput(stdout)

		expect(result).toEqual([
			{ name: 'entry', path: 'entry', type: 'folder', children: undefined },
		])
	})

	it('keeps duplicate leaf paths as a single file node', () => {
		const stdout = 'dup.txt\ndup.txt'
		const result = parseFileTreeOutput(stdout)

		expect(result).toEqual([
			{
				name: 'dup.txt',
				path: 'dup.txt',
				type: 'file',
				children: undefined,
			},
		])
	})

	it('promotes an intermediate file path to folder when nested children appear', () => {
		const stdout = 'src\nsrc/index.ts'
		const result = parseFileTreeOutput(stdout)

		expect(result).toEqual([
			{
				name: 'src',
				path: 'src',
				type: 'folder',
				children: [
					{
						name: 'index.ts',
						path: 'src/index.ts',
						type: 'file',
						children: undefined,
					},
				],
			},
		])
	})

	it('does not prepend directory when ls targets . explicitly', () => {
		const stdout = 'file.ts'
		const result = parseFileTreeOutput(stdout, 'ls -la .')

		expect(result[0].path).toBe('file.ts')
	})

	it('does not prepend directory for non-ls commands', () => {
		const stdout = 'src/file.ts'
		const result = parseFileTreeOutput(stdout, 'find . -name "*.ts"')

		expect(result[0].children![0].path).toBe('src/file.ts')
	})
})
