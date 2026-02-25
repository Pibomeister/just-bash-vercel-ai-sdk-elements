'use client'

import { cjk } from '@streamdown/cjk'
import { code } from '@streamdown/code'
import { math } from '@streamdown/math'
import { mermaid } from '@streamdown/mermaid'
import { CheckIcon, CopyIcon, Maximize2Icon } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Streamdown } from 'streamdown'
import {
	CodeBlockActions,
	CodeBlockContainer,
	CodeBlockFilename,
	CodeBlockHeader,
	CodeBlockTitle,
} from '@/components/ai-elements/code-block'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const streamdownPlugins = { cjk, code, math, mermaid }

function CopyButton({ text }: { text: string }) {
	const [isCopied, setIsCopied] = useState(false)
	const timeoutRef = useRef<number>(0)

	const copy = useCallback(async () => {
		if (isCopied) return
		await navigator.clipboard.writeText(text)
		setIsCopied(true)
		timeoutRef.current = window.setTimeout(() => setIsCopied(false), 2000)
	}, [text, isCopied])

	const Icon = isCopied ? CheckIcon : CopyIcon

	return (
		<Button className="shrink-0" onClick={copy} size="icon" variant="ghost">
			<Icon size={14} />
		</Button>
	)
}

export function MarkdownRendererDialog({
	content,
	filepath,
	onExpand,
}: {
	content: string
	filepath: string
	onExpand?: () => void
}) {
	const filename = filepath.split('/').pop() ?? filepath

	return (
		<CodeBlockContainer language="markdown">
			<CodeBlockHeader>
				<CodeBlockTitle>
					<CodeBlockFilename>{filename}</CodeBlockFilename>
				</CodeBlockTitle>
				<CodeBlockActions>
					<CopyButton text={content} />
					{onExpand && (
						<Button
							className="shrink-0"
							onClick={onExpand}
							size="icon"
							variant="ghost"
						>
							<Maximize2Icon size={14} />
						</Button>
					)}
				</CodeBlockActions>
			</CodeBlockHeader>
			<div className={cn('px-8 py-6 text-sm')}>
				<Streamdown
					className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
					plugins={streamdownPlugins}
				>
					{content}
				</Streamdown>
			</div>
		</CodeBlockContainer>
	)
}
