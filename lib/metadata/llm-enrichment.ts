import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { type LlmEnrichment, LlmEnrichmentSchema, type TocEntry } from './types'

export async function enrichWithLlm(
	tocEntries: TocEntry[],
	markdownPreview: string,
	warnings?: Record<string, string>,
): Promise<LlmEnrichment | null> {
	if (tocEntries.length === 0) return null

	try {
		const prompt = buildEnrichmentPrompt(tocEntries, markdownPreview, warnings)
		const { object } = await generateObject({
			model: openai('gpt-4o-mini'),
			schema: LlmEnrichmentSchema,
			prompt,
		})
		return object
	} catch (error) {
		console.warn('[llm-enrichment] generateObject failed:', error)
		return null
	}
}

function buildEnrichmentPrompt(
	tocEntries: TocEntry[],
	markdownPreview: string,
	warnings?: Record<string, string>,
): string {
	const sectionList = tocEntries
		.map((entry) => `- ${entry.id}: "${entry.heading}"`)
		.join('\n')

	const truncatedPreview = markdownPreview.slice(0, 3000)

	let ocrNote = ''
	if (warnings?.ocr_ordinals) {
		ocrNote = `\n\nNota sobre OCR: Este documento fue procesado mediante OCR y puede contener errores de reconocimiento, especialmente en ordinales y numeraciones. Toma esto en cuenta al analizar el texto.\n`
	}

	return `Eres un asistente legal especializado en documentos juridicos mexicanos.

Analiza el siguiente documento y proporciona:

1. **Resumenes de secciones**: Para cada seccion listada, escribe un resumen conciso de su contenido.
2. **Partes involucradas**: Identifica las partes mencionadas en el documento, su rol y como se les define.
3. **Definiciones de terminos**: Extrae los terminos definidos en el documento y su significado.

Secciones a resumir:
${sectionList}
${ocrNote}
Vista previa del documento:
<documento>
${truncatedPreview}
</documento>

Responde en espanol. Se preciso y conciso en los resumenes.`
}
