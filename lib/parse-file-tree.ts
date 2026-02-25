// ---------------------------------------------------------------------------
// File tree parsing utilities for bash command output
// ---------------------------------------------------------------------------

export interface FileTreeNode {
	name: string
	path: string
	type: 'file' | 'folder'
	children?: FileTreeNode[]
}

/**
 * Detects whether a bash command is a file-listing command whose output
 * can be rendered as a tree rather than raw terminal text.
 */
export function isFileListingCommand(command: string): boolean {
	const trimmed = command.trim()

	// Match the *last* command in a pipeline (the one that produces output)
	const segments = trimmed.split('|')
	const last = segments[segments.length - 1].trim()

	// Also check the first command (the one that walks the fs)
	const first = segments[0].trim()

	const listingPatterns = [/^ls\b/, /^find\b/, /^tree\b/]

	return listingPatterns.some((re) => re.test(first) || re.test(last))
}

/**
 * Extract the target directory from an `ls` command string.
 * Returns `undefined` when `ls` targets the current working directory
 * (i.e. no explicit directory argument, or `.` / `/workspace`).
 */
function extractLsDirectory(command: string): string | undefined {
	const segments = command.trim().split('|')
	const first = segments[0].trim()
	if (!/^ls\b/.test(first)) return undefined
	const parts = first.split(/\s+/)
	const nonFlags = parts.slice(1).filter((p) => !p.startsWith('-'))
	const dir = nonFlags[0]
	if (!dir || dir === '.' || dir === '/workspace') return undefined
	// Strip trailing slash for consistency
	return dir.replace(/\/+$/, '')
}

/**
 * Parse newline-separated file paths into a nested tree structure.
 *
 * Handles:
 * - Plain paths from `find`, `ls`, `tree -if`
 * - `ls -la` format (extracts filename from the last column, skips "total" line)
 *
 * When `command` is provided, the target directory of an `ls` command is
 * extracted and prepended to each path so that file-read API calls resolve
 * correctly (e.g. `ls -la src` → paths like `src/index.ts` instead of `index.ts`).
 */
export function parseFileTreeOutput(
	stdout: string,
	command?: string,
): FileTreeNode[] {
	const lines = stdout
		.split('\n')
		.map((l) => l.trim())
		.filter(Boolean)

	if (lines.length === 0) return []

	// Detect `ls -l` format: lines that start with permissions like "drwxr-xr-x" or "-rw-r--r--"
	const isLongFormat = lines.some((l) => /^[d\-lrwxsStT]{10}/.test(l))

	const paths: string[] = isLongFormat
		? lines
				.filter((l) => !l.startsWith('total '))
				.map((l) => {
					// ls -l has fixed columns: perms links owner group size month day time name [-> target]
					// We need at least 9 columns; the filename starts at column 9 and may contain spaces.
					const parts = l.split(/\s+/)
					if (parts.length < 9) return ''
					// Join everything from column 9 onward to handle filenames with spaces
					let name = parts.slice(8).join(' ')
					// Strip symlink targets: "link -> target" → "link"
					const arrowIdx = name.indexOf(' -> ')
					if (arrowIdx !== -1) name = name.slice(0, arrowIdx)
					return name
				})
				.filter(Boolean)
				.filter((name) => name !== '.' && name !== '..')
		: lines

	// When `ls` targets a subdirectory, prepend the directory so paths are
	// relative to the workspace root (e.g. "index.ts" → "src/index.ts").
	const prefix = command ? extractLsDirectory(command) : undefined
	const finalPaths = prefix ? paths.map((p) => `${prefix}/${p}`) : paths

	return buildTree(finalPaths)
}

// ---------------------------------------------------------------------------
// Internal tree builder
//
// Construction uses an internal InternalNode type with Map-based children.
// Paths are computed in a single finalization pass to avoid double-prefixing.
// ---------------------------------------------------------------------------

interface InternalNode {
	name: string
	type: 'file' | 'folder'
	childMap?: Map<string, InternalNode>
}

function buildTree(paths: string[]): FileTreeNode[] {
	const root = new Map<string, InternalNode>()

	for (const raw of paths) {
		// Normalise: strip leading "./" and trailing "/"
		let p = raw.replace(/^\.\//, '')
		const isDir = p.endsWith('/')
		if (isDir) p = p.slice(0, -1)
		if (!p) continue

		const segments = p.split('/')
		insertPath(root, segments, isDir)
	}

	return finalizePaths(root, '')
}

function insertPath(
	siblings: Map<string, InternalNode>,
	segments: string[],
	isExplicitDir: boolean,
): void {
	const [head, ...rest] = segments

	if (rest.length === 0) {
		// Leaf node
		const existing = siblings.get(head)
		if (existing) {
			if (isExplicitDir) existing.type = 'folder'
		} else {
			siblings.set(head, {
				name: head,
				type: isExplicitDir ? 'folder' : 'file',
			})
		}
		return
	}

	// Intermediate segment → must be a folder
	let folder = siblings.get(head)
	if (!folder) {
		folder = { name: head, type: 'folder', childMap: new Map() }
		siblings.set(head, folder)
	} else {
		// Promote to folder if needed
		folder.type = 'folder'
		folder.childMap = folder.childMap ?? new Map()
	}

	insertPath(folder.childMap!, rest, isExplicitDir)
}

/** Single pass to compute full paths from the internal Map structure. */
function finalizePaths(
	map: Map<string, InternalNode>,
	prefix: string,
): FileTreeNode[] {
	const nodes: FileTreeNode[] = [...map.values()].map((n) => {
		const fullPath = prefix ? `${prefix}/${n.name}` : n.name
		return {
			name: n.name,
			path: fullPath,
			type: n.type,
			children: n.childMap?.size
				? finalizePaths(n.childMap, fullPath)
				: undefined,
		}
	})

	return sortNodes(nodes)
}

function sortNodes(nodes: FileTreeNode[]): FileTreeNode[] {
	return nodes.sort((a, b) => {
		// Folders first
		if (a.type === 'folder' && b.type !== 'folder') return -1
		if (a.type !== 'folder' && b.type === 'folder') return 1
		return a.name.localeCompare(b.name)
	})
}
