'use client'

import { useChat } from '@ai-sdk/react'
import type { FileUIPart, UIMessage } from 'ai'
import { DefaultChatTransport } from 'ai'
import {
	PanelRightClose as PanelCloseIcon,
	PanelRightOpen as PanelOpenIcon,
	Paperclip as PaperclipIcon,
	Search as SearchIcon,
	Settings2 as SettingsIcon,
} from 'lucide-react'
import { LayoutGroup, motion } from 'motion/react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	buildSourceMap,
	CitedMessageResponse,
	type EnrichedCitationSource,
	enrichSourceMap,
	SourcesBar,
} from '@/components/ai-elements/citation-renderer'
import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import {
	DocumentViewer,
	DocumentViewerProvider,
} from '@/components/ai-elements/document-viewer'
import {
	EmptyChatHero,
	type EmptyHeroSuggestion,
} from '@/components/ai-elements/empty-chat-hero'
import { FollowUpSuggestions } from '@/components/ai-elements/follow-up-suggestions'
import { Message, MessageContent } from '@/components/ai-elements/message'
import {
	PromptBoxAttachmentTray,
	PromptBoxContextProvider,
	PromptBoxFileCard,
	PromptBoxImageDialog,
	PromptBoxPasteHandler,
	PromptBoxSendButton,
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
} from '@/components/ai-elements/prompt-input'
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from '@/components/ai-elements/reasoning'
import { SearchResultCards } from '@/components/ai-elements/search-result-cards'
import { Shimmer } from '@/components/ai-elements/shimmer'
import { Source } from '@/components/ai-elements/sources'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { DocumentsProvider, useDocuments } from '@/hooks/use-documents'
import { useFollowUpSuggestions } from '@/hooks/use-follow-up-suggestions'
import { useInstructionsState } from '@/hooks/use-instructions'
import { DEFAULT_MODEL_ID, MODELS } from '@/lib/rag-playground-models'

// ---------------------------------------------------------------------------
// Suggestions (search-oriented)
// ---------------------------------------------------------------------------

const suggestions: EmptyHeroSuggestion[] = [
	{
		id: 'termination-penalties',
		label: 'Find all clauses related to termination penalties',
		icon: SearchIcon,
	},
	{
		id: 'payment-obligations',
		label: 'What are the payment obligations mentioned across documents?',
		icon: SettingsIcon,
	},
	{
		id: 'force-majeure',
		label: 'Search for references to force majeure',
		icon: PanelOpenIcon,
	},
	{
		id: 'confidential-information',
		label: 'Find definitions of confidential information',
		icon: PanelCloseIcon,
	},
]

const composerTransition = {
	duration: 0.24,
	ease: [0.22, 1, 0.36, 1] as const,
}

const modelCapabilityBadgeClass =
	'h-4 border-border/70 bg-muted px-1 text-[9px] text-foreground'

// ---------------------------------------------------------------------------
// Message Parts Renderer (search-focused)
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
						if (!part.type.startsWith('tool-')) return null

						const toolPart = part as unknown as {
							type: string
							state: string
							input?: unknown
							output?: unknown
							errorText?: string
						}
						const toolName = part.type.slice(5)
						const { state, input, output, errorText } = toolPart
						const isRunning =
							state !== 'output-available' &&
							state !== 'output-error' &&
							state !== 'output-denied'

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
// Attachment Tray (from PromptInputProvider context)
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
// Settings Panel
// ---------------------------------------------------------------------------

function SettingsPanel({
	alpha,
	setAlpha,
	topK,
	setTopK,
	rerankTopN,
	setRerankTopN,
}: {
	alpha: number
	setAlpha: (v: number) => void
	topK: number
	setTopK: (v: number) => void
	rerankTopN: number
	setRerankTopN: (v: number) => void
}) {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
				<SettingsIcon className="size-3.5" />
				Retrieval Parameters
			</div>

			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<Label className="text-xs text-muted-foreground">
						Alpha
						<span className="ml-1 text-[10px] opacity-60">
							(dense vs sparse)
						</span>
					</Label>
					<Badge
						variant="outline"
						className="font-mono text-[10px] tabular-nums"
					>
						{alpha.toFixed(2)}
					</Badge>
				</div>
				<Slider
					id="alpha"
					aria-label="Alpha — dense vs sparse blend"
					value={[alpha * 100]}
					onValueChange={([v]) => setAlpha(v / 100)}
					min={0}
					max={100}
					step={1}
				/>
				<p className="text-[10px] leading-snug text-muted-foreground/60">
					0 = sparse (BM25 keyword), 1 = dense (embedding similarity)
				</p>
			</div>

			<Separator className="opacity-50" />

			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<Label htmlFor="topK" className="text-xs text-muted-foreground">
						Top K
						<span className="ml-1 text-[10px] opacity-60">
							(retrieval depth)
						</span>
					</Label>
					<Badge
						variant="outline"
						className="font-mono text-[10px] tabular-nums"
					>
						{topK}
					</Badge>
				</div>
				<Input
					id="topK"
					type="number"
					min={1}
					max={100}
					value={topK}
					onChange={(e) => {
						const v = Number.parseInt(e.target.value, 10)
						if (!Number.isNaN(v) && v >= 1 && v <= 100) setTopK(v)
					}}
					className="h-8 font-mono text-xs tabular-nums"
				/>
				<p className="text-[10px] leading-snug text-muted-foreground/60">
					Chunks retrieved before reranking (1-100)
				</p>
			</div>

			<Separator className="opacity-50" />

			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<Label htmlFor="rerankTopN" className="text-xs text-muted-foreground">
						Rerank Top N
						<span className="ml-1 text-[10px] opacity-60">(final results)</span>
					</Label>
					<Badge
						variant="outline"
						className="font-mono text-[10px] tabular-nums"
					>
						{rerankTopN}
					</Badge>
				</div>
				<Input
					id="rerankTopN"
					type="number"
					min={1}
					max={50}
					value={rerankTopN}
					onChange={(e) => {
						const v = Number.parseInt(e.target.value, 10)
						if (!Number.isNaN(v) && v >= 1 && v <= 50) setRerankTopN(v)
					}}
					className="h-8 font-mono text-xs tabular-nums"
				/>
				<p className="text-[10px] leading-snug text-muted-foreground/60">
					Results after cross-encoder reranking (1-50)
				</p>
			</div>

			<Separator className="opacity-50" />

			<div className="space-y-2">
				<p className="text-[10px] leading-snug text-muted-foreground/60">
					Score legend
				</p>
				<div className="flex flex-wrap gap-1.5">
					<Badge
						variant="outline"
						className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]"
					>
						0.80+
					</Badge>
					<Badge
						variant="outline"
						className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]"
					>
						0.50-0.79
					</Badge>
					<Badge
						variant="outline"
						className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]"
					>
						&lt;0.50
					</Badge>
				</div>
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Per-message component (builds source map per assistant message)
// ---------------------------------------------------------------------------

function AssistantMessage({ message }: { message: UIMessage }) {
	const { documents } = useDocuments()

	const sources = useMemo(() => {
		if (message.role === 'user') return new Map()
		const raw = buildSourceMap(message)
		return enrichSourceMap(raw, documents)
	}, [message, documents])

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
			</MessageContent>
		</Message>
	)
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function RagPlaygroundInner() {
	const [alpha, setAlpha] = useState(0.5)
	const [topK, setTopK] = useState(20)
	const [rerankTopN, setRerankTopN] = useState(5)
	const [modelId, setModelId] = useState(DEFAULT_MODEL_ID)
	const [panelOpen, setPanelOpen] = useState(true)

	const {
		instructions,
		setInstructions,
		activeIds,
		setActiveIds,
		getActiveInstructionText,
	} = useInstructionsState()

	const instructionsRef = useRef(getActiveInstructionText)
	useEffect(() => {
		instructionsRef.current = getActiveInstructionText
	}, [getActiveInstructionText])

	const paramsRef = useRef({ modelId, alpha, topK, rerankTopN })
	useEffect(() => {
		paramsRef.current = { modelId, alpha, topK, rerankTopN }
	}, [modelId, alpha, topK, rerankTopN])

	/* eslint-disable react-hooks/refs -- body callback is lazy, called at request time not render time */
	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: '/api/rag-playground',
				body: () => {
					const text = instructionsRef.current()
					return {
						model: paramsRef.current.modelId,
						alpha: paramsRef.current.alpha,
						topK: paramsRef.current.topK,
						rerankTopN: paramsRef.current.rerankTopN,
						...(text ? { instructions: text } : {}),
					}
				},
			}),
		[],
	)
	/* eslint-enable react-hooks/refs */

	const { messages, sendMessage, status, stop } = useChat({ transport })

	const {
		suggestions: followUpSuggestions,
		isLoading: followUpLoading,
		clear: clearFollowUps,
	} = useFollowUpSuggestions(messages, status)

	const isEmpty = messages.length === 0
	const [hasSubmitted, setHasSubmitted] = useState(false)
	const composerLayoutId = 'rag-playground-composer'
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

	const renderPromptComposer = () => (
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
							<PromptInputTextarea placeholder="Search your documents..." />
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

								<InstructionsTrigger />
							</PromptInputTools>
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
	)

	return (
		<TooltipProvider>
			<div className="flex min-h-dvh flex-col bg-background text-foreground">
				<div className="flex min-h-0 flex-1">
					{/* Chat column */}
					<div className="flex min-w-0 flex-1 flex-col">
						<div className="flex items-center justify-between px-4 pt-4 pb-2">
							<div className="flex items-center gap-3">
								<div className="flex items-center gap-2">
									<div className="flex size-7 items-center justify-center rounded-md bg-linear-to-br from-emerald-500/20 to-cyan-500/20 ring-1 ring-emerald-500/25">
										<SearchIcon className="size-3.5 text-emerald-400" />
									</div>
									<span className="text-sm font-medium tracking-tight">
										RAG Playground
									</span>
								</div>
								<Badge
									variant="outline"
									className="hidden text-[10px] sm:inline-flex"
								>
									semantic search debug
								</Badge>
							</div>

							<div className="flex items-center gap-2">
								<Select value={modelId} onValueChange={setModelId}>
									<SelectTrigger className="h-8 w-[160px] text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{MODELS.map((m) => (
											<SelectItem key={m.id} value={m.id} className="text-xs">
												<span className="flex items-center gap-2">
													{m.label}
													{m.supportsReasoning && (
														<Badge
															variant="outline"
															className={modelCapabilityBadgeClass}
														>
															reasoning
														</Badge>
													)}
												</span>
											</SelectItem>
										))}
									</SelectContent>
								</Select>

								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="size-8"
											aria-label="Toggle settings panel"
											aria-expanded={panelOpen}
											aria-controls="settings-panel"
											onClick={() => setPanelOpen(!panelOpen)}
										>
											{panelOpen ? (
												<PanelCloseIcon className="size-4" />
											) : (
												<PanelOpenIcon className="size-4" />
											)}
										</Button>
									</TooltipTrigger>
									<TooltipContent side="bottom">
										{panelOpen ? 'Hide settings' : 'Show settings'}
									</TooltipContent>
								</Tooltip>
							</div>
						</div>

						<LayoutGroup id="rag-playground-composer-layout">
							<Conversation>
								<ConversationContent className="mx-auto w-full max-w-3xl">
									{isEmpty ? (
										<ConversationEmptyState className="justify-start gap-0 p-0 pt-8 sm:pt-12">
											<EmptyChatHero
												accentIcon={
													<div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500/10 via-cyan-500/10 to-blue-500/10 ring-1 ring-white/6">
														<SearchIcon className="size-5 text-emerald-400/80" />
													</div>
												}
												composer={renderPromptComposer()}
												composerLayoutId={composerLayoutId}
												description="Test semantic search quality in isolation. Adjust alpha, topK, and reranking parameters to tune retrieval."
												onSuggestion={handleSuggestion}
												showComposer={!hasSubmitted}
												showSuggestions={!hasSubmitted}
												suggestions={suggestions}
												title="RAG Playground"
											/>
										</ConversationEmptyState>
									) : (
										messages.map((message) => (
											<AssistantMessage key={message.id} message={message} />
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

					{/* Settings panel */}
					<div
						id="settings-panel"
						role="region"
						aria-label="Retrieval settings"
						aria-hidden={!panelOpen}
						inert={!panelOpen ? true : undefined}
						className={`sticky top-0 self-start h-dvh shrink-0 overflow-hidden border-l transition-all duration-300 ease-in-out ${
							panelOpen ? 'w-72' : 'w-0 border-l-0'
						}`}
					>
						<div className="h-dvh w-72 overflow-y-auto p-4">
							<SettingsPanel
								alpha={alpha}
								setAlpha={setAlpha}
								topK={topK}
								setTopK={setTopK}
								rerankTopN={rerankTopN}
								setRerankTopN={setRerankTopN}
							/>
						</div>
					</div>
				</div>
			</div>
		</TooltipProvider>
	)
}

export default function RagPlaygroundPage() {
	return (
		<DocumentsProvider>
			<DocumentViewerProvider>
				<RagPlaygroundInner />
				<DocumentViewer />
			</DocumentViewerProvider>
		</DocumentsProvider>
	)
}
