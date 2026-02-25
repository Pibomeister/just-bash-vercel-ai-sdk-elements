'use client'

import {
	CodeBlock,
	CodeBlockActions,
	CodeBlockCopyButton,
	CodeBlockFilename,
	CodeBlockHeader,
	CodeBlockTitle,
} from '@/components/ai-elements/code-block'
import { detectLanguage } from '@/lib/file-types'

export function CodeRendererDialog({
	content,
	filepath,
}: {
	content: string
	filepath: string
}) {
	const language = detectLanguage(filepath)
	const filename = filepath.split('/').pop() ?? filepath

	return (
		<CodeBlock code={content} language={language} showLineNumbers>
			<CodeBlockHeader>
				<CodeBlockTitle>
					<CodeBlockFilename>{filename}</CodeBlockFilename>
				</CodeBlockTitle>
				<CodeBlockActions>
					<CodeBlockCopyButton />
				</CodeBlockActions>
			</CodeBlockHeader>
		</CodeBlock>
	)
}
