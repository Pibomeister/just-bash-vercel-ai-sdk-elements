import path from 'node:path'

const mocks = vi.hoisted(() => {
	const createBashTool = vi.fn()
	const decodeWithFallback = vi.fn()
	const overlayReadFile = vi.fn()
	const overlayReadFileBuffer = vi.fn()
	const mount = vi.fn()
	const bashFsReadFileBuffer = vi.fn()
	const blobList = vi.fn()
	const getStorageBackend = vi.fn()

	const OverlayFs = vi.fn(function (this: Record<string, unknown>, options) {
		this.options = options
		this.readFile = overlayReadFile
		this.readFileBuffer = overlayReadFileBuffer
	})

	const memFsMkdir = vi.fn()
	const memFsWriteFile = vi.fn()

	const InMemoryFs = vi.fn(function (this: Record<string, unknown>) {
		this.kind = 'in-memory-fs'
		this.mkdir = memFsMkdir
		this.writeFile = memFsWriteFile
	})

	const MountableFs = vi.fn(function (
		this: Record<string, unknown>,
		{ base }: { base: unknown },
	) {
		this.base = base
		this.mount = mount
	})

	const Bash = vi.fn(function (this: Record<string, unknown>, options) {
		this.options = options
		this.fs = {
			readFileBuffer: bashFsReadFileBuffer,
		}
	})

	return {
		createBashTool,
		decodeWithFallback,
		overlayReadFile,
		overlayReadFileBuffer,
		mount,
		bashFsReadFileBuffer,
		blobList,
		getStorageBackend,
		memFsMkdir,
		memFsWriteFile,
		OverlayFs,
		InMemoryFs,
		MountableFs,
		Bash,
	}
})

vi.mock('bash-tool', () => ({
	createBashTool: mocks.createBashTool,
}))

vi.mock('just-bash', () => ({
	Bash: mocks.Bash,
	InMemoryFs: mocks.InMemoryFs,
	MountableFs: mocks.MountableFs,
	OverlayFs: mocks.OverlayFs,
}))

vi.mock('@/lib/encoding', () => ({
	decodeWithFallback: mocks.decodeWithFallback,
}))

vi.mock('@vercel/blob', () => ({
	list: mocks.blobList,
}))

vi.mock('@/lib/document-storage', () => ({
	getStorageBackend: mocks.getStorageBackend,
}))

async function importSandboxModule() {
	vi.resetModules()
	return import('./sandbox')
}

describe('lib/sandbox', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		delete process.env.UPLOADS_DIR
		mocks.getStorageBackend.mockReturnValue('local')
		mocks.createBashTool.mockResolvedValue({} as never)
		mocks.overlayReadFile.mockResolvedValue('raw-content')
		mocks.overlayReadFileBuffer.mockResolvedValue(new Uint8Array([65]))
		mocks.decodeWithFallback.mockReturnValue('decoded-content')
		mocks.bashFsReadFileBuffer.mockResolvedValue(new Uint8Array([9, 8, 7]))
		mocks.memFsMkdir.mockResolvedValue(undefined)
		mocks.memFsWriteFile.mockResolvedValue(undefined)
	})

	it('initializes toolkit once and reuses the cached instance', async () => {
		const toolkit = { run: vi.fn() }
		mocks.createBashTool.mockResolvedValue(toolkit as never)

		const { getToolkit } = await importSandboxModule()
		const first = await getToolkit()
		const second = await getToolkit()

		expect(first).toBe(toolkit)
		expect(second).toBe(toolkit)
		expect(mocks.createBashTool).toHaveBeenCalledTimes(1)
		expect(mocks.OverlayFs).toHaveBeenCalledWith({
			root: path.resolve('uploads'),
			readOnly: true,
			maxFileReadSize: 0,
		})
		expect(mocks.InMemoryFs).toHaveBeenCalledTimes(1)
		expect(mocks.MountableFs).toHaveBeenCalledWith({
			base: expect.anything(),
		})
		expect(mocks.mount).toHaveBeenCalledWith('/documents', expect.anything())
		expect(mocks.Bash).toHaveBeenCalledWith({
			fs: expect.anything(),
			cwd: '/documents',
			python: true,
		})
		expect(mocks.createBashTool).toHaveBeenCalledWith({
			sandbox: expect.anything(),
			destination: '/documents',
		})
	})

	it('uses UPLOADS_DIR when provided', async () => {
		process.env.UPLOADS_DIR = 'tmp/custom-uploads'

		const { getToolkit } = await importSandboxModule()
		await getToolkit()

		expect(mocks.OverlayFs).toHaveBeenCalledWith(
			expect.objectContaining({
				root: path.resolve('tmp/custom-uploads'),
			}),
		)
	})

	it('wraps OverlayFs.readFile to decode bytes without options and passthrough with options', async () => {
		const bytes = new Uint8Array([0x48, 0x69])
		mocks.overlayReadFileBuffer.mockResolvedValue(bytes)
		mocks.decodeWithFallback.mockReturnValue('Hi')

		const { getToolkit } = await importSandboxModule()
		await getToolkit()

		const overlayInstance = mocks.OverlayFs.mock.results[0]?.value
		const decoded = await overlayInstance.readFile('/documents/notes.txt')

		expect(decoded).toBe('Hi')
		expect(mocks.overlayReadFileBuffer).toHaveBeenCalledWith(
			'/documents/notes.txt',
		)
		expect(mocks.decodeWithFallback).toHaveBeenCalledWith(bytes)

		mocks.overlayReadFile.mockResolvedValue('already-decoded')
		const passthrough = await overlayInstance.readFile(
			'/documents/notes.txt',
			'utf-8',
		)

		expect(passthrough).toBe('already-decoded')
		expect(mocks.overlayReadFile).toHaveBeenCalledWith(
			'/documents/notes.txt',
			'utf-8',
		)
	})

	it('clears cached promise after toolkit creation failure and retries', async () => {
		mocks.createBashTool
			.mockRejectedValueOnce(new Error('toolkit init failed'))
			.mockResolvedValueOnce({ recovered: true } as never)

		const { getToolkit } = await importSandboxModule()

		await expect(getToolkit()).rejects.toThrow('toolkit init failed')
		const recovered = await getToolkit()

		expect(recovered).toEqual({ recovered: true })
		expect(mocks.createBashTool).toHaveBeenCalledTimes(2)
	})

	it('mounts uploads dir at /documents making sidecar.json accessible', async () => {
		const { getToolkit } = await importSandboxModule()
		await getToolkit()

		// OverlayFs is initialized with the uploads directory
		expect(mocks.OverlayFs).toHaveBeenCalledWith(
			expect.objectContaining({ root: path.resolve('uploads') }),
		)
		// Mounted at /documents — any file in uploads/{id}/ is visible at /documents/{id}/
		// This means sidecar.json (written by saveSidecar) is at /documents/{id}/sidecar.json
		expect(mocks.mount).toHaveBeenCalledWith('/documents', expect.anything())
	})

	it('readFileBuffer initializes toolkit and reads bytes from bash fs', async () => {
		const bytes = new Uint8Array([1, 2, 3, 4])
		mocks.bashFsReadFileBuffer.mockResolvedValue(bytes)

		const { readFileBuffer } = await importSandboxModule()
		const result = await readFileBuffer('/documents/report.pdf')

		expect(result).toEqual(bytes)
		expect(mocks.createBashTool).toHaveBeenCalledTimes(1)
		expect(mocks.bashFsReadFileBuffer).toHaveBeenCalledWith(
			'/documents/report.pdf',
		)
	})
})

describe('lib/sandbox blob hydration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		delete process.env.UPLOADS_DIR
		mocks.getStorageBackend.mockReturnValue('blob')
		mocks.createBashTool.mockResolvedValue({} as never)
		mocks.bashFsReadFileBuffer.mockResolvedValue(new Uint8Array([9, 8, 7]))
		mocks.memFsMkdir.mockResolvedValue(undefined)
		mocks.memFsWriteFile.mockResolvedValue(undefined)
	})

	it('hydrates InMemoryFs from blob when STORAGE_BACKEND is blob', async () => {
		mocks.blobList.mockResolvedValue({
			blobs: [
				{
					pathname: 'documents/doc-1/content.md',
					url: 'https://blob.vercel-storage.com/documents/doc-1/content.md',
				},
				{
					pathname: 'documents/doc-1/metadata.json',
					url: 'https://blob.vercel-storage.com/documents/doc-1/metadata.json',
				},
			],
			hasMore: false,
		} as never)

		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce({
				ok: true,
				text: vi.fn().mockResolvedValue('# Document Content'),
			} as unknown as Response)
			.mockResolvedValueOnce({
				ok: true,
				text: vi.fn().mockResolvedValue('{"documentId":"doc-1"}'),
			} as unknown as Response)

		const { getToolkit } = await importSandboxModule()
		await getToolkit()

		// Should NOT use OverlayFs
		expect(mocks.OverlayFs).not.toHaveBeenCalled()

		// Should create InMemoryFs for blob content (1 for blob data + 1 for base)
		expect(mocks.InMemoryFs).toHaveBeenCalledTimes(2)

		// Should mount at /documents
		expect(mocks.mount).toHaveBeenCalledWith('/documents', expect.anything())

		// Should create Bash with correct options
		expect(mocks.Bash).toHaveBeenCalledWith({
			fs: expect.anything(),
			cwd: '/documents',
			python: true,
		})

		// Should have written files to the InMemoryFs
		expect(mocks.memFsWriteFile).toHaveBeenCalledTimes(2)
		expect(mocks.memFsWriteFile).toHaveBeenCalledWith(
			'/documents/doc-1/content.md',
			'# Document Content',
		)
		expect(mocks.memFsWriteFile).toHaveBeenCalledWith(
			'/documents/doc-1/metadata.json',
			'{"documentId":"doc-1"}',
		)

		fetchSpy.mockRestore()
	})

	it('handles blob pagination during hydration', async () => {
		mocks.blobList
			.mockResolvedValueOnce({
				blobs: [
					{
						pathname: 'documents/doc-1/content.md',
						url: 'https://blob.vercel-storage.com/documents/doc-1/content.md',
					},
				],
				hasMore: true,
				cursor: 'page-2-cursor',
			} as never)
			.mockResolvedValueOnce({
				blobs: [
					{
						pathname: 'documents/doc-2/content.md',
						url: 'https://blob.vercel-storage.com/documents/doc-2/content.md',
					},
				],
				hasMore: false,
			} as never)

		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce({
				ok: true,
				text: vi.fn().mockResolvedValue('# Doc 1'),
			} as unknown as Response)
			.mockResolvedValueOnce({
				ok: true,
				text: vi.fn().mockResolvedValue('# Doc 2'),
			} as unknown as Response)

		const { getToolkit } = await importSandboxModule()
		await getToolkit()

		expect(mocks.blobList).toHaveBeenCalledTimes(2)
		expect(mocks.blobList).toHaveBeenCalledWith({ prefix: 'documents/' })
		expect(mocks.blobList).toHaveBeenCalledWith({
			prefix: 'documents/',
			cursor: 'page-2-cursor',
		})
		expect(mocks.memFsWriteFile).toHaveBeenCalledTimes(2)

		fetchSpy.mockRestore()
	})

	it('skips non .md and .json files during hydration', async () => {
		mocks.blobList.mockResolvedValue({
			blobs: [
				{
					pathname: 'documents/doc-1/original.pdf',
					url: 'https://blob.vercel-storage.com/documents/doc-1/original.pdf',
				},
				{
					pathname: 'documents/doc-1/content.md',
					url: 'https://blob.vercel-storage.com/documents/doc-1/content.md',
				},
			],
			hasMore: false,
		} as never)

		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			text: vi.fn().mockResolvedValue('# Content'),
		} as unknown as Response)

		const { getToolkit } = await importSandboxModule()
		await getToolkit()

		// Should only write the .md file, not the .pdf
		expect(mocks.memFsWriteFile).toHaveBeenCalledTimes(1)
		expect(mocks.memFsWriteFile).toHaveBeenCalledWith(
			'/documents/doc-1/content.md',
			'# Content',
		)
		// fetch should only be called for .md, not .pdf
		expect(fetchSpy).toHaveBeenCalledTimes(1)

		fetchSpy.mockRestore()
	})

	it('handles fetch failures gracefully without crashing (Scenario 5.6)', async () => {
		mocks.blobList.mockResolvedValue({
			blobs: [
				{
					pathname: 'documents/doc-1/content.md',
					url: 'https://blob.vercel-storage.com/documents/doc-1/content.md',
				},
				{
					pathname: 'documents/doc-2/content.md',
					url: 'https://blob.vercel-storage.com/documents/doc-2/content.md',
				},
			],
			hasMore: false,
		} as never)

		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			// doc-1 fetch fails
			.mockRejectedValueOnce(new Error('Network error'))
			// doc-2 fetch succeeds
			.mockResolvedValueOnce({
				ok: true,
				text: vi.fn().mockResolvedValue('# Doc 2'),
			} as unknown as Response)

		const { getToolkit } = await importSandboxModule()
		// Should not throw despite the failed fetch
		await expect(getToolkit()).resolves.toBeDefined()

		// Only doc-2 should be written
		expect(mocks.memFsWriteFile).toHaveBeenCalledTimes(1)
		expect(mocks.memFsWriteFile).toHaveBeenCalledWith(
			'/documents/doc-2/content.md',
			'# Doc 2',
		)

		fetchSpy.mockRestore()
	})

	it('handles docs with and without sidecars during hydration (Scenario 5.6)', async () => {
		mocks.blobList.mockResolvedValue({
			blobs: [
				{
					pathname: 'documents/doc-1/content.md',
					url: 'https://blob.vercel-storage.com/documents/doc-1/content.md',
				},
				{
					pathname: 'documents/doc-1/sidecar.json',
					url: 'https://blob.vercel-storage.com/documents/doc-1/sidecar.json',
				},
				{
					pathname: 'documents/doc-2/content.md',
					url: 'https://blob.vercel-storage.com/documents/doc-2/content.md',
				},
				// doc-2 has NO sidecar — this is expected for legacy documents
			],
			hasMore: false,
		} as never)

		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce({
				ok: true,
				text: vi.fn().mockResolvedValue('# Doc 1'),
			} as unknown as Response)
			.mockResolvedValueOnce({
				ok: true,
				text: vi.fn().mockResolvedValue('{"pages":3}'),
			} as unknown as Response)
			.mockResolvedValueOnce({
				ok: true,
				text: vi.fn().mockResolvedValue('# Doc 2'),
			} as unknown as Response)

		const { getToolkit } = await importSandboxModule()
		await getToolkit()

		// All 3 files should be hydrated without error
		expect(mocks.memFsWriteFile).toHaveBeenCalledTimes(3)

		fetchSpy.mockRestore()
	})

	it('fetches blobs in batches of HYDRATION_CONCURRENCY (10)', async () => {
		// Create 15 blobs to span two batches (10 + 5)
		const blobs = Array.from({ length: 15 }, (_, i) => ({
			pathname: `documents/doc-${i}/content.md`,
			url: `https://blob.vercel-storage.com/documents/doc-${i}/content.md`,
		}))

		mocks.blobList.mockResolvedValue({
			blobs,
			hasMore: false,
		} as never)

		let maxConcurrent = 0
		let currentConcurrent = 0

		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(async () => {
				currentConcurrent++
				if (currentConcurrent > maxConcurrent) maxConcurrent = currentConcurrent
				// Simulate async work
				await new Promise((r) => setTimeout(r, 10))
				currentConcurrent--
				return {
					ok: true,
					text: vi.fn().mockResolvedValue('# Content'),
				} as unknown as Response
			})

		const { getToolkit } = await importSandboxModule()
		await getToolkit()

		// All 15 files should be written
		expect(mocks.memFsWriteFile).toHaveBeenCalledTimes(15)
		// Max concurrency should be bounded by batch size (10)
		expect(maxConcurrent).toBeLessThanOrEqual(10)

		fetchSpy.mockRestore()
	})

	it('clears cached promise after blob hydration failure and retries', async () => {
		mocks.blobList.mockRejectedValueOnce(new Error('Blob service unavailable'))

		const { getToolkit } = await importSandboxModule()
		await expect(getToolkit()).rejects.toThrow('Blob service unavailable')

		// Setup a successful retry
		mocks.blobList.mockResolvedValueOnce({
			blobs: [],
			hasMore: false,
		} as never)

		const recovered = await getToolkit()
		expect(recovered).toBeDefined()
		expect(mocks.blobList).toHaveBeenCalledTimes(2)
	})
})
