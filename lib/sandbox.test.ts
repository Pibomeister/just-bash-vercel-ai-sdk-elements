import path from 'node:path'

const mocks = vi.hoisted(() => {
	const createBashTool = vi.fn()
	const decodeWithFallback = vi.fn()
	const overlayReadFile = vi.fn()
	const overlayReadFileBuffer = vi.fn()
	const mount = vi.fn()
	const bashFsReadFileBuffer = vi.fn()

	const OverlayFs = vi.fn(function (this: Record<string, unknown>, options) {
		this.options = options
		this.readFile = overlayReadFile
		this.readFileBuffer = overlayReadFileBuffer
	})

	const InMemoryFs = vi.fn(function (this: Record<string, unknown>) {
		this.kind = 'in-memory-fs'
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

async function importSandboxModule() {
	vi.resetModules()
	return import('./sandbox')
}

describe('lib/sandbox', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		delete process.env.UPLOADS_DIR
		mocks.createBashTool.mockResolvedValue({} as never)
		mocks.overlayReadFile.mockResolvedValue('raw-content')
		mocks.overlayReadFileBuffer.mockResolvedValue(new Uint8Array([65]))
		mocks.decodeWithFallback.mockReturnValue('decoded-content')
		mocks.bashFsReadFileBuffer.mockResolvedValue(new Uint8Array([9, 8, 7]))
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
