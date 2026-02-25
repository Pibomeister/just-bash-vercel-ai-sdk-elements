// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeToggle } from '@/components/ui/theme-toggle'

let resolvedTheme: 'light' | 'dark' | undefined = 'dark'
const setThemeMock = vi.fn()

vi.mock('next-themes', () => ({
	useTheme: () => ({
		resolvedTheme,
		setTheme: setThemeMock,
	}),
}))

describe('ThemeToggle', () => {
	beforeEach(() => {
		resolvedTheme = 'dark'
		setThemeMock.mockReset()
	})

	it('switches from dark to light when clicked', () => {
		render(<ThemeToggle />)

		const toggle = screen.getByRole('button')
		fireEvent.click(toggle)

		expect(setThemeMock).toHaveBeenCalledWith('light')
	})

	it('switches from light to dark when clicked', () => {
		resolvedTheme = 'light'
		render(<ThemeToggle />)

		const toggle = screen.getByRole('button')
		fireEvent.click(toggle)

		expect(setThemeMock).toHaveBeenCalledWith('dark')
	})

	it('defaults to dark appearance when theme is unresolved', () => {
		resolvedTheme = undefined
		render(<ThemeToggle />)

		const toggle = screen.getByRole('button')
		expect(toggle.className).toContain('bg-zinc-950')
		expect(toggle.className).toContain('border-zinc-800')
	})

	it('toggles with keyboard Enter', () => {
		render(<ThemeToggle />)

		const toggle = screen.getByRole('button')
		fireEvent.keyDown(toggle, { key: 'Enter' })

		expect(setThemeMock).toHaveBeenCalledWith('light')
	})

	it('updates visual state immediately on click before resolvedTheme changes', () => {
		resolvedTheme = 'dark'
		render(<ThemeToggle />)

		const toggle = screen.getByRole('button')
		expect(toggle.className).toContain('bg-zinc-950')

		fireEvent.click(toggle)
		expect(toggle.className).toContain('bg-white')
	})
})
