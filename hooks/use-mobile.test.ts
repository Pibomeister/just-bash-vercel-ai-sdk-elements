// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { useIsMobile } from '@/hooks/use-mobile'

function mockMatchMedia(matches: boolean) {
	const listeners: Array<() => void> = []

	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches,
			media: query,
			addEventListener: vi.fn((_event: string, cb: () => void) => {
				listeners.push(cb)
			}),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			onchange: null,
			dispatchEvent: vi.fn(),
		})),
	})

	return listeners
}

describe('useIsMobile', () => {
	it('returns false when window width is above breakpoint', () => {
		mockMatchMedia(false)
		Object.defineProperty(window, 'innerWidth', {
			writable: true,
			value: 1024,
		})

		const { result } = renderHook(() => useIsMobile())

		expect(result.current).toBe(false)
	})

	it('returns true when window width is below breakpoint', () => {
		mockMatchMedia(true)
		Object.defineProperty(window, 'innerWidth', {
			writable: true,
			value: 500,
		})

		const { result } = renderHook(() => useIsMobile())

		expect(result.current).toBe(true)
	})

	it('returns false for initial render before effect runs', () => {
		mockMatchMedia(false)
		Object.defineProperty(window, 'innerWidth', {
			writable: true,
			value: 1024,
		})

		const { result } = renderHook(() => useIsMobile())

		// After effect, isMobile is false since innerWidth (1024) >= 768
		expect(result.current).toBe(false)
	})

	it('updates when media query change fires', () => {
		const listeners = mockMatchMedia(false)
		Object.defineProperty(window, 'innerWidth', {
			writable: true,
			value: 1024,
		})

		const { result } = renderHook(() => useIsMobile())
		expect(result.current).toBe(false)

		// Simulate resize to mobile
		Object.defineProperty(window, 'innerWidth', {
			writable: true,
			value: 500,
		})

		act(() => {
			for (const listener of listeners) {
				listener()
			}
		})

		expect(result.current).toBe(true)
	})
})
