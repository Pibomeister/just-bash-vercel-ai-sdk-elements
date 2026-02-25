'use client'

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react'
import type { DocumentMetadata } from '@/lib/types/documents'

interface DocumentsContextValue {
	documents: DocumentMetadata[]
	isLoading: boolean
	addDocument: (doc: DocumentMetadata) => void
	removeDocument: (documentId: string) => Promise<void>
	refreshDocuments: () => Promise<void>
}

const DocumentsContext = createContext<DocumentsContextValue | null>(null)

export function DocumentsProvider({ children }: { children: ReactNode }) {
	const [documents, setDocuments] = useState<DocumentMetadata[]>([])
	const [isLoading, setIsLoading] = useState(true)

	const refreshDocuments = useCallback(async () => {
		try {
			const res = await fetch('/api/documents')
			if (res.ok) {
				const data = (await res.json()) as DocumentMetadata[]
				setDocuments(data)
			}
		} catch {
			// Silently fail — documents list will be empty
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		refreshDocuments()
	}, [refreshDocuments])

	const addDocument = useCallback((doc: DocumentMetadata) => {
		setDocuments((prev) => [doc, ...prev])
	}, [])

	const removeDocument = useCallback(async (documentId: string) => {
		try {
			await fetch(`/api/documents/${documentId}`, { method: 'DELETE' })
			setDocuments((prev) => prev.filter((d) => d.documentId !== documentId))
		} catch {
			// Silently fail — could add error toast in future
		}
	}, [])

	return (
		<DocumentsContext.Provider
			value={{
				documents,
				isLoading,
				addDocument,
				removeDocument,
				refreshDocuments,
			}}
		>
			{children}
		</DocumentsContext.Provider>
	)
}

export function useDocuments(): DocumentsContextValue {
	const ctx = useContext(DocumentsContext)
	if (!ctx) {
		throw new Error('useDocuments must be used within a DocumentsProvider')
	}
	return ctx
}
