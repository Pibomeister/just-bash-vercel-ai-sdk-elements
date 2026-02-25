'use client'

import {
	Globe2 as GlobeIcon,
	Lightbulb as LightbulbIcon,
	Paintbrush as PaintbrushIcon,
	Paperclip as PaperclipIcon,
	Pencil as PencilIcon,
	Telescope as TelescopeIcon,
} from 'lucide-react'
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
import { TooltipProvider } from '@/components/ui/tooltip'

function DynamicToolPill() {
	const { activeTool } = usePromptInputController()

	if (activeTool.value === 'create-image') {
		return (
			<PromptBoxToolToggle
				tool="create-image"
				icon={PaintbrushIcon}
				label="Create image"
				activeColor="purple"
			/>
		)
	}

	if (activeTool.value === 'deep-research') {
		return (
			<PromptBoxToolToggle
				tool="deep-research"
				icon={TelescopeIcon}
				label="Deep research"
				activeColor="cyan"
			/>
		)
	}

	return null
}

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

export default function PromptBoxDemo() {
	return (
		<div className="flex min-h-dvh flex-col items-center justify-center bg-background p-8">
			<div className="w-full max-w-2xl">
				<TooltipProvider>
					<PromptInputProvider>
						<PromptBoxContextProvider>
							<PromptInput
								onSubmit={(message) => {
									console.log('Submitted:', message)
								}}
							>
								<PromptInputHeader>
									<AttachmentTrayView />
								</PromptInputHeader>

								<PromptBoxVoiceRecorder />
								<PromptBoxPasteHandler>
									<PromptInputTextarea />
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
										<PromptBoxNeonDivider color="purple" />
										<PromptBoxToolToggle
											tool="write"
											icon={PencilIcon}
											label="Write"
											activeColor="purple"
										/>
										<PromptBoxNeonDivider color="amber" />
										<PromptBoxToolToggle
											tool="think"
											icon={LightbulbIcon}
											label="Think"
											activeColor="amber"
										/>

										<DynamicToolPill />
									</PromptInputTools>
									<PromptBoxSendButton />
								</PromptInputFooter>
							</PromptInput>

							<PromptBoxImageDialog />
						</PromptBoxContextProvider>
					</PromptInputProvider>
				</TooltipProvider>
			</div>
		</div>
	)
}
