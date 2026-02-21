'use client'

import { useChat } from '@ai-sdk/react'
import type { FileUIPart, UIMessage } from 'ai'
import { DefaultChatTransport } from 'ai'
import {
	Brain as BrainIcon,
	Globe2 as GlobeIcon,
	Lightbulb as LightbulbIcon,
	Maximize2 as Maximize2Icon,
	Paintbrush as PaintbrushIcon,
	Paperclip as PaperclipIcon,
	Telescope as TelescopeIcon,
} from 'lucide-react'
import { LayoutGroup, motion } from 'motion/react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BundledLanguage } from 'shiki'
import {
	buildSourceMap,
	CitedMessageResponse,
	type EnrichedCitationSource,
	enrichSourceMap,
	SourcesBar,
} from '@/components/ai-elements/citation-renderer'
import { CodeBlock } from '@/components/ai-elements/code-block'
import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import {
	DocumentViewer,
	DocumentViewerProvider,
	RendererSwitch,
	useDocumentViewer,
} from '@/components/ai-elements/document-viewer'
import {
	EmptyChatHero,
	type EmptyHeroSuggestion,
} from '@/components/ai-elements/empty-chat-hero'
import {
	FileTree,
	FileTreeFile,
	FileTreeFolder,
} from '@/components/ai-elements/file-tree'
import { FollowUpSuggestions } from '@/components/ai-elements/follow-up-suggestions'
import { MemoryBadge } from '@/components/ai-elements/memory-badge'
import { MemoryInspector } from '@/components/ai-elements/memory-inspector'
import { Message, MessageContent } from '@/components/ai-elements/message'
import {
	PromptBoxAttachmentTray,
	PromptBoxContextProvider,
	PromptBoxFileCard,
	PromptBoxImageDialog,
	PromptBoxNeonDivider,
	PromptBoxPasteHandler,
	PromptBoxSendButton,
	PromptBoxToolsPopover,
	PromptBoxToolToggle,
	PromptBoxVoiceRecorder,
} from '@/components/ai-elements/prompt-box'
import {
	PromptInput,
	PromptInputActionAddAttachments,
	PromptInputActionMenu,
	PromptInputActionMenuContent,
	PromptInputActionMenuTrigger,
	PromptInputFooter,
	PromptInputHeader,
	PromptInputProvider,
	PromptInputTextarea,
	PromptInputTools,
	usePromptInputAttachments,
	usePromptInputController,
} from '@/components/ai-elements/prompt-input'
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from '@/components/ai-elements/reasoning'
import { SearchResultCards } from '@/components/ai-elements/search-result-cards'
import { Shimmer } from '@/components/ai-elements/shimmer'
import { Source } from '@/components/ai-elements/sources'
import { Terminal } from '@/components/ai-elements/terminal'
import {
	Tool,
	ToolContent,
	ToolHeader,
	ToolInput,
	ToolOutput,
} from '@/components/ai-elements/tool'
import {
	Instructions,
	InstructionsContent,
	InstructionsCreateDialog,
	InstructionsCreateTrigger,
	InstructionsEmpty,
	InstructionsFooter,
	InstructionsGroup,
	InstructionsItem,
	InstructionsList,
	InstructionsSearch,
	InstructionsTrigger,
} from '@/components/ui/ai-instructions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { UploadDialog } from '@/components/upload-dialog'
import { DocumentsProvider, useDocuments } from '@/hooks/use-documents'
import { useFollowUpSuggestions } from '@/hooks/use-follow-up-suggestions'
import { useInstructionsState } from '@/hooks/use-instructions'
import { useThread } from '@/hooks/use-thread'
import { useUploadDialogTrigger } from '@/hooks/use-upload-dialog-trigger'
import type { FileCategory } from '@/lib/file-types'
import { detectFileCategory, detectLanguage } from '@/lib/file-types'
import {
	type FileTreeNode,
	isFileListingCommand,
	parseFileTreeOutput,
} from '@/lib/parse-file-tree'

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

const suggestions: EmptyHeroSuggestion[] = [
	{
		id: 'list-project-files',
		label: 'List all files in the project',
		icon: TelescopeIcon,
	},
	{
		id: 'read-package-json',
		label: 'Read the package.json file',
		icon: GlobeIcon,
	},
	{
		id: 'show-utility-functions',
		label: 'Show me the utility functions in src/utils.ts',
		icon: LightbulbIcon,
	},
	{
		id: 'create-hello-file',
		label: 'Create a new hello.ts file',
		icon: PaintbrushIcon,
	},
]

const composerTransition = {
	duration: 0.24,
	ease: [0.22, 1, 0.36, 1] as const,
}

// ---------------------------------------------------------------------------
// File Tree Renderer
// ---------------------------------------------------------------------------

function RenderFileTreeNodes({ nodes }: { nodes: FileTreeNode[] }) {
	return (
		<>
			{nodes.map((node) =>
				node.type === 'folder' ? (
					<FileTreeFolder key={node.path} path={node.path} name={node.name}>
						{node.children && node.children.length > 0 && (
							<RenderFileTreeNodes nodes={node.children} />
						)}
					</FileTreeFolder>
				) : (
					<FileTreeFile key={node.path} path={node.path} name={node.name} />
				),
			)}
		</>
	)
}

// ---------------------------------------------------------------------------
// FileTree with document viewer integration (AC8)
// ---------------------------------------------------------------------------

/** Collect all folder paths so the tree renders fully expanded. */
function collectFolderPaths(nodes: FileTreeNode[]): Set<string> {
	const paths = new Set<string>()
	for (const node of nodes) {
		if (node.type === 'folder') {
			paths.add(node.path)
			if (node.children) {
				for (const p of collectFolderPaths(node.children)) {
					paths.add(p)
				}
			}
		}
	}
	return paths
}

function FileTreeWithViewer({ nodes }: { nodes: FileTreeNode[] }) {
	const { open, openLoading, close } = useDocumentViewer()

	const allFolderPaths = useMemo(() => collectFolderPaths(nodes), [nodes])

	const handleSelect = useCallback(
		(path: string) => {
			openLoading(path)
			fetch('/api/read-file', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ path }),
			})
				.then(async (res) => {
					if (!res.ok) {
						close()
						return
					}
					const { content } = (await res.json()) as { content: string }
					open(path, content)
				})
				.catch(() => {
					close()
				})
		},
		[open, openLoading, close],
	)

	return (
		<FileTree defaultExpanded={allFolderPaths} onSelect={handleSelect}>
			<RenderFileTreeNodes nodes={nodes} />
		</FileTree>
	)
}

// ---------------------------------------------------------------------------
// ReadFile Preview with expand button
// ---------------------------------------------------------------------------

function ReadFilePreview({
	content,
	filepath,
	language,
	category,
}: {
	content: string
	filepath: string
	language: BundledLanguage
	category: FileCategory
}) {
	const { open } = useDocumentViewer()

	const handleExpand = useCallback(
		() => open(filepath, content),
		[open, filepath, content],
	)

	if (category === 'code') {
		return (
			<div className="group relative">
				<CodeBlock code={content} language={language} />
				<Button
					variant="ghost"
					size="icon"
					className="absolute top-2 right-2 size-7 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
					onClick={handleExpand}
				>
					<Maximize2Icon className="size-3.5" />
					<span className="sr-only">Expand</span>
				</Button>
			</div>
		)
	}

	return (
		<RendererSwitch
			content={content}
			filepath={filepath}
			category={category}
			compact
			onExpand={handleExpand}
		/>
	)
}

// ---------------------------------------------------------------------------
// Message Parts Renderer
// ---------------------------------------------------------------------------

const MessagePartsRenderer = memo(function MessagePartsRenderer({
	message,
	sources,
}: {
	message: UIMessage
	sources: Map<number, EnrichedCitationSource>
}) {
	return (
		<>
			{message.parts.map((part, index) => {
				const key = `${message.id}-${index}`

				switch (part.type) {
					case 'text':
						if (!part.text) return null
						return (
							<CitedMessageResponse
								key={key}
								text={part.text}
								sources={sources}
							/>
						)

					case 'reasoning':
						return (
							<Reasoning key={key} isStreaming={part.state === 'streaming'}>
								<ReasoningTrigger />
								<ReasoningContent>{part.text}</ReasoningContent>
							</Reasoning>
						)

					case 'source-url':
						return (
							<Source
								key={key}
								href={part.url}
								title={part.title ?? part.url}
							/>
						)

					case 'step-start':
						return null

					default: {
						// AI SDK v6 emits tool parts as "tool-{toolName}" (e.g. "tool-bash", "tool-readFile")
						if (!part.type.startsWith('tool-')) return null

						const toolPart = part as unknown as {
							type: string
							state: string
							input?: unknown
							output?: unknown
							errorText?: string
						}
						const toolName = part.type.slice(5) // "tool-bash" → "bash"
						const { state, input, output, errorText } = toolPart
						const isRunning =
							state !== 'output-available' &&
							state !== 'output-error' &&
							state !== 'output-denied'

						if (toolName === 'bash') {
							const result = output as
								| { stdout?: string; stderr?: string }
								| undefined
							const stdout = result?.stdout ?? ''
							const stderr = result?.stderr ?? ''
							const terminalOutput = stderr ? `${stdout}\n${stderr}` : stdout
							const command =
								(input as { command?: string } | undefined)?.command ?? ''

							// Determine if this is a file-listing command for tree rendering
							const showAsTree =
								state === 'output-available' &&
								isFileListingCommand(command) &&
								stdout.trim().length > 0

							let treeNodes: FileTreeNode[] = []
							if (showAsTree) {
								treeNodes = parseFileTreeOutput(stdout, command)
							}

							return (
								<Tool key={key} defaultOpen>
									<ToolHeader
										type={part.type as 'tool-bash'}
										state={state as 'output-available'}
										title="bash"
									/>
									<ToolContent>
										<ToolInput input={input} />
										{isRunning && (
											<Shimmer className="text-muted-foreground text-xs">
												Running command...
											</Shimmer>
										)}
										{state === 'output-available' &&
											(showAsTree && treeNodes.length > 0 ? (
												<FileTreeWithViewer nodes={treeNodes} />
											) : (
												<Terminal output={terminalOutput} />
											))}
										{(state === 'output-error' ||
											state === 'output-denied') && (
											<Badge variant="destructive" className="gap-1.5">
												{errorText ?? 'Command failed'}
											</Badge>
										)}
									</ToolContent>
								</Tool>
							)
						}

						if (toolName === 'readFile') {
							const args = input as { path?: string } | undefined
							const filepath = args?.path ?? 'file'
							const language = detectLanguage(filepath)
							const category = detectFileCategory(filepath)
							const fileContent =
								state === 'output-available'
									? typeof output === 'string'
										? output
										: (output as { content?: string } | null)?.content
									: undefined

							return (
								<Tool key={key} defaultOpen>
									<ToolHeader
										type={part.type as 'tool-readFile'}
										state={state as 'output-available'}
										title={`readFile: ${filepath}`}
									/>
									<ToolContent>
										<ToolInput input={input} />
										{isRunning && (
											<Shimmer className="text-muted-foreground text-xs">
												Reading file...
											</Shimmer>
										)}
										{fileContent && (
											<ReadFilePreview
												content={fileContent}
												filepath={filepath}
												language={language}
												category={category}
											/>
										)}
										{(state === 'output-error' ||
											state === 'output-denied') && (
											<Badge variant="destructive" className="gap-1.5">
												{errorText ?? 'Failed to read file'}
											</Badge>
										)}
									</ToolContent>
								</Tool>
							)
						}

						if (toolName === 'writeFile') {
							const args = input as { path?: string } | undefined
							const filepath = args?.path ?? 'file'

							return (
								<Tool key={key} defaultOpen>
									<ToolHeader
										type={part.type as 'tool-writeFile'}
										state={state as 'output-available'}
										title={`writeFile: ${filepath}`}
									/>
									<ToolContent>
										<ToolInput input={input} />
										{isRunning && (
											<Shimmer className="text-muted-foreground text-xs">
												Writing file...
											</Shimmer>
										)}
										{state === 'output-available' && (
											<Badge variant="secondary" className="gap-1.5">
												File written successfully
											</Badge>
										)}
										{(state === 'output-error' ||
											state === 'output-denied') && (
											<Badge variant="destructive" className="gap-1.5">
												{errorText ?? 'Failed to write file'}
											</Badge>
										)}
									</ToolContent>
								</Tool>
							)
						}

						if (toolName === 'searchDocuments') {
							return (
								<Tool key={key} defaultOpen>
									<ToolHeader
										type={part.type as 'tool-searchDocuments'}
										state={state as 'output-available'}
										title="searchDocuments"
									/>
									<ToolContent>
										<ToolInput input={input} />
										{isRunning && (
											<Shimmer className="text-muted-foreground text-xs">
												Searching documents...
											</Shimmer>
										)}
										{state === 'output-available' && (
											<SearchResultCards output={output} />
										)}
										{(state === 'output-error' ||
											state === 'output-denied') && (
											<Badge variant="destructive" className="gap-1.5">
												{errorText ?? 'Search failed'}
											</Badge>
										)}
									</ToolContent>
								</Tool>
							)
						}

						// Fallback for unknown tools
						return (
							<Tool key={key} defaultOpen>
								<ToolHeader
									type={part.type as 'tool-bash'}
									state={state as 'output-available'}
									title={toolName}
								/>
								<ToolContent>
									<ToolInput input={input} />
									{isRunning && (
										<Shimmer className="text-muted-foreground text-xs">
											Processing...
										</Shimmer>
									)}
									{state === 'output-available' && (
										<ToolOutput output={output} errorText={errorText} />
									)}
								</ToolContent>
							</Tool>
						)
					}
				}
			})}
		</>
	)
})

// ---------------------------------------------------------------------------
// Attachment Tray (reads from PromptInputProvider context)
// ---------------------------------------------------------------------------

function AttachmentTrayView() {
	const attachments = usePromptInputAttachments()
	if (attachments.files.length === 0) return null
	return (
		<PromptBoxAttachmentTray>
			{attachments.files.map((file) => (
				<PromptBoxFileCard
					key={file.id}
					url={file.url}
					filename={file.filename ?? 'Untitled'}
					mediaType={file.mediaType}
					onRemove={() => attachments.remove(file.id)}
				/>
			))}
		</PromptBoxAttachmentTray>
	)
}

// ---------------------------------------------------------------------------
// Dynamic Tool Pill (popover-only tools: create-image, deep-research)
// ---------------------------------------------------------------------------

function DynamicToolPill() {
	const { activeTool } = usePromptInputController()

	return (
		<>
			<div
				className={`overflow-hidden transition-all duration-200 ${
					activeTool.value === 'create-image' ? 'max-w-40' : 'max-w-0'
				}`}
			>
				<PromptBoxToolToggle
					tool="create-image"
					icon={PaintbrushIcon}
					label="Create image"
					activeColor="purple"
				/>
			</div>
			<div
				className={`overflow-hidden transition-all duration-200 ${
					activeTool.value === 'deep-research' ? 'max-w-40' : 'max-w-0'
				}`}
			>
				<PromptBoxToolToggle
					tool="deep-research"
					icon={TelescopeIcon}
					label="Deep research"
					activeColor="cyan"
				/>
			</div>
		</>
	)
}

// ---------------------------------------------------------------------------
// Assistant Message (with citation support)
// ---------------------------------------------------------------------------

function AssistantMessage({
	message,
	isLastAssistantMessage,
	memoryActive,
	chatReady,
	onMemoryBadgeClick,
}: {
	message: UIMessage
	isLastAssistantMessage: boolean
	memoryActive: boolean
	chatReady: boolean
	onMemoryBadgeClick?: () => void
}) {
	const { documents } = useDocuments()

	const sources = useMemo(() => {
		if (message.role === 'user')
			return new Map<number, EnrichedCitationSource>()
		const raw = buildSourceMap(message)
		return enrichSourceMap(raw, documents)
	}, [message, documents])

	// P1-3: Show the memory badge on the last assistant message when memory is
	// active (threadId present) and the stream has finished ('ready' status).
	// Nothing in the backend currently sets metadata.memoryUpdated, so we use
	// this simpler heuristic instead of StreamData wiring.
	const hasMemoryUpdate =
		message.role === 'assistant' &&
		memoryActive &&
		isLastAssistantMessage &&
		chatReady

	if (message.role === 'user') {
		return (
			<Message from="user">
				<MessageContent>
					{message.parts
						.filter((p) => p.type === 'text' && p.text)
						.map((p, i) => (
							<span key={`${message.id}-user-${i}`}>
								{p.type === 'text' ? p.text : null}
							</span>
						))}
				</MessageContent>
			</Message>
		)
	}

	return (
		<Message from="assistant">
			<MessageContent>
				<MessagePartsRenderer message={message} sources={sources} />
				{sources.size > 0 && <SourcesBar sources={sources} />}
				{hasMemoryUpdate && <MemoryBadge onClick={onMemoryBadgeClick} />}
			</MessageContent>
		</Message>
	)
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ChatPage() {
	const [uploadOpen, setUploadOpen] = useState(false)
	const [memoryInspectorOpen, setMemoryInspectorOpen] = useState(false)
	const { setOpenHandler } = useUploadDialogTrigger()
	const { threadId, resourceId } = useThread()
	const {
		instructions,
		setInstructions,
		activeIds,
		setActiveIds,
		getActiveInstructionText,
	} = useInstructionsState()

	// Store getter in a ref so the transport closure always reads current instructions
	const instructionsRef = useRef(getActiveInstructionText)
	useEffect(() => {
		instructionsRef.current = getActiveInstructionText
	}, [getActiveInstructionText])

	// Store thread refs so the transport closure always reads current values
	const threadIdRef = useRef(threadId)
	const resourceIdRef = useRef(resourceId)
	useEffect(() => {
		threadIdRef.current = threadId
	}, [threadId])
	useEffect(() => {
		resourceIdRef.current = resourceId
	}, [resourceId])

	// Body callback that safely reads from refs outside of render phase
	const bodyCallback = useCallback(() => {
		const text = instructionsRef.current?.() ?? undefined
		const tid = threadIdRef.current
		const rid = resourceIdRef.current
		const base = text ? { instructions: text } : {}
		return tid && rid ? { ...base, threadId: tid, resourceId: rid } : base
	}, [])

	// Refs are only read from the callback which executes after render, not during render.
	// Disable ESLint rule as this is a safe pattern for memoizing transport configuration.
	/* eslint-disable react-hooks/refs */
	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: '/api/chat',
				body: bodyCallback,
			}),
		[bodyCallback],
	)
	/* eslint-enable react-hooks/refs */

	const { messages, sendMessage, status, stop, setMessages } = useChat({
		transport,
	})

	// P1-4: Guard against React Strict Mode double-invocation and stale closure
	// on `messages`.  The ref ensures the effect body runs exactly once even
	// when React mounts/unmounts the component twice in development.
	const hasHydratedRef = useRef(false)

	// Hydrate message history on mount when threadId/resourceId are available
	useEffect(() => {
		// Guard: skip if already hydrated (prevents Strict Mode double-fire)
		if (hasHydratedRef.current) return
		if (!threadIdRef.current || !resourceIdRef.current) return

		hasHydratedRef.current = true

		const controller = new AbortController()

		fetch(
			`/api/chat?threadId=${encodeURIComponent(threadIdRef.current)}&resourceId=${encodeURIComponent(resourceIdRef.current)}`,
			{ signal: controller.signal },
		)
			.then(async (res) => {
				if (!res.ok) return
				const data = await res.json()
				if (!Array.isArray(data) || data.length === 0) return

				// Convert stored messages to UIMessage shape for setMessages.
				// MastraDBMessage.content.parts matches UIMessage.parts format.
				const uiMessages = (
					data as Array<{
						id: string
						role: string
						content: {
							parts: Array<{ type: string; text?: string }>
							format: 2
						}
						createdAt: string
					}>
				).map((m) => ({
					id: m.id,
					role: m.role as UIMessage['role'],
					parts: m.content.parts as UIMessage['parts'],
					createdAt: new Date(m.createdAt),
				}))

				// Functional update avoids the stale closure on `messages` and
				// only populates if no conversation has started yet.
				setMessages((prev) =>
					prev.length === 0 ? (uiMessages as UIMessage[]) : prev,
				)
			})
			.catch((err: unknown) => {
				if ((err as Error).name !== 'AbortError') {
					console.error('[hydration] failed:', err)
				}
			})

		return () => controller.abort()
		// setMessages is a stable reference from useChat; threadIdRef /
		// resourceIdRef are refs so they don't need to be in deps.
	}, [setMessages])

	const {
		suggestions: followUpSuggestions,
		isLoading: followUpLoading,
		clear: clearFollowUps,
	} = useFollowUpSuggestions(messages, status)

	const isEmpty = messages.length === 0
	const [hasSubmitted, setHasSubmitted] = useState(false)
	const composerLayoutId = 'main-chat-composer'
	const showBottomComposer = !isEmpty || hasSubmitted

	const handleFollowUp = useCallback(
		(suggestion: string) => {
			clearFollowUps()
			setHasSubmitted(true)
			sendMessage({ text: suggestion })
		},
		[clearFollowUps, sendMessage],
	)

	const handleSuggestion = useCallback(
		(suggestion: string) => {
			setHasSubmitted(true)
			sendMessage({ text: suggestion })
		},
		[sendMessage],
	)

	const handleSubmit = useCallback(
		(message: { text: string; files: FileUIPart[] }) => {
			setHasSubmitted(true)
			sendMessage({
				text: message.text,
				...(message.files.length > 0 ? { files: message.files } : {}),
			})
		},
		[sendMessage],
	)

	useEffect(() => {
		// Store a callback in context state (not a state-updater function).
		setOpenHandler(() => () => setUploadOpen(true))
		return () => setOpenHandler(null)
	}, [setOpenHandler])

	const renderPromptComposer = () => (
		<TooltipProvider>
			<Instructions
				instructions={instructions}
				onInstructionsChange={setInstructions}
				value={activeIds}
				onValueChange={setActiveIds}
			>
				<PromptInputProvider>
					<PromptBoxContextProvider>
						<PromptInput onSubmit={handleSubmit}>
							<PromptInputHeader>
								<AttachmentTrayView />
							</PromptInputHeader>

							<PromptBoxVoiceRecorder />
							<PromptBoxPasteHandler>
								<PromptInputTextarea placeholder="Ask me to explore the sandbox..." />
							</PromptBoxPasteHandler>

							<PromptInputFooter>
								<PromptInputTools>
									<PromptInputActionMenu>
										<PromptInputActionMenuTrigger tooltip="Attach">
											<PaperclipIcon className="size-4" />
										</PromptInputActionMenuTrigger>
										<PromptInputActionMenuContent>
											<PromptInputActionAddAttachments />
										</PromptInputActionMenuContent>
									</PromptInputActionMenu>

									<PromptBoxToolsPopover />

									<PromptBoxNeonDivider color="purple" />
									<PromptBoxToolToggle
										tool="search"
										icon={GlobeIcon}
										label="Search"
										activeColor="cyan"
									/>
									<PromptBoxNeonDivider color="amber" />
									<PromptBoxToolToggle
										tool="think"
										icon={LightbulbIcon}
										label="Think"
										activeColor="amber"
									/>

									<DynamicToolPill />

									<InstructionsTrigger />
								</PromptInputTools>
								<Button
									variant="ghost"
									size="icon"
									className="size-8 shrink-0"
									onClick={() => setMemoryInspectorOpen(true)}
									title="Open Memory Inspector"
								>
									<BrainIcon className="size-4" />
									<span className="sr-only">Memory</span>
								</Button>
								<PromptBoxSendButton status={status} onStop={stop} />
							</PromptInputFooter>
						</PromptInput>

						<PromptBoxImageDialog />
					</PromptBoxContextProvider>
				</PromptInputProvider>
				<InstructionsContent>
					<InstructionsSearch />
					<InstructionsList>
						<InstructionsEmpty />
						<InstructionsGroup heading="Available Instructions">
							{instructions.map((instruction) => (
								<InstructionsItem
									key={instruction.id}
									instruction={instruction}
								/>
							))}
						</InstructionsGroup>
					</InstructionsList>
					<InstructionsFooter>
						<InstructionsCreateTrigger />
					</InstructionsFooter>
				</InstructionsContent>
				<InstructionsCreateDialog />
			</Instructions>
		</TooltipProvider>
	)

	return (
		<DocumentsProvider>
			<DocumentViewerProvider>
				<div className="flex min-h-dvh flex-col bg-background text-foreground">
					<LayoutGroup id="main-chat-composer-layout">
						<Conversation>
							<ConversationContent className="mx-auto w-full max-w-3xl">
								{isEmpty ? (
									<ConversationEmptyState className="justify-start gap-0 p-0 pt-8 sm:pt-12">
										<EmptyChatHero
											composer={renderPromptComposer()}
											composerLayoutId={composerLayoutId}
											description="Explore a sandboxed filesystem with an AI assistant. Try running commands, reading files, or creating new ones."
											onSuggestion={handleSuggestion}
											showComposer={!hasSubmitted}
											showSuggestions={!hasSubmitted}
											suggestions={suggestions}
											title="AI Bash Agent"
										/>
									</ConversationEmptyState>
								) : (
									messages.map((message, idx) => (
										<AssistantMessage
											key={message.id}
											message={message}
											isLastAssistantMessage={idx === messages.length - 1}
											memoryActive={Boolean(threadId)}
											chatReady={status === 'ready'}
											onMemoryBadgeClick={() => setMemoryInspectorOpen(true)}
										/>
									))
								)}
							</ConversationContent>
							<ConversationScrollButton />
						</Conversation>

						{!isEmpty && (
							<div className="mx-auto w-full max-w-3xl px-4 pt-2">
								<FollowUpSuggestions
									suggestions={followUpSuggestions}
									isLoading={followUpLoading}
									onSelect={handleFollowUp}
								/>
							</div>
						)}

						{showBottomComposer && (
							<div className="mx-auto mt-4 w-full max-w-3xl px-4 pb-4">
								<motion.div
									layoutId={composerLayoutId}
									transition={composerTransition}
								>
									{renderPromptComposer()}
								</motion.div>
							</div>
						)}
					</LayoutGroup>
				</div>
				<DocumentViewer />
				<UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
				<MemoryInspector
					open={memoryInspectorOpen}
					onOpenChange={setMemoryInspectorOpen}
					threadId={threadId}
					resourceId={resourceId}
				/>
			</DocumentViewerProvider>
		</DocumentsProvider>
	)
}
