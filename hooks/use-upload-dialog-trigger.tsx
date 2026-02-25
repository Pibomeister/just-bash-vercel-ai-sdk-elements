'use client'

import { createContext, useContext, useMemo, useState } from 'react'

type UploadDialogOpenHandler = () => void

interface UploadDialogTriggerContextValue {
	openUploadDialog: () => void
	setOpenHandler: (handler: UploadDialogOpenHandler | null) => void
	hasOpenHandler: boolean
}

const UploadDialogTriggerContext =
	createContext<UploadDialogTriggerContextValue | null>(null)

export function UploadDialogTriggerProvider({
	children,
}: {
	children: React.ReactNode
}) {
	const [openHandler, setOpenHandler] =
		useState<UploadDialogOpenHandler | null>(null)

	const value = useMemo<UploadDialogTriggerContextValue>(
		() => ({
			openUploadDialog: () => {
				openHandler?.()
			},
			setOpenHandler,
			hasOpenHandler: openHandler !== null,
		}),
		[openHandler],
	)

	return (
		<UploadDialogTriggerContext.Provider value={value}>
			{children}
		</UploadDialogTriggerContext.Provider>
	)
}

export function useUploadDialogTrigger() {
	const context = useContext(UploadDialogTriggerContext)
	if (!context) {
		throw new Error(
			'useUploadDialogTrigger must be used within UploadDialogTriggerProvider',
		)
	}
	return context
}
