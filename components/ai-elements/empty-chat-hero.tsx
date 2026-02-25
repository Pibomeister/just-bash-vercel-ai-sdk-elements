'use client'

import type { LucideIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Suggestion } from '@/components/ai-elements/suggestion'
import { cn } from '@/lib/utils'

const composerTransition = {
	duration: 0.24,
	ease: [0.22, 1, 0.36, 1] as const,
}

export interface EmptyHeroSuggestion {
	id: string
	label: string
	icon: LucideIcon
}

export interface EmptyChatHeroProps {
	title: string
	description: string
	accentIcon?: ReactNode
	suggestions: EmptyHeroSuggestion[]
	onSuggestion: (value: string) => void
	composer: ReactNode
	composerLayoutId: string
	showComposer?: boolean
	showSuggestions?: boolean
	className?: string
}

export const EmptyChatHero = ({
	title,
	description,
	accentIcon,
	suggestions,
	onSuggestion,
	composer,
	composerLayoutId,
	showComposer = true,
	showSuggestions = true,
	className,
}: EmptyChatHeroProps) => (
	<div
		className={cn(
			'mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4',
			className,
		)}
	>
		<div className="w-full max-w-2xl space-y-3 text-center">
			{accentIcon && (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					initial={{ opacity: 0, y: 6 }}
					transition={{ duration: 0.18 }}
				>
					{accentIcon}
				</motion.div>
			)}
			<motion.h3
				animate={{ opacity: 1, y: 0 }}
				className="font-medium text-sm"
				initial={{ opacity: 0, y: 6 }}
				transition={{ duration: 0.18, delay: 0.02 }}
			>
				{title}
			</motion.h3>
			<motion.p
				animate={{ opacity: 1, y: 0 }}
				className="text-muted-foreground text-sm"
				initial={{ opacity: 0, y: 6 }}
				transition={{ duration: 0.18, delay: 0.04 }}
			>
				{description}
			</motion.p>
		</div>

		<AnimatePresence initial={false}>
			{showSuggestions && suggestions.length > 0 && (
				<motion.div
					key="hero-suggestions"
					animate={{ opacity: 1, y: 0 }}
					className="flex w-full flex-wrap justify-center gap-2 sm:gap-3"
					exit={{ opacity: 0, y: -8 }}
					initial={{ opacity: 0, y: 8 }}
					transition={{ duration: 0.18 }}
				>
					{suggestions.map((item, index) => {
						const Icon = item.icon

						return (
							<motion.div
								key={item.id}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -6 }}
								initial={{ opacity: 0, y: 8 }}
								transition={{ delay: index * 0.03, duration: 0.16 }}
							>
								<Suggestion
									className="h-auto max-w-[32rem] whitespace-normal rounded-2xl border-border/70 px-4 py-3 text-left text-xs leading-relaxed sm:text-sm"
									onClick={onSuggestion}
									suggestion={item.label}
								>
									<span className="flex items-start gap-2.5">
										<span className="mt-0.5 rounded-md bg-muted p-1 text-muted-foreground">
											<Icon className="size-3.5" />
										</span>
										<span>{item.label}</span>
									</span>
								</Suggestion>
							</motion.div>
						)
					})}
				</motion.div>
			)}
		</AnimatePresence>

		<AnimatePresence initial={false}>
			{showComposer && (
				<motion.div
					key="hero-composer"
					className="w-full"
					layoutId={composerLayoutId}
					transition={composerTransition}
				>
					{composer}
				</motion.div>
			)}
		</AnimatePresence>
	</div>
)
