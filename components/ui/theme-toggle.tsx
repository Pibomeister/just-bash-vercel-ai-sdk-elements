'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
	className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
	const { resolvedTheme, setTheme } = useTheme()
	const [pendingTheme, setPendingTheme] = useState<'light' | 'dark' | null>(
		null,
	)
	const pendingResetTimerRef = useRef<number | null>(null)

	useEffect(() => {
		return () => {
			if (pendingResetTimerRef.current !== null) {
				window.clearTimeout(pendingResetTimerRef.current)
			}
		}
	}, [])

	const resolved =
		resolvedTheme === 'dark' || resolvedTheme === 'light'
			? resolvedTheme
			: 'dark'
	const theme = pendingTheme ?? resolved
	const isDark = theme === 'dark'

	const toggleTheme = () => {
		const nextTheme = isDark ? 'light' : 'dark'
		setPendingTheme(nextTheme)
		setTheme(nextTheme)

		if (pendingResetTimerRef.current !== null) {
			window.clearTimeout(pendingResetTimerRef.current)
		}
		pendingResetTimerRef.current = window.setTimeout(() => {
			setPendingTheme(null)
			pendingResetTimerRef.current = null
		}, 400)
	}

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault()
			toggleTheme()
		}
	}

	return (
		<div
			className={cn(
				'flex w-16 h-8 p-1 rounded-full cursor-pointer transition-all duration-300',
				isDark
					? 'bg-zinc-950 border border-zinc-800'
					: 'bg-white border border-zinc-200',
				className,
			)}
			onClick={toggleTheme}
			onKeyDown={handleKeyDown}
			role="button"
			aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
			tabIndex={0}
		>
			<div className="flex justify-between items-center w-full">
				<div
					className={cn(
						'flex justify-center items-center w-6 h-6 rounded-full transition-transform duration-300',
						isDark
							? 'transform translate-x-0 bg-zinc-800'
							: 'transform translate-x-8 bg-gray-200',
					)}
				>
					{isDark ? (
						<Moon className="w-4 h-4 text-white" strokeWidth={1.5} />
					) : (
						<Sun className="w-4 h-4 text-gray-700" strokeWidth={1.5} />
					)}
				</div>
				<div
					className={cn(
						'flex justify-center items-center w-6 h-6 rounded-full transition-transform duration-300',
						isDark ? 'bg-transparent' : 'transform -translate-x-8',
					)}
				>
					{isDark ? (
						<Sun className="w-4 h-4 text-gray-500" strokeWidth={1.5} />
					) : (
						<Moon className="w-4 h-4 text-black" strokeWidth={1.5} />
					)}
				</div>
			</div>
		</div>
	)
}
