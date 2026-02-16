import { z } from 'zod'

export const TocEntrySchema = z.object({
	id: z.string(),
	heading: z.string(),
	level: z.number().int().min(1).max(6),
	lineStart: z.number().int().positive(),
	lineEnd: z.number().int().positive(),
	summary: z.string(),
	grepPattern: z.string(),
	isTransitoryOrAnnex: z.boolean(),
	containsFines: z.boolean(),
})

export type TocEntry = z.infer<typeof TocEntrySchema>

export const EntitySchema = z.object({
	dates: z.array(
		z.object({
			value: z.string(),
			context: z.string(),
			line: z.number().int(),
		}),
	),
	monetaryAmounts: z.array(
		z.object({
			value: z.string(),
			context: z.string(),
			line: z.number().int(),
		}),
	),
	definedTerms: z.array(
		z.object({
			term: z.string(),
			definedAtLine: z.number().int(),
			usageLines: z.array(z.number().int()),
			article: z.string().optional(),
			meaning: z.string().optional(),
		}),
	),
	legalReferences: z.array(
		z.object({
			type: z.enum(['ley', 'nom', 'dof', 'tesis']),
			reference: z.string(),
			line: z.number().int(),
		}),
	),
})

export type Entities = z.infer<typeof EntitySchema>

export const NavigationSchema = z.object({
	warnings: z.record(z.string(), z.string()),
	quickCommands: z.record(z.string(), z.string()),
	sectionsByTopic: z.record(
		z.string(),
		z.object({
			sections: z.array(z.string()),
			lineRange: z.tuple([z.number(), z.number()]),
		}),
	),
})

export type Navigation = z.infer<typeof NavigationSchema>

export const SidecarSchema = z.object({
	schemaVersion: z.literal('1.0.0'),
	generatedAt: z.string().datetime(),
	sourceFile: z.string(),
	sourceHash: z.string(),
	document: z.object({
		title: z.string(),
		type: z.enum(['contrato', 'ley', 'sentencia', 'nom', 'otro']),
		totalLines: z.number().int(),
		totalWords: z.number().int(),
		language: z.literal('es'),
		parties: z
			.array(
				z.object({
					name: z.string(),
					role: z.string(),
					definedAs: z.string(),
				}),
			)
			.optional(),
	}),
	tableOfContents: z.array(TocEntrySchema),
	entities: EntitySchema,
	navigation: NavigationSchema,
	legalPatterns: z.object({
		regexLibrary: z.record(z.string(), z.string()),
	}),
})

export type Sidecar = z.infer<typeof SidecarSchema>

export const LlmEnrichmentSchema = z.object({
	sections: z.array(
		z.object({
			id: z.string(),
			summary: z.string(),
		}),
	),
	parties: z.array(
		z.object({
			name: z.string(),
			role: z.string(),
			definedAs: z.string(),
		}),
	),
	termDefinitions: z.array(
		z.object({
			term: z.string(),
			meaning: z.string(),
		}),
	),
})

export type LlmEnrichment = z.infer<typeof LlmEnrichmentSchema>
