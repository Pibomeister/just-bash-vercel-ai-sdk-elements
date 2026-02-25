'use client'

import {
	CodeBlock,
	CodeBlockContent,
} from '@/components/ai-elements/code-block'
import type { FileCategory } from '@/lib/file-types'
import { CodeRendererDialog } from './renderers/code-renderer'
import { DocxRenderer } from './renderers/docx-renderer'
import { ImageRenderer } from './renderers/image-renderer'
import { MarkdownRendererDialog } from './renderers/markdown-renderer'
import { PDFRenderer } from './renderers/pdf-renderer'
import { SpreadsheetRenderer } from './renderers/spreadsheet-renderer'

export function RendererSwitch({
	content,
	filepath,
	category,
	compact,
	onExpand,
}: {
	content: string
	filepath: string
	category: FileCategory
	compact?: boolean
	onExpand?: () => void
}) {
	switch (category) {
		case 'code':
			return <CodeRendererDialog content={content} filepath={filepath} />
		case 'markdown':
			return (
				<MarkdownRendererDialog
					content={content}
					filepath={filepath}
					onExpand={onExpand}
				/>
			)
		case 'image':
			return (
				<ImageRenderer
					content={content}
					filepath={filepath}
					compact={compact}
				/>
			)
		case 'pdf':
			return <PDFRenderer content={content} filepath={filepath} />
		case 'docx':
			return <DocxRenderer content={content} filepath={filepath} />
		case 'spreadsheet':
			return (
				<SpreadsheetRenderer
					content={content}
					filepath={filepath}
					compact={compact}
				/>
			)
		case 'unknown':
			return (
				<CodeBlock code={content} language="shellscript">
					<CodeBlockContent code={content} language="shellscript" />
				</CodeBlock>
			)
	}
}
