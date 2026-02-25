'use client'

import type { PropsWithChildren } from 'react'

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'

export interface PromptBoxContextValue {
	isRecording: boolean
	recordingTime: number
	startRecording: () => void
	stopRecording: () => void
	previewImage: string | null
	setPreviewImage: (url: string | null) => void
}

const PromptBoxContext = createContext<PromptBoxContextValue | null>(null)

export const usePromptBoxContext = () => {
	const ctx = useContext(PromptBoxContext)
	if (!ctx) {
		throw new Error(
			'usePromptBoxContext must be used within a PromptBoxContextProvider',
		)
	}
	return ctx
}

export const PromptBoxContextProvider = ({ children }: PropsWithChildren) => {
	const [isRecording, setIsRecording] = useState(false)
	const [recordingTime, setRecordingTime] = useState(0)
	const [previewImage, setPreviewImage] = useState<string | null>(null)
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

	const startRecording = useCallback(() => {
		setRecordingTime(0)
		setIsRecording(true)
	}, [])

	const stopRecording = useCallback(() => {
		setIsRecording(false)
		setRecordingTime(0)
	}, [])

	useEffect(() => {
		if (isRecording) {
			intervalRef.current = setInterval(() => {
				setRecordingTime((prev) => prev + 1)
			}, 1000)
		} else if (intervalRef.current) {
			clearInterval(intervalRef.current)
			intervalRef.current = null
		}

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current)
			}
		}
	}, [isRecording])

	const value = useMemo<PromptBoxContextValue>(
		() => ({
			isRecording,
			recordingTime,
			startRecording,
			stopRecording,
			previewImage,
			setPreviewImage,
		}),
		[isRecording, recordingTime, startRecording, stopRecording, previewImage],
	)

	return (
		<PromptBoxContext.Provider value={value}>
			{children}
		</PromptBoxContext.Provider>
	)
}
