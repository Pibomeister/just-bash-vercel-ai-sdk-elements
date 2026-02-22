// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useThread } from './use-thread'

// ---------------------------------------------------------------------------
// Stub localStorage with a plain in-memory store so tests are self-contained
// regardless of the underlying jsdom Storage implementation.
// ---------------------------------------------------------------------------

const store: Record<string, string> = {}

vi.stubGlobal('localStorage', {
	getItem: (key: string) => store[key] ?? null,
	setItem: (key: string, value: string) => {
		store[key] = value
	},
	removeItem: (key: string) => {
		delete store[key]
	},
	clear: () => {
		Object.keys(store).forEach((k) => {
			delete store[k]
		})
	},
	get length() {
		return Object.keys(store).length
	},
})

function clearLocalStorage() {
	delete store['mastra_thread_id']
	delete store['mastra_resource_id']
}

describe('useThread', () => {
	beforeEach(() => {
		clearLocalStorage()
	})

	afterEach(() => {
		clearLocalStorage()
		vi.restoreAllMocks()
	})

	// -----------------------------------------------------------------------
	// Initial state
	// -----------------------------------------------------------------------

	describe('initial state', () => {
		it('generates a threadId on first render when localStorage is empty', () => {
			const { result } = renderHook(() => useThread())

			expect(result.current.threadId).toBeTruthy()
			expect(typeof result.current.threadId).toBe('string')
		})

		it('generates a resourceId on first render when localStorage is empty', () => {
			const { result } = renderHook(() => useThread())

			expect(result.current.resourceId).toBeTruthy()
			expect(typeof result.current.resourceId).toBe('string')
		})

		it('threadId and resourceId are different values', () => {
			const { result } = renderHook(() => useThread())

			expect(result.current.threadId).not.toBe(result.current.resourceId)
		})

		it('persists the generated threadId to localStorage', () => {
			const { result } = renderHook(() => useThread())

			const stored = localStorage.getItem('mastra_thread_id')
			expect(stored).toBe(result.current.threadId)
		})

		it('persists the generated resourceId to localStorage', () => {
			const { result } = renderHook(() => useThread())

			const stored = localStorage.getItem('mastra_resource_id')
			expect(stored).toBe(result.current.resourceId)
		})
	})

	// -----------------------------------------------------------------------
	// Persistence across renders
	// -----------------------------------------------------------------------

	describe('persistence', () => {
		it('reads the same threadId on subsequent renders', () => {
			const { result: r1 } = renderHook(() => useThread())
			const firstId = r1.current.threadId

			// Simulate a new hook instance (new component mount) with same localStorage
			const { result: r2 } = renderHook(() => useThread())

			expect(r2.current.threadId).toBe(firstId)
		})

		it('reads the same resourceId on subsequent renders', () => {
			const { result: r1 } = renderHook(() => useThread())
			const firstResourceId = r1.current.resourceId

			const { result: r2 } = renderHook(() => useThread())

			expect(r2.current.resourceId).toBe(firstResourceId)
		})

		it('reads existing threadId from localStorage if already set', () => {
			localStorage.setItem('mastra_thread_id', 'pre-existing-thread-id')

			const { result } = renderHook(() => useThread())

			expect(result.current.threadId).toBe('pre-existing-thread-id')
		})

		it('reads existing resourceId from localStorage if already set', () => {
			localStorage.setItem('mastra_resource_id', 'pre-existing-resource-id')

			const { result } = renderHook(() => useThread())

			expect(result.current.resourceId).toBe('pre-existing-resource-id')
		})
	})

	// -----------------------------------------------------------------------
	// resetThread
	// -----------------------------------------------------------------------

	describe('resetThread', () => {
		it('generates a new threadId when called', () => {
			const { result } = renderHook(() => useThread())
			const originalId = result.current.threadId

			act(() => {
				result.current.resetThread()
			})

			expect(result.current.threadId).not.toBe(originalId)
			expect(result.current.threadId).toBeTruthy()
		})

		it('persists the new threadId to localStorage', () => {
			const { result } = renderHook(() => useThread())

			act(() => {
				result.current.resetThread()
			})

			const stored = localStorage.getItem('mastra_thread_id')
			expect(stored).toBe(result.current.threadId)
		})

		it('does not change the resourceId', () => {
			const { result } = renderHook(() => useThread())
			const originalResourceId = result.current.resourceId

			act(() => {
				result.current.resetThread()
			})

			expect(result.current.resourceId).toBe(originalResourceId)
		})

		it('generates a new UUID each time it is called', () => {
			const { result } = renderHook(() => useThread())

			act(() => {
				result.current.resetThread()
			})
			const id1 = result.current.threadId

			act(() => {
				result.current.resetThread()
			})
			const id2 = result.current.threadId

			expect(id1).not.toBe(id2)
		})
	})

	// -----------------------------------------------------------------------
	// localStorage error handling
	// -----------------------------------------------------------------------

	describe('localStorage unavailability', () => {
		it('falls back gracefully when localStorage.getItem throws', () => {
			vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
				throw new DOMException('localStorage unavailable', 'SecurityError')
			})
			vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
				throw new DOMException('localStorage unavailable', 'SecurityError')
			})

			const { result } = renderHook(() => useThread())

			// Should still return a non-null id generated via the fallback path
			expect(result.current.threadId).toBeTruthy()
			expect(result.current.resourceId).toBeTruthy()
		})

		it('falls back gracefully in resetThread when localStorage.setItem throws', () => {
			const { result } = renderHook(() => useThread())

			vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
				throw new DOMException('localStorage unavailable', 'SecurityError')
			})

			// Should not throw — error is swallowed
			expect(() => {
				act(() => {
					result.current.resetThread()
				})
			}).not.toThrow()
		})
	})

	// -----------------------------------------------------------------------
	// Return value stability
	// -----------------------------------------------------------------------

	describe('return value stability', () => {
		it('resetThread reference is stable across renders', () => {
			const { result, rerender } = renderHook(() => useThread())
			const firstReset = result.current.resetThread

			rerender()

			expect(result.current.resetThread).toBe(firstReset)
		})
	})
})
