'use client'

import { useCallback, useMemo, useState } from 'react'

const THREAD_ID_KEY = 'mastra_thread_id'
const RESOURCE_ID_KEY = 'mastra_resource_id'

function generateId(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID()
	}
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function readOrCreate(key: string): string {
	try {
		const existing = localStorage.getItem(key)
		if (existing) return existing
		const id = generateId()
		localStorage.setItem(key, id)
		return id
	} catch {
		return generateId()
	}
}

export interface UseThreadReturn {
	threadId: string | null
	resourceId: string | null
	resetThread: () => void
}

export function useThread(): UseThreadReturn {
	// Initialize lazily from localStorage — avoids setState-in-effect lint error
	const [threadId, setThreadId] = useState<string | null>(() => {
		if (typeof window === 'undefined') return null
		return readOrCreate(THREAD_ID_KEY)
	})

	const [resourceId] = useState<string | null>(() => {
		if (typeof window === 'undefined') return null
		return readOrCreate(RESOURCE_ID_KEY)
	})

	const resetThread = useCallback(() => {
		try {
			const newThreadId = generateId()
			localStorage.setItem(THREAD_ID_KEY, newThreadId)
			setThreadId(newThreadId)
		} catch {
			// localStorage unavailable — ignore
		}
	}, [])

	// Memoize to avoid unnecessary re-renders on consumers
	return useMemo(
		() => ({ threadId, resourceId, resetThread }),
		[threadId, resourceId, resetThread],
	)
}
