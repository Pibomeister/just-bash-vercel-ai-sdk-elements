'use client'

import type { HTMLAttributes } from 'react'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { usePromptBoxContext } from './prompt-box-context'

const BAR_COUNT = 40

// Deterministic pseudo-random per bar index for consistent renders
const seededRandom = (seed: number) => {
	const x = Math.sin(seed * 9301 + 49297) * 49297
	return x - Math.floor(x)
}

const formatTime = (seconds: number) => {
	const m = Math.floor(seconds / 60)
		.toString()
		.padStart(2, '0')
	const s = (seconds % 60).toString().padStart(2, '0')
	return `${m}:${s}`
}

export type PromptBoxVoiceRecorderProps = HTMLAttributes<HTMLDivElement>

export const PromptBoxVoiceRecorder = ({
	className,
	...props
}: PromptBoxVoiceRecorderProps) => {
	const { isRecording, recordingTime } = usePromptBoxContext()

	const bars = useMemo(
		() =>
			Array.from({ length: BAR_COUNT }, (_, i) => ({
				delay: i * 30,
				duration: 350 + Math.round(seededRandom(i) * 550),
			})),
		[],
	)

	if (!isRecording) return null

	return (
		<div
			className={cn('flex items-center gap-3 px-4 py-3', className)}
			{...props}
		>
			{/* Recording indicator */}
			<div className="flex items-center gap-2">
				<div className="size-2.5 animate-pulse rounded-full bg-prompt-box-red" />
				<span className="font-mono text-sm tabular-nums text-prompt-box-red">
					{formatTime(recordingTime)}
				</span>
			</div>

			{/* Waveform */}
			<div className="flex flex-1 items-center justify-center gap-[2px]">
				{bars.map((bar, i) => (
					<div
						key={i}
						className="animate-bar-pulse w-[2px] rounded-full bg-gradient-to-t from-prompt-box-red/30 to-prompt-box-red/70"
						style={
							{
								height: '24px',
								'--bar-delay': `${bar.delay}ms`,
								'--bar-duration': `${bar.duration}ms`,
							} as React.CSSProperties
						}
					/>
				))}
			</div>
		</div>
	)
}
