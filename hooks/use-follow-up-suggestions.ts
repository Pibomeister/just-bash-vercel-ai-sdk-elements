'use client'

import type { ChatStatus, UIMessage } from 'ai'
import { useCallback, useEffect, useReducer, useRef } from 'react'

type FollowUpState = {
	suggestions: string[]
	isLoading: boolean
}

type FollowUpAction =
	| { type: 'clear' }
	| { type: 'set-loading'; value: boolean }
	| { type: 'set-suggestions'; suggestions: string[] }

function reducer(state: FollowUpState, action: FollowUpAction) {
	switch (action.type) {
		case 'clear':
			return { ...state, suggestions: [], isLoading: false }
		case 'set-loading':
			return { ...state, isLoading: action.value }
		case 'set-suggestions':
			return { ...state, suggestions: action.suggestions }
		default:
			return state
	}
}

export function useFollowUpSuggestions(
	messages: UIMessage[],
	status: ChatStatus,
) {
	const [state, dispatch] = useReducer(reducer, {
		suggestions: [],
		isLoading: false,
	})
	const prevStatusRef = useRef(status)
	const prevLengthRef = useRef(messages.length)
	const abortRef = useRef<AbortController | null>(null)

	const clear = useCallback(() => {
		abortRef.current?.abort()
		abortRef.current = null
		dispatch({ type: 'clear' })
	}, [])

	// Clear suggestions when user sends a new message
	useEffect(() => {
		if (messages.length !== prevLengthRef.current) {
			prevLengthRef.current = messages.length
			clear()
		}
	}, [messages.length, clear])

	// Fetch suggestions when generation completes
	useEffect(() => {
		const prevStatus = prevStatusRef.current
		prevStatusRef.current = status

		if (prevStatus !== 'streaming' || status !== 'ready') return
		if (messages.length < 2) return

		const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
		const lastAssistantMsg = [...messages]
			.reverse()
			.find((m) => m.role === 'assistant')

		if (!lastUserMsg || !lastAssistantMsg) return

		// Extract query from user message
		const query = lastUserMsg.parts
			.filter((p) => p.type === 'text')
			.map((p) => (p as { text: string }).text)
			.join(' ')

		// Extract response text from assistant message
		const response = lastAssistantMsg.parts
			.filter((p) => p.type === 'text')
			.map((p) => (p as { text: string }).text)
			.join(' ')

		// Extract sources from searchDocuments tool outputs
		const sources: string[] = []
		for (const part of lastAssistantMsg.parts) {
			if (
				part.type === 'tool-searchDocuments' &&
				(part as unknown as { state: string }).state === 'output-available'
			) {
				const output = (part as unknown as { output: unknown }).output
				if (Array.isArray(output)) {
					for (const r of output) {
						if (typeof r?.text === 'string') {
							sources.push(r.text)
						}
					}
				}
			}
		}

		if (!query || !response) return

		// Cancel any previous request
		abortRef.current?.abort()
		const controller = new AbortController()
		abortRef.current = controller

		dispatch({ type: 'set-loading', value: true })

		fetch('/api/suggestions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query,
				response,
				...(sources.length > 0 ? { sources } : {}),
			}),
			signal: controller.signal,
		})
			.then(async (res) => {
				if (!res.ok) throw new Error('Request failed')
				const data = (await res.json()) as { suggestions?: string[] }
				if (!controller.signal.aborted) {
					dispatch({
						type: 'set-suggestions',
						suggestions: data.suggestions ?? [],
					})
				}
			})
			.catch(() => {
				// Silently fail — suggestions are additive, not critical
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					dispatch({ type: 'set-loading', value: false })
				}
			})

		return () => {
			controller.abort()
		}
	}, [status, messages, clear])

	return {
		suggestions: state.suggestions,
		isLoading: state.isLoading,
		clear,
	}
}
