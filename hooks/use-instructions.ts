'use client'

import { useCallback, useMemo, useState } from 'react'
import type { Instruction } from '@/components/ui/ai-instructions'

const DEFAULT_INSTRUCTIONS: Instruction[] = [
	{
		id: 'concise',
		title: 'Be Concise',
		description: 'Keep responses short and to the point',
		content:
			'Provide brief, focused responses. Avoid unnecessary elaboration unless specifically requested. Get to the point quickly.',
	},
	{
		id: 'code-examples',
		title: 'Show Code Examples',
		description: 'Include relevant code snippets when explaining',
		content:
			'When explaining technical concepts, always include working code examples that demonstrate the concept. Use appropriate syntax highlighting.',
	},
	{
		id: 'step-by-step',
		title: 'Explain Step by Step',
		description: 'Walk through your reasoning process',
		content:
			'Before providing a solution, explain the reasoning behind your approach. Break down complex problems into smaller, understandable steps.',
	},
	{
		id: 'bash-focus',
		title: 'Use Bash Commands',
		description: 'Prefer using bash tools to explore and modify files',
		content:
			'When asked about files or the project, use the available bash tools to explore the filesystem, read files, and demonstrate answers with real command output.',
	},
]

export function useInstructionsState() {
	const [instructions, setInstructions] =
		useState<Instruction[]>(DEFAULT_INSTRUCTIONS)
	const [activeIds, setActiveIds] = useState<string[]>([])

	const getActiveInstructionText = useCallback((): string => {
		if (activeIds.length === 0) return ''

		const active = instructions.filter((i) => activeIds.includes(i.id))
		if (active.length === 0) return ''

		return active
			.filter((i) => i.content)
			.map((i) => `- ${i.title}: ${i.content}`)
			.join('\n')
	}, [instructions, activeIds])

	return useMemo(
		() => ({
			instructions,
			setInstructions,
			activeIds,
			setActiveIds,
			getActiveInstructionText,
		}),
		[instructions, activeIds, getActiveInstructionText],
	)
}
