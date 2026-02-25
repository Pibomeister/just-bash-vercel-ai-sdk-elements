// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Sidebar } from '@/components/ui/modern-side-bar'

let resolvedTheme: 'light' | 'dark' = 'dark'
const setThemeMock = vi.fn()
const openUploadDialogMock = vi.fn()

vi.mock('next/navigation', () => ({
	usePathname: () => '/',
}))

vi.mock('next/link', () => ({
	default: ({
		children,
		href,
		...props
	}: AnchorHTMLAttributes<HTMLAnchorElement> & {
		children?: ReactNode
	}) => (
		<a href={typeof href === 'string' ? href : '#'} {...props}>
			{children}
		</a>
	),
}))

vi.mock('next-themes', () => ({
	useTheme: () => ({
		resolvedTheme,
		setTheme: setThemeMock,
	}),
}))

vi.mock('@/hooks/use-upload-dialog-trigger', () => ({
	useUploadDialogTrigger: () => ({
		openUploadDialog: openUploadDialogMock,
		hasOpenHandler: true,
	}),
}))

describe('Sidebar theme/logout controls', () => {
	beforeEach(() => {
		resolvedTheme = 'dark'
		setThemeMock.mockReset()
		openUploadDialogMock.mockReset()
		Object.defineProperty(window, 'innerWidth', {
			configurable: true,
			value: 1200,
			writable: true,
		})
	})

	it('renders logout and theme toggle in a bordered control row with toggle on the right', async () => {
		render(<Sidebar />)

		const logoutButton = await screen.findByRole('button', { name: /logout/i })
		const controlsRow = logoutButton.parentElement
		expect(controlsRow).not.toBeNull()
		expect(controlsRow?.className).toContain('border')

		const themeToggle = controlsRow?.querySelector(
			'div[role="button"][tabindex="0"]',
		)
		expect(themeToggle).not.toBeNull()

		const children = Array.from(controlsRow?.children ?? [])
		expect(children.indexOf(logoutButton)).toBeLessThan(
			children.indexOf(themeToggle as Element),
		)

		fireEvent.click(themeToggle as Element)
		expect(setThemeMock).toHaveBeenCalledWith('light')
	})
})
