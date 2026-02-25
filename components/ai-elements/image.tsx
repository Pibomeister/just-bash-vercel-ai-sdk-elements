import type { Experimental_GeneratedImage } from 'ai'

import { cn } from '@/lib/utils'

export type ImageProps = Experimental_GeneratedImage & {
	className?: string
	alt?: string
}

export const Image = ({
	base64,
	uint8Array: _uint8Array, // eslint-disable-line @typescript-eslint/no-unused-vars -- destructured to exclude from props spread
	mediaType,
	...props
}: ImageProps) => (
	/* eslint-disable-next-line @next/next/no-img-element -- renders AI-generated base64 image data */
	<img
		{...props}
		alt={props.alt}
		className={cn(
			'h-auto max-w-full overflow-hidden rounded-md',
			props.className,
		)}
		src={`data:${mediaType};base64,${base64}`}
	/>
)
