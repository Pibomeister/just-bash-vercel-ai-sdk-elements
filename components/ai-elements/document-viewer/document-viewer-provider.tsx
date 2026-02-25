'use client'

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useState,
} from 'react'
import { detectFileCategory, type FileCategory } from '@/lib/file-types'

export interface DocumentViewerFile {
	path: string
	content: string
	category: FileCategory
}

interface DocumentViewerContextType {
	isOpen: boolean
	isLoading: boolean
	file: DocumentViewerFile | null
	open: (path: string, content: string) => void
	openLoading: (path: string) => void
	close: () => void
}

const DocumentViewerContext = createContext<DocumentViewerContextType>({
	isOpen: false,
	isLoading: false,
	file: null,
	open: () => {},
	openLoading: () => {},
	close: () => {},
})

export function DocumentViewerProvider({ children }: { children: ReactNode }) {
	const [file, setFile] = useState<DocumentViewerFile | null>(null)
	const [loadingPath, setLoadingPath] = useState<string | null>(null)

	const open = useCallback((path: string, content: string) => {
		setFile({
			path,
			content,
			category: detectFileCategory(path),
		})
		setLoadingPath(null)
	}, [])

	const openLoading = useCallback((path: string) => {
		setLoadingPath(path)
		setFile(null)
	}, [])

	const close = useCallback(() => {
		setFile(null)
		setLoadingPath(null)
	}, [])

	const isOpen = file !== null || loadingPath !== null
	const isLoading = loadingPath !== null && file === null

	return (
		<DocumentViewerContext.Provider
			value={{ isOpen, isLoading, file, open, openLoading, close }}
		>
			{children}
		</DocumentViewerContext.Provider>
	)
}

export function useDocumentViewer(): DocumentViewerContextType {
	return useContext(DocumentViewerContext)
}
