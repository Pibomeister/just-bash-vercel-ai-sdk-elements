// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { useInstructionsState } from '@/hooks/use-instructions'

describe('useInstructionsState', () => {
	it('returns default instructions on init', () => {
		const { result } = renderHook(() => useInstructionsState())

		expect(result.current.instructions).toHaveLength(4)
		expect(result.current.instructions.map((i) => i.id)).toEqual([
			'concise',
			'code-examples',
			'step-by-step',
			'bash-focus',
		])
	})

	it('has empty activeIds by default', () => {
		const { result } = renderHook(() => useInstructionsState())

		expect(result.current.activeIds).toEqual([])
	})

	it('returns empty string from getActiveInstructionText when no activeIds', () => {
		const { result } = renderHook(() => useInstructionsState())

		expect(result.current.getActiveInstructionText()).toBe('')
	})

	it('returns formatted text for a single active instruction', () => {
		const { result } = renderHook(() => useInstructionsState())

		act(() => {
			result.current.setActiveIds(['concise'])
		})

		const text = result.current.getActiveInstructionText()
		expect(text).toBe(
			'- Be Concise: Provide brief, focused responses. Avoid unnecessary elaboration unless specifically requested. Get to the point quickly.',
		)
	})

	it('returns multiple active instructions joined with newlines', () => {
		const { result } = renderHook(() => useInstructionsState())

		act(() => {
			result.current.setActiveIds(['concise', 'bash-focus'])
		})

		const text = result.current.getActiveInstructionText()
		const lines = text.split('\n')
		expect(lines).toHaveLength(2)
		expect(lines[0]).toMatch(/^- Be Concise:/)
		expect(lines[1]).toMatch(/^- Use Bash Commands:/)
	})

	it('returns empty string when activeIds reference nonexistent instructions', () => {
		const { result } = renderHook(() => useInstructionsState())

		act(() => {
			result.current.setActiveIds(['nonexistent-id'])
		})

		expect(result.current.getActiveInstructionText()).toBe('')
	})
})
