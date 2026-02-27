// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import type { ChatStatus, UIMessage } from 'ai'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useFollowUpSuggestions } from '@/hooks/use-follow-up-suggestions'

function makeMessages(): UIMessage[] {
	return [
		{
			id: 'u1',
			role: 'user',
			parts: [{ type: 'text', text: 'What does article 3 say?' }],
		} as UIMessage,
		{
			id: 'a1',
			role: 'assistant',
			parts: [{ type: 'text', text: 'It defines customs authority scope.' }],
		} as UIMessage,
	]
}

describe('useFollowUpSuggestions', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('requests suggestions when status transitions submitted -> ready', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ suggestions: ['Q1', 'Q2', 'Q3'] }),
		})
		vi.stubGlobal('fetch', fetchMock)

		const messages = makeMessages()
		const { rerender } = renderHook(
			({ currentStatus }: { currentStatus: ChatStatus }) =>
				useFollowUpSuggestions(messages, currentStatus),
			{
				initialProps: { currentStatus: 'submitted' as ChatStatus },
			},
		)

		await act(async () => {
			rerender({ currentStatus: 'ready' as ChatStatus })
		})

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(1)
		})
	})
})
