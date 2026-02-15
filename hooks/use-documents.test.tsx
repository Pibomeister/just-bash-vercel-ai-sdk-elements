// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { DocumentsProvider, useDocuments } from '@/hooks/use-documents'
import { createDocumentMetadata } from '@/test/helpers/fixtures'

function createWrapper() {
	return function Wrapper({ children }: { children: ReactNode }) {
		return <DocumentsProvider>{children}</DocumentsProvider>
	}
}

const mockDoc1 = createDocumentMetadata({
	documentId: 'doc-1',
	originalName: 'first.pdf',
})
const mockDoc2 = createDocumentMetadata({
	documentId: 'doc-2',
	originalName: 'second.pdf',
})

describe('useDocuments', () => {
	beforeEach(() => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => [mockDoc1, mockDoc2],
		})
	})

	it('throws when used outside DocumentsProvider', () => {
		// Suppress React error boundary console output
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

		expect(() => {
			renderHook(() => useDocuments())
		}).toThrow('useDocuments must be used within a DocumentsProvider')

		spy.mockRestore()
	})

	it('fetches documents on mount', async () => {
		const { result } = renderHook(() => useDocuments(), {
			wrapper: createWrapper(),
		})

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})

		expect(globalThis.fetch).toHaveBeenCalledWith('/api/documents')
		expect(result.current.documents).toHaveLength(2)
		expect(result.current.documents[0].documentId).toBe('doc-1')
		expect(result.current.documents[1].documentId).toBe('doc-2')
	})

	it('starts in loading state', async () => {
		const { result } = renderHook(() => useDocuments(), {
			wrapper: createWrapper(),
		})

		// isLoading is true initially before fetch resolves
		expect(result.current.isLoading).toBe(true)

		// Wait for fetch to settle to avoid act() warning
		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})
	})

	it('addDocument prepends to the list', async () => {
		const { result } = renderHook(() => useDocuments(), {
			wrapper: createWrapper(),
		})

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})

		const newDoc = createDocumentMetadata({
			documentId: 'doc-3',
			originalName: 'third.pdf',
		})

		act(() => {
			result.current.addDocument(newDoc)
		})

		expect(result.current.documents).toHaveLength(3)
		expect(result.current.documents[0].documentId).toBe('doc-3')
		expect(result.current.documents[1].documentId).toBe('doc-1')
	})

	it('removeDocument sends DELETE and removes from state', async () => {
		;(globalThis.fetch as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => [mockDoc1, mockDoc2],
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			})

		const { result } = renderHook(() => useDocuments(), {
			wrapper: createWrapper(),
		})

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})

		await act(async () => {
			await result.current.removeDocument('doc-1')
		})

		expect(globalThis.fetch).toHaveBeenCalledWith('/api/documents/doc-1', {
			method: 'DELETE',
		})
		expect(result.current.documents).toHaveLength(1)
		expect(result.current.documents[0].documentId).toBe('doc-2')
	})

	it('refreshDocuments re-fetches the list', async () => {
		const updatedDoc = createDocumentMetadata({
			documentId: 'doc-99',
			originalName: 'refreshed.pdf',
		})

		;(globalThis.fetch as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => [mockDoc1],
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => [updatedDoc],
			})

		const { result } = renderHook(() => useDocuments(), {
			wrapper: createWrapper(),
		})

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})

		expect(result.current.documents).toHaveLength(1)
		expect(result.current.documents[0].documentId).toBe('doc-1')

		await act(async () => {
			await result.current.refreshDocuments()
		})

		expect(result.current.documents).toHaveLength(1)
		expect(result.current.documents[0].documentId).toBe('doc-99')
	})

	it('handles fetch failure gracefully with empty documents', async () => {
		;(globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new Error('Network error'),
		)

		const { result } = renderHook(() => useDocuments(), {
			wrapper: createWrapper(),
		})

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})

		expect(result.current.documents).toEqual([])
	})

	it('handles non-ok response gracefully', async () => {
		;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: false,
			status: 500,
		})

		const { result } = renderHook(() => useDocuments(), {
			wrapper: createWrapper(),
		})

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})

		expect(result.current.documents).toEqual([])
	})
})
