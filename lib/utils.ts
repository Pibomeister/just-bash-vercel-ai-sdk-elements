import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function sanitizeHref(href: string | undefined): string | undefined {
	if (!href) return undefined
	try {
		const url = new URL(href, 'https://placeholder.invalid')
		if (url.protocol === 'http:' || url.protocol === 'https:') {
			return href
		}
		return undefined
	} catch {
		return undefined
	}
}
