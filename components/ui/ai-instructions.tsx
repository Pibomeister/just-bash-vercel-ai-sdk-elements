'use client'

import { CheckSquare2Icon, PlusIcon, SlidersHorizontalIcon } from 'lucide-react'
import {
	type ComponentProps,
	createContext,
	type PropsWithChildren,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from 'react'
import { Button } from '@/components/ui/button'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from '@/components/ui/command'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Input } from '@/components/ui/input'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface Instruction {
	id: string
	title: string
	description: string
	content?: string
	isCustom?: boolean
}

export interface InstructionsContextValue {
	activeIds: string[]
	toggle: (id: string) => void
	isActive: (id: string) => boolean
	instructions: Instruction[]
	addCustom: (instruction: Omit<Instruction, 'id' | 'isCustom'>) => void
	removeCustom: (id: string) => void
	open: boolean
	setOpen: (open: boolean) => void
	createDialogOpen: boolean
	setCreateDialogOpen: (open: boolean) => void
}

// ============================================================================
// Context
// ============================================================================

const InstructionsContext = createContext<InstructionsContextValue | null>(null)

export const useInstructions = () => {
	const ctx = useContext(InstructionsContext)
	if (!ctx) {
		throw new Error(
			'useInstructions must be used within an Instructions provider',
		)
	}
	return ctx
}

// ============================================================================
// Controllable State Hook
// ============================================================================

function useControllableState<T>(
	controlledValue: T | undefined,
	defaultValue: T,
	onChange?: (value: T) => void,
): [T, (value: T | ((prev: T) => T)) => void] {
	const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue)
	const isControlled = controlledValue !== undefined
	const value = isControlled ? controlledValue : uncontrolledValue

	const setValue = useCallback(
		(nextValue: T | ((prev: T) => T)) => {
			const resolvedValue =
				typeof nextValue === 'function'
					? (nextValue as (prev: T) => T)(value)
					: nextValue

			if (!isControlled) {
				setUncontrolledValue(resolvedValue)
			}
			onChange?.(resolvedValue)
		},
		[isControlled, onChange, value],
	)

	return [value, setValue]
}

// ============================================================================
// Root Component
// ============================================================================

export type InstructionsProps = PropsWithChildren<{
	value?: string[]
	onValueChange?: (value: string[]) => void
	defaultValue?: string[]
	instructions?: Instruction[]
	onInstructionsChange?: (instructions: Instruction[]) => void
	open?: boolean
	onOpenChange?: (open: boolean) => void
}>

export function Instructions({
	value,
	onValueChange,
	defaultValue = [],
	instructions: controlledInstructions,
	onInstructionsChange,
	open: controlledOpen,
	onOpenChange,
	children,
}: InstructionsProps) {
	const [activeIds, setActiveIds] = useControllableState(
		value,
		defaultValue,
		onValueChange,
	)

	const [internalInstructions, setInternalInstructions] = useState<
		Instruction[]
	>(controlledInstructions ?? [])

	const instructions = controlledInstructions ?? internalInstructions

	const [open, setOpen] = useControllableState(
		controlledOpen,
		false,
		onOpenChange,
	)
	const [createDialogOpen, setCreateDialogOpen] = useState(false)

	const toggle = useCallback(
		(id: string) => {
			setActiveIds((prev) =>
				prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
			)
		},
		[setActiveIds],
	)

	const isActive = useCallback(
		(id: string) => activeIds.includes(id),
		[activeIds],
	)

	const addCustom = useCallback(
		(instruction: Omit<Instruction, 'id' | 'isCustom'>) => {
			const newInstruction: Instruction = {
				...instruction,
				id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
				isCustom: true,
			}

			if (controlledInstructions) {
				onInstructionsChange?.([...controlledInstructions, newInstruction])
			} else {
				setInternalInstructions((prev) => [...prev, newInstruction])
			}
		},
		[controlledInstructions, onInstructionsChange],
	)

	const removeCustom = useCallback(
		(id: string) => {
			setActiveIds((prev) => prev.filter((i) => i !== id))

			if (controlledInstructions) {
				onInstructionsChange?.(
					controlledInstructions.filter((i) => i.id !== id),
				)
			} else {
				setInternalInstructions((prev) => prev.filter((i) => i.id !== id))
			}
		},
		[controlledInstructions, onInstructionsChange, setActiveIds],
	)

	const contextValue = useMemo<InstructionsContextValue>(
		() => ({
			activeIds,
			toggle,
			isActive,
			instructions,
			addCustom,
			removeCustom,
			open,
			setOpen,
			createDialogOpen,
			setCreateDialogOpen,
		}),
		[
			activeIds,
			toggle,
			isActive,
			instructions,
			addCustom,
			removeCustom,
			open,
			setOpen,
			createDialogOpen,
		],
	)

	return (
		<InstructionsContext.Provider value={contextValue}>
			<Popover onOpenChange={setOpen} open={open}>
				{children}
			</Popover>
		</InstructionsContext.Provider>
	)
}

// ============================================================================
// Trigger Component
// ============================================================================

export type InstructionsTriggerProps = ComponentProps<typeof Button> & {
	label?: ReactNode
}

export function InstructionsTrigger({
	className,
	label,
	children,
	...props
}: InstructionsTriggerProps) {
	const { activeIds } = useInstructions()
	const activeCount = activeIds.length

	return (
		<PopoverTrigger asChild>
			<Button
				className={cn(
					'gap-1.5',
					activeCount > 0 && 'text-foreground',
					className,
				)}
				size="sm"
				type="button"
				variant="ghost"
				{...props}
			>
				{children ?? (
					<>
						<SlidersHorizontalIcon className="size-3.5" />
						{label ?? 'Instructions'}
						{activeCount > 0 && (
							<span
								className="inline-flex size-4 items-center justify-center rounded-full bg-primary text-[0.625rem] text-primary-foreground"
								data-slot="instructions-count"
							>
								{activeCount}
							</span>
						)}
					</>
				)}
			</Button>
		</PopoverTrigger>
	)
}

// ============================================================================
// Content Component
// ============================================================================

export type InstructionsContentProps = ComponentProps<typeof PopoverContent>

export function InstructionsContent({
	className,
	children,
	...props
}: InstructionsContentProps) {
	return (
		<PopoverContent
			align="start"
			className={cn('w-80 p-0', className)}
			side="top"
			sideOffset={8}
			{...props}
		>
			<Command className="rounded-lg" data-slot="instructions-content">
				{children}
			</Command>
		</PopoverContent>
	)
}

// ============================================================================
// Search Component
// ============================================================================

export type InstructionsSearchProps = ComponentProps<typeof CommandInput>

export function InstructionsSearch({
	placeholder = 'Search instructions...',
	className,
	...props
}: InstructionsSearchProps) {
	return (
		<CommandInput
			className={cn(className)}
			data-slot="instructions-search"
			placeholder={placeholder}
			{...props}
		/>
	)
}

// ============================================================================
// List Component
// ============================================================================

export type InstructionsListProps = ComponentProps<typeof CommandList>

export function InstructionsList({
	className,
	children,
	...props
}: InstructionsListProps) {
	return (
		<CommandList
			className={cn('max-h-64', className)}
			data-slot="instructions-list"
			{...props}
		>
			{children}
		</CommandList>
	)
}

// ============================================================================
// Empty Component
// ============================================================================

export type InstructionsEmptyProps = ComponentProps<typeof CommandEmpty>

export function InstructionsEmpty({
	children = 'No instructions found.',
	className,
	...props
}: InstructionsEmptyProps) {
	return (
		<CommandEmpty
			className={cn(className)}
			data-slot="instructions-empty"
			{...props}
		>
			{children}
		</CommandEmpty>
	)
}

// ============================================================================
// Group Component
// ============================================================================

export type InstructionsGroupProps = ComponentProps<typeof CommandGroup>

export function InstructionsGroup({
	className,
	...props
}: InstructionsGroupProps) {
	return (
		<CommandGroup
			className={cn(className)}
			data-slot="instructions-group"
			{...props}
		/>
	)
}

// ============================================================================
// Separator Component
// ============================================================================

export type InstructionsSeparatorProps = ComponentProps<typeof CommandSeparator>

export function InstructionsSeparator({
	className,
	...props
}: InstructionsSeparatorProps) {
	return (
		<CommandSeparator
			className={cn(className)}
			data-slot="instructions-separator"
			{...props}
		/>
	)
}

// ============================================================================
// Item Component
// ============================================================================

export type InstructionsItemProps = Omit<
	ComponentProps<typeof CommandItem>,
	'value' | 'onSelect'
> & {
	instruction: Instruction
	disablePreview?: boolean
}

export function InstructionsItem({
	instruction,
	disablePreview = false,
	className,
	children,
	...props
}: InstructionsItemProps) {
	const { toggle, isActive } = useInstructions()
	const active = isActive(instruction.id)

	const handleSelect = () => {
		toggle(instruction.id)
	}

	const itemContent = (
		<CommandItem
			className={cn(
				'group/instruction-item flex cursor-pointer items-start gap-3 py-2',
				active && 'bg-accent',
				className,
			)}
			data-checked={active}
			data-slot="instructions-item"
			data-state={active ? 'active' : 'inactive'}
			onSelect={handleSelect}
			value={instruction.title}
			{...props}
		>
			<div
				className={cn(
					'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border',
					active
						? 'border-primary bg-primary text-primary-foreground'
						: 'border-muted-foreground/30',
				)}
				data-slot="instructions-item-checkbox"
			>
				{active && <CheckSquare2Icon className="size-3" />}
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				{children ?? (
					<>
						<InstructionsItemTitle>{instruction.title}</InstructionsItemTitle>
						<InstructionsItemDescription>
							{instruction.description}
						</InstructionsItemDescription>
					</>
				)}
			</div>
		</CommandItem>
	)

	if (disablePreview || !instruction.content) {
		return itemContent
	}

	return (
		<InstructionsHoverCard instruction={instruction}>
			{itemContent}
		</InstructionsHoverCard>
	)
}

// ============================================================================
// Item Title Component
// ============================================================================

export type InstructionsItemTitleProps = ComponentProps<'span'>

export function InstructionsItemTitle({
	className,
	...props
}: InstructionsItemTitleProps) {
	return (
		<span
			className={cn('font-medium text-foreground text-xs', className)}
			data-slot="instructions-item-title"
			{...props}
		/>
	)
}

// ============================================================================
// Item Description Component
// ============================================================================

export type InstructionsItemDescriptionProps = ComponentProps<'span'>

export function InstructionsItemDescription({
	className,
	...props
}: InstructionsItemDescriptionProps) {
	return (
		<span
			className={cn('line-clamp-2 text-muted-foreground text-xs', className)}
			data-slot="instructions-item-description"
			{...props}
		/>
	)
}

// ============================================================================
// Hover Card Component
// ============================================================================

export interface InstructionsHoverCardProps {
	instruction: Instruction
	children: ReactNode
}

export function InstructionsHoverCard({
	instruction,
	children,
}: InstructionsHoverCardProps) {
	return (
		<HoverCard openDelay={300} closeDelay={100}>
			<HoverCardTrigger>{children}</HoverCardTrigger>
			<HoverCardContent
				align="start"
				className="w-72"
				data-slot="instructions-hover-card"
				side="right"
				sideOffset={8}
			>
				<div className="flex flex-col gap-2">
					<div className="flex flex-col gap-1">
						<span className="font-medium text-sm">{instruction.title}</span>
						<span className="text-muted-foreground text-xs">
							{instruction.description}
						</span>
					</div>
					{instruction.content && (
						<div className="rounded-md bg-muted/50 p-2">
							<p className="whitespace-pre-wrap text-muted-foreground text-xs">
								{instruction.content}
							</p>
						</div>
					)}
					{instruction.isCustom && (
						<span className="text-[0.625rem] text-muted-foreground">
							Custom instruction
						</span>
					)}
				</div>
			</HoverCardContent>
		</HoverCard>
	)
}

// ============================================================================
// Footer Component
// ============================================================================

export type InstructionsFooterProps = ComponentProps<'div'>

export function InstructionsFooter({
	className,
	children,
	...props
}: InstructionsFooterProps) {
	return (
		<div
			className={cn('border-t p-1', className)}
			data-slot="instructions-footer"
			{...props}
		>
			{children}
		</div>
	)
}

// ============================================================================
// Create Trigger Component
// ============================================================================

export type InstructionsCreateTriggerProps = Omit<
	ComponentProps<typeof CommandItem>,
	'onSelect'
> & {
	label?: ReactNode
}

export function InstructionsCreateTrigger({
	label = 'New Instruction',
	className,
	children,
	...props
}: InstructionsCreateTriggerProps) {
	const { setCreateDialogOpen, setOpen } = useInstructions()

	const handleSelect = () => {
		setOpen(false)
		setCreateDialogOpen(true)
	}

	return (
		<CommandItem
			className={cn(
				'flex cursor-pointer items-center gap-2 text-muted-foreground',
				className,
			)}
			data-slot="instructions-create-trigger"
			onSelect={handleSelect}
			value="__new_instruction__"
			{...props}
		>
			{children ?? (
				<>
					<PlusIcon className="size-3.5" />
					{label}
				</>
			)}
		</CommandItem>
	)
}

// ============================================================================
// Create Dialog Component
// ============================================================================

export type InstructionsCreateDialogProps = Omit<
	ComponentProps<typeof Dialog>,
	'open' | 'onOpenChange' | 'children'
> & {
	title?: ReactNode
	description?: ReactNode
	children?: ReactNode
}

export function InstructionsCreateDialog({
	title = 'Create Instruction',
	description = "Create a custom instruction to guide the AI's behavior.",
	children,
	...props
}: InstructionsCreateDialogProps) {
	const { createDialogOpen, setCreateDialogOpen, addCustom } = useInstructions()
	const [formTitle, setFormTitle] = useState('')
	const [formDescription, setFormDescription] = useState('')
	const [formContent, setFormContent] = useState('')

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		if (!(formTitle.trim() && formDescription.trim())) {
			return
		}

		addCustom({
			title: formTitle.trim(),
			description: formDescription.trim(),
			content: formContent.trim() || undefined,
		})

		setFormTitle('')
		setFormDescription('')
		setFormContent('')
		setCreateDialogOpen(false)
	}

	const handleOpenChange = (open: boolean) => {
		setCreateDialogOpen(open)
		if (!open) {
			setFormTitle('')
			setFormDescription('')
			setFormContent('')
		}
	}

	return (
		<Dialog
			data-slot="instructions-create-dialog"
			onOpenChange={handleOpenChange}
			open={createDialogOpen}
			{...props}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				{children ?? (
					<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
						<div className="flex flex-col gap-2">
							<label
								className="font-medium text-xs"
								htmlFor="instruction-title"
							>
								Title
							</label>
							<Input
								id="instruction-title"
								onChange={(e) => setFormTitle(e.target.value)}
								placeholder="e.g., Be Concise"
								required
								value={formTitle}
							/>
						</div>
						<div className="flex flex-col gap-2">
							<label
								className="font-medium text-xs"
								htmlFor="instruction-description"
							>
								Description
							</label>
							<Input
								id="instruction-description"
								onChange={(e) => setFormDescription(e.target.value)}
								placeholder="e.g., Keep responses short and to the point"
								required
								value={formDescription}
							/>
						</div>
						<div className="flex flex-col gap-2">
							<label
								className="font-medium text-xs"
								htmlFor="instruction-content"
							>
								Full Instruction (optional)
							</label>
							<Textarea
								className="min-h-24 resize-none"
								id="instruction-content"
								onChange={(e) => setFormContent(e.target.value)}
								placeholder="Detailed instruction text that will be shown in the preview..."
								value={formContent}
							/>
						</div>
						<DialogFooter>
							<DialogClose asChild>
								<Button type="button" variant="outline">
									Cancel
								</Button>
							</DialogClose>
							<Button type="submit">Create</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	)
}
