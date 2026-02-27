'use client'

import {
	Bot,
	ChevronLeft,
	ChevronRight,
	Home,
	LogOut,
	Menu,
	Search,
	Sparkles,
	Telescope,
	Upload,
	X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useUploadDialogTrigger } from '@/hooks/use-upload-dialog-trigger'

interface NavigationItem {
	id: string
	name: string
	icon: React.ComponentType<{ className?: string }>
	href: string
}

interface SidebarProps {
	className?: string
}

const navigationItems: NavigationItem[] = [
	{ id: 'chat', name: 'Main Chat', icon: Home, href: '/' },
	{
		id: 'rag-playground',
		name: 'RAG Playground',
		icon: Telescope,
		href: '/rag-playground',
	},
	{
		id: 'prompt-box-demo',
		name: 'Prompt Demo',
		icon: Sparkles,
		href: '/prompt-box-demo',
	},
]

export function Sidebar({ className = '' }: SidebarProps) {
	const pathname = usePathname()
	const [isOpen, setIsOpen] = useState(false)
	const [isCollapsed, setIsCollapsed] = useState(false)
	const { openUploadDialog, hasOpenHandler } = useUploadDialogTrigger()

	useEffect(() => {
		const handleResize = () => {
			setIsOpen(window.innerWidth >= 768)
		}

		handleResize()
		window.addEventListener('resize', handleResize)
		return () => window.removeEventListener('resize', handleResize)
	}, [])

	const toggleSidebar = () => setIsOpen((prev) => !prev)
	const toggleCollapse = () => setIsCollapsed((prev) => !prev)

	const handleMobileNavigate = () => {
		if (window.innerWidth < 768) {
			setIsOpen(false)
		}
	}

	return (
		<>
			<button
				onClick={toggleSidebar}
				className="fixed top-6 left-6 z-50 rounded-lg border border-border bg-background p-3 shadow-md transition-all duration-200 hover:bg-accent md:hidden"
				aria-label="Toggle sidebar"
			>
				{isOpen ? (
					<X className="h-5 w-5 text-muted-foreground" />
				) : (
					<Menu className="h-5 w-5 text-muted-foreground" />
				)}
			</button>

			{isOpen && (
				<div
					className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden"
					onClick={toggleSidebar}
				/>
			)}

			<aside
				className={`
          fixed top-0 left-0 z-40 flex h-dvh min-h-dvh shrink-0 flex-col border-r border-border bg-background text-foreground transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isCollapsed ? 'w-24' : 'w-72'}
          md:sticky md:top-0 md:z-auto md:translate-x-0
          ${className}
        `}
			>
				<div className="flex items-center justify-between border-b border-border bg-muted/30 p-5">
					{!isCollapsed ? (
						<div className="flex items-center space-x-2.5">
							<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 shadow-sm">
								<Bot className="h-5 w-5 text-white" />
							</div>
							<div className="flex flex-col">
								<span className="text-base font-semibold text-foreground">
									AI Bash Agent
								</span>
								<span className="text-xs text-muted-foreground">
									Workspace Tools
								</span>
							</div>
						</div>
					) : (
						<div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 shadow-sm">
							<Bot className="h-5 w-5 text-white" />
						</div>
					)}

					<button
						onClick={toggleCollapse}
						className="hidden rounded-md p-1.5 transition-all duration-200 hover:bg-accent md:flex"
						aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
					>
						{isCollapsed ? (
							<ChevronRight className="h-4 w-4 text-muted-foreground" />
						) : (
							<ChevronLeft className="h-4 w-4 text-muted-foreground" />
						)}
					</button>
				</div>

				{!isCollapsed && (
					<div className="px-4 py-3">
						<div className="relative">
							<Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
							<input
								type="text"
								placeholder="Search routes..."
								className="w-full rounded-md border border-border bg-muted/20 py-2 pr-4 pl-9 text-sm placeholder:text-muted-foreground transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
							/>
						</div>
					</div>
				)}

				<nav className="flex-1 overflow-y-auto px-3 py-2">
					<ul className="space-y-0.5">
						{navigationItems.map((item) => {
							const Icon = item.icon
							const isActive = pathname === item.href

							return (
								<li key={item.id}>
									<Link
										href={item.href}
										onClick={handleMobileNavigate}
										className={`
                      group relative flex w-full items-center rounded-md px-3 py-2.5 text-left transition-all duration-200
                      ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}
                      ${isCollapsed ? 'justify-center px-2' : 'space-x-2.5'}
                    `}
										title={isCollapsed ? item.name : undefined}
									>
										<div className="flex min-w-[24px] items-center justify-center">
											<Icon
												className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-accent-foreground'}`}
											/>
										</div>

										{!isCollapsed && (
											<span
												className={`text-sm ${isActive ? 'font-medium' : 'font-normal'}`}
											>
												{item.name}
											</span>
										)}

										{isCollapsed && (
											<div className="invisible absolute top-1/2 left-full z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-md transition-all duration-200 group-hover:visible group-hover:opacity-100">
												{item.name}
											</div>
										)}
									</Link>
								</li>
							)
						})}
					</ul>
				</nav>

				<div className="mt-auto space-y-2 border-t border-border p-3">
					<Button
						type="button"
						variant="outline"
						size={isCollapsed ? 'icon' : 'sm'}
						onClick={openUploadDialog}
						disabled={!hasOpenHandler}
						className={`w-full ${isCollapsed ? 'mx-auto' : 'justify-center gap-2 h-10'}`}
						title={isCollapsed ? 'Upload Document' : undefined}
					>
						<Upload className="h-4 w-4" />
						{!isCollapsed && <span>Upload Document</span>}
					</Button>

					<div
						className={`rounded-md border border-border/80 bg-muted/20 p-2 ${isCollapsed ? 'flex flex-col items-center gap-2' : 'flex items-center gap-2'}`}
					>
						<button
							className={`group flex items-center rounded-md text-red-500 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 ${isCollapsed ? 'w-full justify-center p-2.5' : 'min-w-0 flex-1 justify-center gap-2.5 px-3 py-2.5'}`}
							title={isCollapsed ? 'Logout' : undefined}
							type="button"
						>
							<div className="flex min-w-[24px] items-center justify-center">
								<LogOut className="h-4 w-4 shrink-0 text-red-500 group-hover:text-red-400" />
							</div>
							{!isCollapsed && <span className="text-sm">Logout</span>}
						</button>

						<ThemeToggle className="shrink-0" />
					</div>
				</div>
			</aside>
		</>
	)
}
